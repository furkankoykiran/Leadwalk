import type { OpeningHours } from '../types/business'

export interface DayHours {
  /** 0 = Sunday … 6 = Saturday (Google's numbering). */
  day: number
  /** Localised weekday name, e.g. "Monday" / "Pazartesi". */
  name: string
  /** Localised time ranges ("09:00–21:00"); empty when closed that day. */
  ranges: string[]
}

// 7 Jan 2024 is a Sunday, so day d is 7 + d January.
function weekdayName(day: number, intlLocale: string): string {
  return new Intl.DateTimeFormat(intlLocale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + day)))
}

// 24-hour locales write "08:00" (tr), 12-hour ones "8:00 AM" (en-US).
function time(hour: number, minute: number, intlLocale: string): string {
  const twelveHour = new Intl.DateTimeFormat(intlLocale, { hour: 'numeric' }).resolvedOptions().hour12
  return new Intl.DateTimeFormat(intlLocale, { hour: twelveHour ? 'numeric' : '2-digit', minute: '2-digit', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2024, 0, 1, hour, minute)))
}

/**
 * Opening hours for display, built from Google's language-neutral periods
 * and rendered in `intlLocale` — never from Google's `weekdayDescriptions`,
 * which are fixed in whatever language the place was discovered in.
 * Weeks start on Monday. Returns null without hours; `allDay` for 24/7.
 */
export function formatOpeningHours(hours: OpeningHours | null, intlLocale: string): { allDay: boolean; days: DayHours[] } | null {
  if (!hours || hours.periods.length === 0) return null
  const allDay = hours.periods.length === 1 && !hours.periods[0]!.close
  const order = [1, 2, 3, 4, 5, 6, 0]
  const days = order.map((day) => {
    const ranges = allDay
      ? []
      : hours.periods
          .filter(p => p.open.day === day && p.close)
          .sort((a, b) => a.open.hour * 60 + a.open.minute - (b.open.hour * 60 + b.open.minute))
          .map(p => `${time(p.open.hour, p.open.minute, intlLocale)}–${time(p.close!.hour, p.close!.minute, intlLocale)}`)
    return { day, name: weekdayName(day, intlLocale), ranges }
  })
  return { allDay, days }
}
