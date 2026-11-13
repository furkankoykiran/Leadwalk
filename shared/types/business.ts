export type BusinessStatus = 'discovered' | 'processed' | 'visited' | 'won' | 'lost'

/** Google's businessStatus. FUTURE_OPENING is a hot lead: they need their
 * digital setup before launch. */
export type GoogleBusinessStatus = 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY' | 'FUTURE_OPENING'

export type PriceLevel =
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE'

export interface ReviewSnippet {
  author: string
  rating: number
  text: string
  /** ISO time the review was published, when Google provides it. */
  published_at?: string | null
}

export interface ProductIdea {
  title: string
  description: string
  price_estimate: string
  needs_cms: boolean
  build_prompt: string
}

/** One opening period in Google's format: day 0 = Sunday, local time. */
export interface OpeningPeriod {
  open: { day: number; hour: number; minute: number }
  close?: { day: number; hour: number; minute: number }
}

export interface OpeningHours {
  periods: OpeningPeriod[]
  /** Localised human-readable lines, one per weekday (language of discovery). */
  weekday_descriptions: string[]
}

/** Service/amenity booleans from Places. `undefined` means Google doesn't
 * know — not "no". Small businesses often have none of these set. */
export interface BusinessSignals {
  reservable?: boolean
  delivery?: boolean
  takeout?: boolean
  dine_in?: boolean
  serves_breakfast?: boolean
  serves_lunch?: boolean
  serves_dinner?: boolean
  serves_coffee?: boolean
  serves_beer?: boolean
  serves_wine?: boolean
  outdoor_seating?: boolean
  good_for_groups?: boolean
  accepts_credit_cards?: boolean
  accepts_nfc?: boolean
  cash_only?: boolean
}

/** Google's AI review summary. Must be shown with its disclosure text and
 * links unmodified (Places policies). */
export interface ReviewSummary {
  text: string
  disclosure: string | null
  reviews_uri: string | null
  flag_uri: string | null
}

/** Fields that come from Google on every discovery and are refreshed on
 * re-discovery. */
export interface DiscoveredBusiness {
  place_id: string
  name: string
  category: string | null
  /** Google's localised label for the primary type (language of discovery). */
  type_label: string | null
  types_json: string | null
  address: string | null
  district: string | null
  phone: string | null
  international_phone: string | null
  website_url: string | null
  maps_uri: string | null
  rating: number | null
  review_count: number | null
  price_level: PriceLevel | null
  google_status: GoogleBusinessStatus | null
  lat: number | null
  lng: number | null
  utc_offset_minutes: number | null
  opening_hours_json: string | null
  signals_json: string | null
  editorial_summary: string | null
  review_summary_json: string | null
  reviews_json: string | null
}

/** A stored business: Google data plus everything the user and the AI added. */
export interface Business extends DiscoveredBusiness {
  id: number
  status: BusinessStatus
  profile_md: string | null
  pitch_script_md: string | null
  ideas_json: string | null
  /** Language the AI output was generated in. */
  generated_locale: string | null
  discovered_at: string
  processed_at: string | null
  status_changed_at: string | null
  last_visited_at: string | null
  follow_up_at: string | null
  /** What the deal is worth (user-entered when won), in the user's currency. */
  deal_value: number | null
  search_id: number | null
  notes_count: number
}

export type ActivityType = 'discovered' | 'generated' | 'status' | 'note' | 'follow_up'

export interface Activity {
  id: number
  business_id: number
  type: ActivityType
  from_status: BusinessStatus | null
  to_status: BusinessStatus | null
  body: string | null
  created_at: string
}

/** An activity joined with its business, for the dashboard feed. */
export interface ActivityWithBusiness extends Activity {
  business_name: string
}

export interface SearchRecord {
  id: number
  address: string | null
  lat: number
  lng: number
  radius_meters: number
  category: string | null
  result_count: number
  new_count: number
  created_at: string
}

export interface DiscoverRequestBody {
  location?: string
  lat?: number
  lng?: number
  radiusMeters?: number
  category?: string
}

export interface DiscoverResponse {
  count: number
  new_count: number
  search_id: number | null
  message?: string
}

export interface ProcessResultBody {
  profile_md: string
  pitch_script_md: string
  ideas: ProductIdea[]
}

export interface BusinessUpdateBody {
  status?: BusinessStatus
  follow_up_at?: string | null
  deal_value?: number | null
}

export interface BulkActionBody {
  ids: number[]
  action: 'status' | 'delete'
  status?: BusinessStatus
}
