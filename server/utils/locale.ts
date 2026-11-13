import type { H3Event } from 'h3'
import type { Locale } from '#shared/locales'
import { detectLocale, isLocale } from '#shared/locales'

export type ServerLocale = Locale

/** UI language sent by the client (x-locale), else the browser's
 * Accept-Language, else the default language. */
export function getLocale(event: H3Event): ServerLocale {
  // Plain navigations (CSV download) can't set headers, so ?locale= works too.
  const explicit = getHeader(event, 'x-locale') ?? getQuery(event).locale
  if (isLocale(explicit)) return explicit
  const accept = getHeader(event, 'accept-language') ?? ''
  return detectLocale(accept.split(',').map(part => part.trim()))
}

/** The browser's IANA time zone (x-timezone) when it is one Intl knows. */
export function getTimeZone(event: H3Event): string | undefined {
  const fromQuery = getQuery(event).tz
  const tz = getHeader(event, 'x-timezone') ?? (typeof fromQuery === 'string' ? fromQuery : undefined)
  if (!tz) return undefined
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return tz
  } catch {
    return undefined
  }
}

const MESSAGES = {
  invalidId: { en: 'Invalid id.', tr: 'Geçersiz id.' },
  notFound: { en: 'Business not found.', tr: 'İşletme bulunamadı.' },
  invalidStatus: { en: 'Invalid status.', tr: 'Geçersiz durum.' },
  invalidBody: { en: 'Invalid request.', tr: 'Geçersiz istek.' },
  needLocation: { en: 'Type an address or pick a point on the map.', tr: 'Bir adres yaz ya da haritada bir nokta seç.' },
  badRadius: { en: 'Radius must be between 0 and {max} metres.', tr: 'Yarıçap 0 ile {max} metre arasında olmalı.' },
  badCategory: { en: 'Invalid category.', tr: 'Geçersiz kategori.' },
  missingMapsKey: { en: 'GOOGLE_MAPS_API_KEY is not set. Check your .env file.', tr: 'GOOGLE_MAPS_API_KEY tanımlı değil. .env dosyasını kontrol et.' },
  missingGeminiKey: { en: 'GEMINI_API_KEY is not set. Check your .env file.', tr: 'GEMINI_API_KEY tanımlı değil. .env dosyasını kontrol et.' },
  noneFound: { en: 'No businesses found in this area.', tr: 'Bu bölgede işletme bulunamadı.' },
  addressNotFound: { en: 'Address not found: {address}', tr: 'Adres bulunamadı: {address}' },
  geocodeDenied: { en: 'Google Geocoding refused the request. Is the Geocoding API enabled for the server key?', tr: 'Google Geocoding isteği reddetti. Sunucu anahtarında Geocoding API etkin mi, kontrol et.' },
  geocodeFailed: { en: 'Could not resolve the address ({status}). Try again shortly.', tr: 'Adres çözümlenemedi ({status}). Biraz sonra tekrar dene.' },
  upstreamTimeout: { en: '{service} did not respond (timeout). Try again shortly.', tr: '{service} yanıt vermedi (zaman aşımı). Biraz sonra tekrar dene.' },
  upstreamQuota: { en: '{service} quota or rate limit reached. Wait a moment and try again.', tr: '{service} kotası/istek sınırı doldu. Biraz bekleyip tekrar dene.' },
  upstreamRejected: { en: '{service} rejected the request ({status}). Check the API key and enabled APIs.', tr: '{service} isteği reddetti ({status}). API anahtarını ve etkin API\'leri kontrol et.' },
  upstreamDown: { en: '{service} is busy or unreachable ({status}). Try again shortly.', tr: '{service} şu an yoğun ya da erişilemiyor ({status}). Biraz sonra tekrar dene.' },
  upstreamFailed: { en: '{service} request failed.', tr: '{service} isteği başarısız oldu.' },
  geminiEmpty: { en: 'Gemini returned an empty answer, try again.', tr: 'Gemini boş yanıt döndürdü, tekrar dene.' },
  geminiBadJson: { en: 'Gemini returned invalid JSON, try again.', tr: 'Gemini yanıtı geçerli JSON değil, tekrar dene.' },
  geminiNoIdeas: { en: 'Gemini returned no ideas, try again.', tr: 'Gemini fikir listesi döndürmedi, tekrar dene.' },
} as const satisfies Record<string, Record<Locale, string>>

export type MessageKey = keyof typeof MESSAGES

export function msg(locale: ServerLocale, key: MessageKey, params: Record<string, string | number> = {}): string {
  return MESSAGES[key][locale].replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m))
}

/** H3 error whose `message` (shown by the UI) is localised; statusMessage
 * stays ASCII because it travels in the HTTP status line. */
export function appError(
  statusCode: number,
  locale: ServerLocale,
  key: MessageKey,
  params?: Record<string, string | number>,
  cause?: unknown,
): Error {
  return createError({ statusCode, statusMessage: key, message: msg(locale, key, params), cause })
}
