import { LOCALE_INFO } from '#shared/locales'

// All dates are stored as UTC ISO strings and rendered in the *browser's*
// time zone (Intl's default), in the active UI language.

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function useFormat() {
  const { locale } = useI18n()
  const intlLocale = computed(() => LOCALE_INFO[locale.value].intl)

  function dateTime(iso: string | null | undefined): string {
    if (!iso) return ''
    return new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  }

  function date(iso: string | null | undefined): string {
    if (!iso) return ''
    return new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium' }).format(new Date(iso))
  }

  /** "3 hours ago" / "3 saat önce", falling back to an absolute date after a week. */
  function relative(iso: string | null | undefined, now: Date = new Date()): string {
    if (!iso) return ''
    const then = new Date(iso)
    const seconds = Math.round((then.getTime() - now.getTime()) / 1000)
    const abs = Math.abs(seconds)
    const rtf = new Intl.RelativeTimeFormat(intlLocale.value, { numeric: 'auto' })
    if (abs < 60) return rtf.format(seconds, 'second')
    if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
    if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour')
    if (abs < 7 * 86_400) return rtf.format(Math.round(seconds / 86_400), 'day')
    return date(iso)
  }

  function number(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(intlLocale.value, options).format(value)
  }

  function percent(value: number): string {
    return new Intl.NumberFormat(intlLocale.value, { style: 'percent', maximumFractionDigits: 0 }).format(value)
  }

  return { dateTime, date, relative, number, percent, intlLocale }
}
