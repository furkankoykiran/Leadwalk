export interface DailyUsage {
  date: string
  discover_count: number
  process_count: number
  geocode_count: number
}

export interface UsageSummary {
  today: DailyUsage
  month: Omit<DailyUsage, 'date'> & { month: string }
}

/**
 * Google's monthly free usage caps for the calls the app makes. Every
 * discovery is one Nearby Search billed as "Enterprise + Atmosphere"
 * (because reviews are requested) — 1,000 free per month. Typed addresses
 * add one Geocoding call (10,000 free). Gemini runs on the free tier and is
 * rate-limited per day rather than billed.
 * https://developers.google.com/maps/billing-and-pricing/pricing
 */
export const FREE_MONTHLY_CAPS = {
  nearbySearch: 1000,
  geocoding: 10_000,
} as const
