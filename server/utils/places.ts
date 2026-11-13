import type { DiscoveredBusiness } from '#shared/types/business'
import type { ServerLocale } from './locale'
import { appError } from './locale'
import type { PlaceResult } from './place-mapping'
import { isProspect, toDiscoveredBusiness } from './place-mapping'
import { upstreamError, withRetry } from './upstream'

export interface GeocodeResult {
  lat: number
  lng: number
}

interface GeocodeResponse {
  status: string
  results: Array<{ geometry: { location: { lat: number; lng: number } } }>
}

export async function geocodeAddress(address: string, apiKey: string, locale: ServerLocale): Promise<GeocodeResult> {
  let res: GeocodeResponse
  try {
    res = await withRetry(() => $fetch<GeocodeResponse>('https://maps.googleapis.com/maps/api/geocode/json', {
      query: { address, key: apiKey, language: locale },
      timeout: 15_000,
    }))
  } catch (error) {
    throw upstreamError('Google Geocoding', error, locale)
  }

  // The Geocoding API reports most failures as HTTP 200 with a status field.
  const first = res.results[0]
  if (res.status === 'OK' && first) return first.geometry.location
  if (res.status === 'ZERO_RESULTS' || (res.status === 'OK' && !first)) throw appError(404, locale, 'addressNotFound', { address })
  if (res.status === 'REQUEST_DENIED') throw appError(502, locale, 'geocodeDenied')
  throw appError(502, locale, 'geocodeFailed', { status: res.status })
}

// Non-commercial place types we never want cluttering discovery results
// (transit stops, worship places, government/civic buildings, parks, schools).
// See https://developers.google.com/maps/documentation/places/web-service/place-types
// Note: not every plausible-looking type string is actually valid as an
// excludedTypes value — Google rejects unknown ones with a 400 for the
// whole request (confirmed: 'toll_booth' and 'point_of_interest' are NOT
// accepted here, even though they're valid primaryType values on a place).
const DEFAULT_EXCLUDED_TYPES = [
  'bus_station', 'train_station', 'subway_station', 'light_rail_station',
  'transit_station', 'airport', 'taxi_stand', 'ferry_terminal', 'heliport',
  'park', 'stadium',
  'mosque', 'church', 'hindu_temple', 'synagogue', 'cemetery',
  'parking', 'rest_stop',
  'city_hall', 'government_office', 'local_government_office', 'courthouse', 'embassy',
  'fire_station', 'police', 'post_office',
  'school', 'primary_school', 'secondary_school', 'university',
  'gas_station', 'atm', 'butcher_shop',
]

// Every field below is in the Pro, Enterprise or Enterprise + Atmosphere
// tier. `places.reviews` already puts each call in the Enterprise +
// Atmosphere SKU (the highest field decides the price), so the extra fields
// cost nothing more per search. Photos are deliberately not requested:
// fetching an image is a separately billed SKU and photo names may not be
// cached. https://developers.google.com/maps/documentation/places/web-service/nearby-search
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.formattedAddress',
  'places.addressComponents',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.businessStatus',
  'places.pureServiceAreaBusiness',
  'places.location',
  'places.utcOffsetMinutes',
  'places.regularOpeningHours',
  'places.editorialSummary',
  'places.reviewSummary',
  'places.reviews',
  'places.reservable',
  'places.delivery',
  'places.takeout',
  'places.dineIn',
  'places.servesBreakfast',
  'places.servesLunch',
  'places.servesDinner',
  'places.servesCoffee',
  'places.servesBeer',
  'places.servesWine',
  'places.outdoorSeating',
  'places.goodForGroups',
  'places.paymentOptions',
].join(',')

export async function nearbySearch(
  center: GeocodeResult,
  radiusMeters: number,
  category: string | undefined,
  apiKey: string,
  locale: ServerLocale,
): Promise<DiscoveredBusiness[]> {
  const body: Record<string, unknown> = {
    maxResultCount: 20,
    // Google's default is POPULARITY (prominence), which can skip places right
    // next to the search point in favor of "bigger" places further away.
    // DISTANCE ranks by proximity to the center instead.
    rankPreference: 'DISTANCE',
    // Language of names, type labels and opening-hour lines. Does NOT stop
    // Google from auto-translating review text — that's handled by reading
    // `originalText` instead of `text`.
    languageCode: locale,
    locationRestriction: {
      circle: { center: { latitude: center.lat, longitude: center.lng }, radius: radiusMeters },
    },
  }
  if (category) {
    body.includedTypes = [category]
    body.excludedTypes = DEFAULT_EXCLUDED_TYPES.filter(t => t !== category)
  } else {
    body.excludedTypes = DEFAULT_EXCLUDED_TYPES
  }

  let res: { places?: PlaceResult[] }
  try {
    res = await withRetry(() => $fetch<{ places?: PlaceResult[] }>('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      timeout: 20_000,
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELD_MASK },
      body,
    }))
  } catch (error) {
    throw upstreamError('Google Places', error, locale)
  }

  return (res.places ?? []).filter(isProspect).map(toDiscoveredBusiness)
}
