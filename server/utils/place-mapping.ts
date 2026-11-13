// Pure mapping from a Places API (New) result to the stored lead shape.
// No Nitro globals here, so it is unit-testable on its own.
import type {
  BusinessSignals,
  DiscoveredBusiness,
  GoogleBusinessStatus,
  OpeningHours,
  PriceLevel,
  ReviewSnippet,
  ReviewSummary,
} from '#shared/types/business'

// Nearby Search returns at most 5 reviews per place; keep them all.
const MAX_REVIEWS_STORED = 5

// Filtered here rather than via excludedTypes so an unsupported value can
// never fail the whole search; live tests in central Ankara returned all of
// them as "prospects".
const POST_FILTER_EXCLUDED_TYPES = [
  'point_of_interest', 'toll_booth', 'establishment',
  'monument', 'historical_landmark', 'library', 'garden', 'academic_department',
]

interface LocalizedText { text?: string; languageCode?: string }

export interface PlaceResult {
  id: string
  displayName?: LocalizedText
  primaryType?: string
  primaryTypeDisplayName?: LocalizedText
  types?: string[]
  formattedAddress?: string
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  googleMapsUri?: string
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  businessStatus?: string
  pureServiceAreaBusiness?: boolean
  location?: { latitude: number; longitude: number }
  utcOffsetMinutes?: number
  regularOpeningHours?: {
    periods?: Array<{
      open?: { day?: number; hour?: number; minute?: number }
      close?: { day?: number; hour?: number; minute?: number }
    }>
    weekdayDescriptions?: string[]
  }
  editorialSummary?: LocalizedText
  reviewSummary?: {
    text?: LocalizedText
    disclosureText?: LocalizedText
    reviewsUri?: string
    flagContentUri?: string
  }
  reviews?: Array<{
    rating?: number
    text?: LocalizedText
    originalText?: LocalizedText
    authorAttribution?: { displayName?: string }
    publishTime?: string
  }>
  reservable?: boolean
  delivery?: boolean
  takeout?: boolean
  dineIn?: boolean
  servesBreakfast?: boolean
  servesLunch?: boolean
  servesDinner?: boolean
  servesCoffee?: boolean
  servesBeer?: boolean
  servesWine?: boolean
  outdoorSeating?: boolean
  goodForGroups?: boolean
  paymentOptions?: {
    acceptsCreditCards?: boolean
    acceptsDebitCards?: boolean
    acceptsCashOnly?: boolean
    acceptsNfc?: boolean
  }
}

const GOOGLE_STATUSES: readonly GoogleBusinessStatus[] = ['OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY', 'FUTURE_OPENING']
const PRICE_LEVELS: readonly PriceLevel[] = [
  'PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE',
]

/** "Emek, Çankaya": neighbourhood plus district, for grouping on foot. */
function districtOf(components: PlaceResult['addressComponents']): string | null {
  if (!components) return null
  const find = (type: string) => components.find(c => c.types?.includes(type))?.longText
  const neighbourhood = find('neighborhood') ?? find('sublocality_level_1') ?? find('sublocality')
  const district = find('administrative_area_level_2') ?? find('locality')
  const parts = [neighbourhood, district].filter((p): p is string => !!p)
  return parts.length > 0 ? [...new Set(parts)].join(', ') : null
}

function openingHoursOf(hours: PlaceResult['regularOpeningHours']): OpeningHours | null {
  if (!hours?.periods?.length) return null
  const periods = hours.periods
    .filter(p => p.open && typeof p.open.day === 'number')
    .map(p => ({
      open: { day: p.open!.day!, hour: p.open!.hour ?? 0, minute: p.open!.minute ?? 0 },
      ...(p.close && typeof p.close.day === 'number'
        ? { close: { day: p.close.day, hour: p.close.hour ?? 0, minute: p.close.minute ?? 0 } }
        : {}),
    }))
  return { periods, weekday_descriptions: hours.weekdayDescriptions ?? [] }
}

function signalsOf(p: PlaceResult): BusinessSignals | null {
  const s: BusinessSignals = {
    reservable: p.reservable,
    delivery: p.delivery,
    takeout: p.takeout,
    dine_in: p.dineIn,
    serves_breakfast: p.servesBreakfast,
    serves_lunch: p.servesLunch,
    serves_dinner: p.servesDinner,
    serves_coffee: p.servesCoffee,
    serves_beer: p.servesBeer,
    serves_wine: p.servesWine,
    outdoor_seating: p.outdoorSeating,
    good_for_groups: p.goodForGroups,
    accepts_credit_cards: p.paymentOptions?.acceptsCreditCards ?? p.paymentOptions?.acceptsDebitCards,
    accepts_nfc: p.paymentOptions?.acceptsNfc,
    cash_only: p.paymentOptions?.acceptsCashOnly,
  }
  // Drop unknowns so "missing" never reads as "no".
  const known = Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v === 'boolean'))
  return Object.keys(known).length > 0 ? known as BusinessSignals : null
}

function reviewSummaryOf(summary: PlaceResult['reviewSummary']): ReviewSummary | null {
  const text = summary?.text?.text?.trim()
  if (!text) return null
  return {
    text,
    disclosure: summary?.disclosureText?.text ?? null,
    reviews_uri: summary?.reviewsUri ?? null,
    flag_uri: summary?.flagContentUri ?? null,
  }
}

/** Maps one Places result to the stored shape. */
export function toDiscoveredBusiness(p: PlaceResult): DiscoveredBusiness {
  const reviews: ReviewSnippet[] = (p.reviews ?? [])
    // Filter before slicing, so empty reviews don't take the slots real ones could fill.
    .filter(r => r.originalText?.text || r.text?.text)
    .slice(0, MAX_REVIEWS_STORED)
    .map(r => ({
      author: r.authorAttribution?.displayName ?? '',
      rating: r.rating ?? 0,
      // originalText is the review as the author actually wrote it;
      // `text` is Google's auto-translation, which we don't want.
      text: (r.originalText?.text ?? r.text!.text!),
      published_at: r.publishTime ?? null,
    }))

  const status = GOOGLE_STATUSES.find(s => s === p.businessStatus) ?? null
  const price = PRICE_LEVELS.find(l => l === p.priceLevel) ?? null
  const hours = openingHoursOf(p.regularOpeningHours)
  const signals = signalsOf(p)
  const summary = reviewSummaryOf(p.reviewSummary)

  return {
    place_id: p.id,
    name: p.displayName?.text ?? p.id,
    category: p.primaryType ?? null,
    type_label: p.primaryTypeDisplayName?.text ?? null,
    types_json: p.types?.length ? JSON.stringify(p.types) : null,
    address: p.formattedAddress ?? null,
    district: districtOf(p.addressComponents),
    phone: p.nationalPhoneNumber ?? null,
    international_phone: p.internationalPhoneNumber ?? null,
    website_url: p.websiteUri ?? null,
    maps_uri: p.googleMapsUri ?? null,
    rating: p.rating ?? null,
    review_count: p.userRatingCount ?? null,
    price_level: price,
    google_status: status,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    utc_offset_minutes: typeof p.utcOffsetMinutes === 'number' ? p.utcOffsetMinutes : null,
    opening_hours_json: hours ? JSON.stringify(hours) : null,
    signals_json: signals ? JSON.stringify(signals) : null,
    editorial_summary: p.editorialSummary?.text?.trim() || null,
    review_summary_json: summary ? JSON.stringify(summary) : null,
    reviews_json: reviews.length > 0 ? JSON.stringify(reviews) : null,
  }
}

/** Places worth walking into: not permanently closed, not service-area-only
 * (no storefront), and not one of the non-commercial types. */
export function isProspect(p: PlaceResult): boolean {
  if (POST_FILTER_EXCLUDED_TYPES.includes(p.primaryType ?? '')) return false
  if (p.businessStatus === 'CLOSED_PERMANENTLY') return false
  if (p.pureServiceAreaBusiness === true) return false
  return true
}
