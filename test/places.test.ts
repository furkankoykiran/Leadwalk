import { describe, expect, it } from 'vitest'
import { isProspect, toDiscoveredBusiness } from '../server/utils/place-mapping'
import type { PlaceResult } from '../server/utils/place-mapping'

const sample: PlaceResult = {
  id: 'ChIJ1',
  displayName: { text: 'Usta Berber' },
  primaryType: 'barber_shop',
  primaryTypeDisplayName: { text: 'Berber' },
  types: ['barber_shop', 'point_of_interest'],
  formattedAddress: 'Kırım Cd. No:1, Emek, Çankaya/Ankara',
  addressComponents: [
    { longText: 'Emek', types: ['neighborhood', 'political'] },
    { longText: 'Çankaya', types: ['administrative_area_level_2', 'political'] },
  ],
  nationalPhoneNumber: '0532 123 45 67',
  internationalPhoneNumber: '+90 532 123 45 67',
  googleMapsUri: 'https://maps.google.com/?cid=1',
  rating: 4.9,
  userRatingCount: 14,
  priceLevel: 'PRICE_LEVEL_MODERATE',
  businessStatus: 'OPERATIONAL',
  location: { latitude: 39.92, longitude: 32.85 },
  utcOffsetMinutes: 180,
  regularOpeningHours: {
    periods: [{ open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 21, minute: 0 } }],
    weekdayDescriptions: ['Pazartesi: 09:00–21:00'],
  },
  reviewSummary: { text: { text: 'Friendly staff.' }, disclosureText: { text: 'Summarized with Gemini' }, reviewsUri: 'https://r', flagContentUri: 'https://f' },
  reviews: [
    { rating: 5, text: { text: 'translated' }, originalText: { text: 'Harika!' }, authorAttribution: { displayName: 'Ayşe' }, publishTime: '2026-10-01T10:00:00Z' },
    { rating: 4 },
  ],
  reservable: false,
  paymentOptions: { acceptsCreditCards: true },
}

describe('toDiscoveredBusiness', () => {
  const b = toDiscoveredBusiness(sample)

  it('keeps Google\'s localised type label and builds a walkable area name', () => {
    expect(b.type_label).toBe('Berber')
    expect(b.district).toBe('Emek, Çankaya')
  })

  it('stores the enriched fields from the same (already paid) call', () => {
    expect(b.google_status).toBe('OPERATIONAL')
    expect(b.price_level).toBe('PRICE_LEVEL_MODERATE')
    expect(b.international_phone).toBe('+90 532 123 45 67')
    expect(b.maps_uri).toBe('https://maps.google.com/?cid=1')
    expect(b.utc_offset_minutes).toBe(180)
    expect(JSON.parse(b.opening_hours_json!).weekday_descriptions).toEqual(['Pazartesi: 09:00–21:00'])
    expect(JSON.parse(b.review_summary_json!)).toEqual({ text: 'Friendly staff.', disclosure: 'Summarized with Gemini', reviews_uri: 'https://r', flag_uri: 'https://f' })
  })

  it('keeps unknown signals unknown instead of turning them into "no"', () => {
    expect(JSON.parse(b.signals_json!)).toEqual({ reservable: false, accepts_credit_cards: true })
  })

  it('keeps reviews in their original language and skips empty ones', () => {
    const reviews = JSON.parse(b.reviews_json!)
    expect(reviews).toHaveLength(1)
    expect(reviews[0]).toEqual({ author: 'Ayşe', rating: 5, text: 'Harika!', published_at: '2026-10-01T10:00:00Z' })
  })
})

describe('isProspect', () => {
  it('drops places you cannot walk into or sell to', () => {
    expect(isProspect(sample)).toBe(true)
    expect(isProspect({ ...sample, businessStatus: 'CLOSED_PERMANENTLY' })).toBe(false)
    expect(isProspect({ ...sample, pureServiceAreaBusiness: true })).toBe(false)
    expect(isProspect({ ...sample, primaryType: 'monument' })).toBe(false)
  })
})
