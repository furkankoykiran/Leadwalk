import type { Locale } from '#shared/locales'

type Params = Record<string, string | number>

function lookup(messages: unknown, key: string): unknown {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part]
    else return undefined
  }
  return node
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

/** Resolves a dotted key in `messages` (falling back to `fallback`, then to
 * the key itself). A numeric `count` param picks `one`/`other` plural forms. */
export function translate(messages: unknown, fallback: unknown, locale: Locale, key: string, params?: Params): string {
  let entry = lookup(messages, key)
  if (entry && typeof entry === 'object' && params && typeof params.count === 'number') {
    const forms = entry as Record<string, string>
    entry = forms[new Intl.PluralRules(locale).select(params.count)] ?? forms.other
  }
  if (typeof entry === 'string') return interpolate(entry, params)
  const backup = lookup(fallback, key)
  if (backup && typeof backup === 'object' && params && typeof params.count === 'number') {
    const forms = backup as Record<string, string>
    return interpolate(forms[new Intl.PluralRules('en').select(params.count)] ?? forms.other ?? key, params)
  }
  return typeof backup === 'string' ? interpolate(backup, params) : key
}
