import { describe, expect, it } from 'vitest'
import { formatOpeningHours } from '../shared/utils/hours'
import { businessCategory } from '../app/utils/category'

const WEEKDAYS_9_TO_21 = {
  periods: [1, 2, 3, 4, 5, 6].map(day => ({ open: { day, hour: 9, minute: 0 }, close: { day, hour: 21, minute: 0 } })),
  // Stored in the language of discovery — must never reach the UI.
  weekday_descriptions: ['Pazartesi: 09:00–21:00'],
}

describe('formatOpeningHours', () => {
  it('renders weekday names and times in the UI language, not the stored one', () => {
    const en = formatOpeningHours(WEEKDAYS_9_TO_21, 'en-US')!
    expect(en.days[0]).toMatchObject({ day: 1, name: 'Monday', ranges: ['9:00 AM–9:00 PM'] })
    expect(en.days[6]).toMatchObject({ day: 0, name: 'Sunday', ranges: [] })
    expect(JSON.stringify(en)).not.toContain('Pazartesi')

    const tr = formatOpeningHours(WEEKDAYS_9_TO_21, 'tr-TR')!
    expect(tr.days[0]).toMatchObject({ name: 'Pazartesi', ranges: ['09:00–21:00'] })
    expect(tr.days.map(d => d.name)).toEqual(['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'])
  })

  it('sorts split shifts and detects 24/7', () => {
    const split = formatOpeningHours({
      periods: [
        { open: { day: 2, hour: 14, minute: 0 }, close: { day: 2, hour: 18, minute: 30 } },
        { open: { day: 2, hour: 8, minute: 0 }, close: { day: 2, hour: 12, minute: 0 } },
      ],
      weekday_descriptions: [],
    }, 'tr-TR')!
    expect(split.days[1]!.ranges).toEqual(['08:00–12:00', '14:00–18:30'])

    const allDay = formatOpeningHours({ periods: [{ open: { day: 0, hour: 0, minute: 0 } }], weekday_descriptions: [] }, 'en-US')!
    expect(allDay.allDay).toBe(true)
  })

  it('returns null without hours', () => {
    expect(formatOpeningHours(null, 'en-US')).toBeNull()
    expect(formatOpeningHours({ periods: [], weekday_descriptions: [] }, 'en-US')).toBeNull()
  })
})

describe('businessCategory', () => {
  it("uses Google's own label only when it is in the UI language", () => {
    const turkishLabel = { category: 'barber_shop', type_label: 'Berber', google_locale: 'tr' }
    expect(businessCategory(turkishLabel, 'tr')).toBe('Berber')
    expect(businessCategory(turkishLabel, 'en')).toBe('Barber')

    const unmapped = { category: 'vegan_restaurant', type_label: 'Vegan restoran', google_locale: 'tr' }
    expect(businessCategory(unmapped, 'en')).toBe('Vegan Restaurant')
  })
})
