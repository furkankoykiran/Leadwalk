/**
 * The languages Leadwalk speaks — the one list to extend when adding a
 * language. Everything locale-specific is typed against it, so adding a code
 * here makes the compiler point at every place that needs a translation:
 * app/i18n/<code>.ts, category labels, server messages, and (optionally) a
 * native Gemini prompt. See CONTRIBUTING.md → "Adding a language".
 */
export const LOCALES = ['en', 'tr'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_INFO: Record<Locale, {
  /** Name in the language itself, for the language picker. */
  native: string
  /** Name in English, used inside the English AI prompt. */
  english: string
  /** BCP 47 tag for Intl date/number formatting. */
  intl: string
}> = {
  en: { native: 'English', english: 'English', intl: 'en-US' },
  tr: { native: 'Türkçe', english: 'Turkish', intl: 'tr-TR' },
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** First supported language among the browser's preferences (by base
 * language, so tr-TR → tr), else the default. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const base = lang.toLowerCase().split(/[-_;]/)[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}
