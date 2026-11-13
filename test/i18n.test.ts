import { describe, expect, it } from 'vitest'
import { en } from '../app/i18n/en'
import { tr } from '../app/i18n/tr'
import { translate } from '../app/utils/locale'
import { detectLocale, LOCALES } from '../shared/locales'

function keys(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix]
  return Object.entries(node).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]!).sort()
}

// Every language in shared/locales.ts must have a dictionary here.
const DICTIONARIES = { en, tr } satisfies Record<(typeof LOCALES)[number], unknown>

describe('dictionaries', () => {
  it('exist for every supported locale', () => {
    expect(Object.keys(DICTIONARIES).sort()).toEqual([...LOCALES].sort())
  })

  it('Turkish and English have exactly the same keys', () => {
    expect(keys(tr).sort()).toEqual(keys(en).sort())
  })

  it('every translation keeps the same {placeholders}', () => {
    for (const key of keys(en)) {
      const english = translate(en, en, 'en', key)
      const turkish = translate(tr, en, 'tr', key)
      expect(placeholders(turkish), key).toEqual(placeholders(english))
    }
  })
})

describe('detectLocale', () => {
  it('follows the first Turkish or English browser preference', () => {
    expect(detectLocale(['tr-TR', 'en-US'])).toBe('tr')
    expect(detectLocale(['en-GB', 'tr'])).toBe('en')
    expect(detectLocale(['de-DE', 'tr-TR'])).toBe('tr')
  })

  it('falls back to English', () => {
    expect(detectLocale(['de-DE', 'fr'])).toBe('en')
    expect(detectLocale([])).toBe('en')
  })
})

describe('translate', () => {
  it('interpolates params and picks plural forms', () => {
    expect(translate(en, en, 'en', 'leads.subtitle', { count: 1 })).toBe('1 business')
    expect(translate(en, en, 'en', 'leads.subtitle', { count: 3 })).toBe('3 businesses')
    expect(translate(tr, en, 'tr', 'leads.subtitle', { count: 3 })).toBe('3 işletme')
  })

  it('falls back to English, then to the key itself', () => {
    expect(translate({}, en, 'tr', 'nav.today')).toBe('Today')
    expect(translate({}, en, 'tr', 'nope.missing')).toBe('nope.missing')
  })
})
