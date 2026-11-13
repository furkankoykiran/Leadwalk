import { describe, expect, it } from 'vitest'
import { isOpenAt, opportunityScore, parseJson, scoreBand } from '../shared/utils/opportunity'

const base = { website_url: null, google_status: 'OPERATIONAL' as const, review_count: 50, rating: 4.0, category: 'store', signals_json: null }

describe('opportunityScore', () => {
  it('explains every point it gives', () => {
    const { score, reasons } = opportunityScore({ ...base, category: 'barber_shop', rating: 4.9, review_count: 12, signals_json: JSON.stringify({ reservable: false }) })
    expect(reasons.map(r => r.key)).toEqual(['noWebsite', 'fewReviews', 'wellRated', 'bookingFit'])
    expect(score).toBe(10 + 35 + 10 + 10 + 15)
  })

  it('does not count a booking fit when the place already takes reservations', () => {
    const { reasons } = opportunityScore({ ...base, category: 'barber_shop', signals_json: JSON.stringify({ reservable: true }) })
    expect(reasons.map(r => r.key)).not.toContain('bookingFit')
  })

  it('needs enough reviews before trusting a rating either way', () => {
    expect(opportunityScore({ ...base, rating: 5, review_count: 2 }).reasons.map(r => r.key)).not.toContain('wellRated')
    expect(opportunityScore({ ...base, rating: 3.0, review_count: 30 }).reasons.map(r => r.key)).toContain('lowRating')
  })

  it('zeroes permanently closed places and penalises temporarily closed ones', () => {
    expect(opportunityScore({ ...base, google_status: 'CLOSED_PERMANENTLY' }).score).toBe(0)
    const open = opportunityScore(base).score
    expect(opportunityScore({ ...base, google_status: 'CLOSED_TEMPORARILY' }).score).toBe(Math.max(0, open - 30))
  })

  it('stays within 0–100', () => {
    const maxed = opportunityScore({ ...base, category: 'restaurant', google_status: 'FUTURE_OPENING', review_count: 0, signals_json: JSON.stringify({ cash_only: true }) })
    expect(maxed.score).toBeLessThanOrEqual(100)
    expect(maxed.score).toBeGreaterThan(60)
  })
})

describe('scoreBand', () => {
  it('splits hot / warm / cold', () => {
    expect(scoreBand(60)).toBe('hot')
    expect(scoreBand(59)).toBe('warm')
    expect(scoreBand(35)).toBe('warm')
    expect(scoreBand(34)).toBe('cold')
  })
})

describe('isOpenAt', () => {
  // Mon–Sat 09:00–21:00 in the place's own time zone (UTC+3).
  const hours = {
    periods: [1, 2, 3, 4, 5, 6].map(day => ({ open: { day, hour: 9, minute: 0 }, close: { day, hour: 21, minute: 0 } })),
    weekday_descriptions: [],
  }

  it('uses the place\'s UTC offset, not the browser\'s', () => {
    // Friday 2026-11-13 10:00 UTC = 13:00 in Istanbul → open.
    expect(isOpenAt(hours, 180, new Date('2026-11-13T10:00:00Z'))).toBe(true)
    // Friday 19:00 UTC = 22:00 in Istanbul → closed.
    expect(isOpenAt(hours, 180, new Date('2026-11-13T19:00:00Z'))).toBe(false)
    // Sunday → closed all day.
    expect(isOpenAt(hours, 180, new Date('2026-11-15T10:00:00Z'))).toBe(false)
  })

  it('handles periods that run past midnight and 24/7 places', () => {
    const lateBar = { periods: [{ open: { day: 5, hour: 20, minute: 0 }, close: { day: 6, hour: 2, minute: 0 } }], weekday_descriptions: [] }
    expect(isOpenAt(lateBar, 0, new Date('2026-11-14T01:00:00Z'))).toBe(true)
    expect(isOpenAt({ periods: [{ open: { day: 0, hour: 0, minute: 0 } }], weekday_descriptions: [] }, 0)).toBe(true)
  })

  it('returns null when Google has no hours', () => {
    expect(isOpenAt(null, 180)).toBeNull()
  })
})

describe('parseJson', () => {
  it('falls back on null or malformed input', () => {
    expect(parseJson(null, 'x')).toBe('x')
    expect(parseJson('{oops', [])).toEqual([])
    expect(parseJson('{"a":1}', {})).toEqual({ a: 1 })
  })
})
