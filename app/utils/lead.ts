import type { Business, OpeningHours } from '#shared/types/business'
import type { OpportunityScore, ScoreBand } from '#shared/utils/opportunity'
import { isOpenAt, opportunityScore, parseJson, scoreBand } from '#shared/utils/opportunity'

/** Derived, display-ready facts about a lead (computed client-side, never stored). */
export interface LeadView {
  business: Business
  score: OpportunityScore
  band: ScoreBand
  openNow: boolean | null
  hasCoords: boolean
  followUpDue: boolean
  followUpOverdue: boolean
}

export function toLeadView(business: Business, now: Date = new Date()): LeadView {
  const score = opportunityScore(business)
  const hours = parseJson<OpeningHours | null>(business.opening_hours_json, null)
  const followUp = business.follow_up_at ? new Date(business.follow_up_at) : null
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const open = business.status !== 'won' && business.status !== 'lost'
  return {
    business,
    score,
    band: scoreBand(score.score),
    openNow: business.google_status === 'OPERATIONAL' || business.google_status === null
      ? isOpenAt(hours, business.utc_offset_minutes, now)
      : false,
    hasCoords: business.lat != null && business.lng != null,
    followUpDue: open && !!followUp && followUp <= endOfToday,
    followUpOverdue: open && !!followUp && followUp < startOfToday,
  }
}

/** Google's own place link when we have it, else a Maps search by place_id. */
export function placeUrl(business: Pick<Business, 'maps_uri' | 'place_id' | 'name' | 'lat' | 'lng'>): string {
  if (business.maps_uri) return business.maps_uri
  const query = business.lat != null && business.lng != null ? `${business.lat},${business.lng}` : encodeURIComponent(business.name)
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${business.place_id}`
}

export function directionsUrl(business: Pick<Business, 'lat' | 'lng' | 'place_id' | 'name'>): string {
  const params = new URLSearchParams({ api: '1', travelmode: 'walking' })
  if (business.lat != null && business.lng != null) params.set('destination', `${business.lat},${business.lng}`)
  else params.set('destination', business.name)
  params.set('destination_place_id', business.place_id)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** wa.me link from an international number ("+90 532 …" → 90532…). */
export function whatsappUrl(internationalPhone: string | null): string | null {
  if (!internationalPhone) return null
  const digits = internationalPhone.replace(/\D/g, '')
  return digits.length >= 8 ? `https://wa.me/${digits}` : null
}
