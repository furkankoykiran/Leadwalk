import type { DiscoveredBusiness, ReviewSnippet } from '#shared/types/business'
import { upstreamError, withRetry } from './upstream'

const MAX_REVIEWS_STORED = 3

export interface GeocodeResult {
  lat: number
  lng: number
}

interface GeocodeResponse {
  status: string
  results: Array<{ geometry: { location: { lat: number; lng: number } } }>
}

export async function geocodeAddress(address: string, apiKey: string): Promise<GeocodeResult> {
  let res: GeocodeResponse
  try {
    res = await withRetry(() => $fetch<GeocodeResponse>('https://maps.googleapis.com/maps/api/geocode/json', {
      query: { address, key: apiKey },
      timeout: 15_000,
    }))
  } catch (error) {
    throw upstreamError('Google Geocoding', error)
  }

  // The Geocoding API reports most failures as HTTP 200 with a status field.
  const first = res.results[0]
  if (res.status === 'OK' && first) return first.geometry.location
  if (res.status === 'ZERO_RESULTS' || (res.status === 'OK' && !first)) {
    throw createError({ statusCode: 404, statusMessage: 'Address not found', message: `Adres bulunamadı: ${address}` })
  }
  if (res.status === 'REQUEST_DENIED') {
    throw createError({
      statusCode: 502,
      statusMessage: 'Geocoding request denied',
      message: 'Google Geocoding isteği reddetti. Sunucu anahtarında Geocoding API etkin mi, kontrol et.',
    })
  }
  throw createError({
    statusCode: 502,
    statusMessage: 'Geocoding failed',
    message: `Adres çözümlenemedi (${res.status}). Biraz sonra tekrar dene.`,
  })
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

// Types Google returns as a place's primaryType but refuses as an
// excludedTypes request value — filtered out locally after the fact instead.
// The rest are added here rather than to excludedTypes so an unsupported
// value can never fail the whole search; live tests in central Ankara
// returned all of them as "prospects".
const POST_FILTER_EXCLUDED_TYPES = [
  'point_of_interest', 'toll_booth', 'establishment',
  'monument', 'historical_landmark', 'library', 'garden', 'academic_department',
]

interface SearchNearbyResponse {
  places?: Array<{
    id: string
    displayName?: { text: string }
    primaryType?: string
    formattedAddress?: string
    nationalPhoneNumber?: string
    websiteUri?: string
    rating?: number
    userRatingCount?: number
    location?: { latitude: number; longitude: number }
    reviews?: Array<{
      rating?: number
      text?: { text: string }
      originalText?: { text: string }
      authorAttribution?: { displayName?: string }
    }>
  }>
}

export async function nearbySearch(
  center: GeocodeResult,
  radiusMeters: number,
  category: string | undefined,
  apiKey: string,
): Promise<DiscoveredBusiness[]> {
  const body: Record<string, unknown> = {
    maxResultCount: 20,
    // Google's default is POPULARITY (prominence), which can skip places right
    // next to the search point in favor of "bigger" places further away.
    // DISTANCE ranks by proximity to the center instead.
    rankPreference: 'DISTANCE',
    // Hints the response language (business names, formatted address). Does
    // NOT stop Google from auto-translating review text — that's handled
    // below by reading `originalText` instead of `text`.
    languageCode: 'tr',
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

  let res: SearchNearbyResponse
  try {
    res = await withRetry(() => fetchNearby(body, apiKey))
  } catch (error) {
    throw upstreamError('Google Places', error)
  }

  const filtered = (res.places ?? []).filter(p => !POST_FILTER_EXCLUDED_TYPES.includes(p.primaryType ?? ''))

  return filtered.map((p) => {
    const reviews: ReviewSnippet[] = (p.reviews ?? [])
      // Filter before slicing, so empty reviews don't eat into the three
      // slots that real ones could have filled.
      .filter(r => r.originalText?.text || r.text?.text)
      .slice(0, MAX_REVIEWS_STORED)
      .map(r => ({
        author: r.authorAttribution?.displayName ?? 'Anonim',
        rating: r.rating ?? 0,
        // originalText is the review as the author actually wrote it;
        // `text` is Google's auto-translation, which we don't want.
        text: (r.originalText?.text ?? r.text!.text),
      }))

    return {
      place_id: p.id,
      name: p.displayName?.text ?? 'İsimsiz İşletme',
      category: p.primaryType ?? null,
      address: p.formattedAddress ?? null,
      phone: p.nationalPhoneNumber ?? null,
      website_url: p.websiteUri ?? null,
      rating: p.rating ?? null,
      review_count: p.userRatingCount ?? null,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      reviews_json: reviews.length > 0 ? JSON.stringify(reviews) : null,
    }
  })
}

function fetchNearby(body: Record<string, unknown>, apiKey: string): Promise<SearchNearbyResponse> {
  return $fetch<SearchNearbyResponse>('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    timeout: 20_000,
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.primaryType',
        'places.formattedAddress',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.rating',
        'places.userRatingCount',
        'places.location',
        'places.reviews',
      ].join(','),
    },
    body,
  })
}
