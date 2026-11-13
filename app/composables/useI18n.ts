import { en } from '~/i18n/en'
import { tr } from '~/i18n/tr'
import type { Messages } from '~/i18n/en'
import type { Locale } from '~/utils/locale'
import { detectLocale, translate } from '~/utils/locale'

const DICTIONARIES: Record<Locale, Messages> = { en, tr }
const OVERRIDE_KEY = 'locale-override'

function readOverride(): Locale | null {
  try {
    const value = localStorage.getItem(OVERRIDE_KEY)
    return value === 'en' || value === 'tr' ? value : null
  } catch {
    return null
  }
}

/**
 * UI language. Follows the browser (navigator.languages) automatically; a
 * choice made in the sidebar overrides it and is remembered per browser.
 */
export function useI18n() {
  const override = useState<Locale | null>('locale-override', () => (import.meta.client ? readOverride() : null))
  const browserLocale = useState<Locale>('locale-browser', () =>
    import.meta.client ? detectLocale(navigator.languages?.length ? navigator.languages : [navigator.language]) : 'en')
  const locale = computed<Locale>(() => override.value ?? browserLocale.value)

  function t(key: string, params?: Record<string, string | number>): string {
    return translate(DICTIONARIES[locale.value], en, locale.value, key, params)
  }

  function setLocale(next: Locale | 'auto') {
    override.value = next === 'auto' ? null : next
    try {
      if (next === 'auto') localStorage.removeItem(OVERRIDE_KEY)
      else localStorage.setItem(OVERRIDE_KEY, next)
    } catch {
      // Private mode etc. — the choice just won't survive a reload.
    }
  }

  return { locale, isAuto: computed(() => override.value === null), browserLocale, t, setLocale }
}
