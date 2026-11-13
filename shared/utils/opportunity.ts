import type { BusinessSignals, DiscoveredBusiness, OpeningHours } from '../types/business'

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

/** Categories where an appointment/booking system is the natural pitch. */
const BOOKING_CATEGORIES = new Set([
  'hair_care', 'hair_salon', 'barber_shop', 'beauty_salon', 'nail_salon', 'spa', 'massage',
  'dentist', 'dental_clinic', 'doctor', 'medical_clinic', 'physiotherapist', 'veterinary_care',
  'gym', 'fitness_center', 'yoga_studio', 'car_repair', 'car_wash',
])

/** Categories where a QR menu / ordering site is the natural pitch. */
const MENU_CATEGORIES = new Set([
  'restaurant', 'cafe', 'coffee_shop', 'bakery', 'kebab_shop', 'bar', 'pub', 'tea_house',
  'fast_food_restaurant', 'pizza_restaurant', 'breakfast_restaurant', 'dessert_shop', 'ice_cream_shop', 'meal_takeaway',
])

export type ScoreReasonKey =
  | 'noWebsite'
  | 'futureOpening'
  | 'fewReviews'
  | 'wellRated'
  | 'lowRating'
  | 'bookingFit'
  | 'menuFit'
  | 'cashOnly'
  | 'temporarilyClosed'
  | 'permanentlyClosed'

export interface ScoreReason {
  key: ScoreReasonKey
  points: number
}

export interface OpportunityScore {
  score: number
  reasons: ScoreReason[]
}

type Scorable = Pick<DiscoveredBusiness, 'website_url' | 'google_status' | 'review_count' | 'rating' | 'category' | 'signals_json'>

/**
 * How much this business likely needs (and can pay for) small custom
 * software, 0–100. Deterministic and explainable — each point comes with a
 * reason the UI can show — so it costs nothing and never surprises.
 */
export function opportunityScore(b: Scorable): OpportunityScore {
  if (b.google_status === 'CLOSED_PERMANENTLY') {
    return { score: 0, reasons: [{ key: 'permanentlyClosed', points: -100 }] }
  }

  const reasons: ScoreReason[] = []
  const add = (key: ScoreReasonKey, points: number) => reasons.push({ key, points })
  const signals = parseJson<BusinessSignals>(b.signals_json, {})
  const category = b.category ?? ''

  if (!b.website_url) add('noWebsite', 35)
  if (b.google_status === 'FUTURE_OPENING') add('futureOpening', 25)
  if (b.google_status === 'CLOSED_TEMPORARILY') add('temporarilyClosed', -30)

  const reviews = b.review_count ?? 0
  if (reviews < 20) add('fewReviews', 10)
  if ((b.rating ?? 0) >= 4.3 && reviews >= 5) add('wellRated', 10)
  else if (b.rating != null && b.rating < 3.5 && reviews >= 5) add('lowRating', 5)

  if (BOOKING_CATEGORIES.has(category) && signals.reservable !== true) add('bookingFit', 15)
  if (MENU_CATEGORIES.has(category)) add('menuFit', 10)
  if (signals.cash_only === true) add('cashOnly', 5)

  const base = 10
  const score = Math.max(0, Math.min(100, base + reasons.reduce((sum, r) => sum + r.points, 0)))
  return { score, reasons }
}

export type ScoreBand = 'hot' | 'warm' | 'cold'

export function scoreBand(score: number): ScoreBand {
  if (score >= 60) return 'hot'
  if (score >= 35) return 'warm'
  return 'cold'
}

/**
 * Whether the place is open at `now`, using its own UTC offset (so it is
 * right wherever the user's browser is). Returns null when Google gave no
 * hours. A single period with no close means open 24/7.
 */
export function isOpenAt(hours: OpeningHours | null, utcOffsetMinutes: number | null, now: Date = new Date()): boolean | null {
  if (!hours || hours.periods.length === 0) return null
  if (hours.periods.length === 1 && !hours.periods[0]!.close) return true

  const offset = utcOffsetMinutes ?? -now.getTimezoneOffset()
  const local = new Date(now.getTime() + offset * 60_000)
  const minuteOfWeek = local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes()
  const WEEK = 7 * 1440

  for (const period of hours.periods) {
    if (!period.close) continue
    const start = period.open.day * 1440 + period.open.hour * 60 + period.open.minute
    let end = period.close.day * 1440 + period.close.hour * 60 + period.close.minute
    if (end <= start) end += WEEK // wraps past Saturday night
    const m = minuteOfWeek < start ? minuteOfWeek + WEEK : minuteOfWeek
    if (m >= start && m < end) return true
  }
  return false
}
