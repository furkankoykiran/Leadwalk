import { opportunityScore } from '#shared/utils/opportunity'
import { listBusinesses, todayString } from '../../utils/db'
import { getLocale, getTimeZone } from '../../utils/locale'

const HEADERS = {
  en: ['Name', 'Category', 'Stage', 'Opportunity score', 'Phone', 'Website', 'Address', 'Area', 'Rating', 'Reviews', 'Follow-up', 'Deal value', 'Google Maps', 'Discovered'],
  tr: ['İsim', 'Kategori', 'Aşama', 'Fırsat skoru', 'Telefon', 'Website', 'Adres', 'Bölge', 'Puan', 'Yorum sayısı', 'Takip', 'Anlaşma tutarı', 'Google Haritalar', 'Keşif tarihi'],
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  // Neutralise spreadsheet formulas (CSV injection) and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** CSV of every lead, for backups or a spreadsheet. UTF-8 with a BOM so
 * Excel opens Turkish characters correctly. */
export default defineEventHandler((event) => {
  const locale = getLocale(event)
  const ids = String(getQuery(event).ids ?? '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0)
  const rows = listBusinesses().filter(b => ids.length === 0 || ids.includes(b.id))

  const lines = [HEADERS[locale].join(',')]
  for (const b of rows) {
    lines.push([
      b.name, b.type_label ?? b.category, b.status, opportunityScore(b).score, b.international_phone ?? b.phone,
      b.website_url, b.address, b.district, b.rating, b.review_count, b.follow_up_at, b.deal_value,
      b.maps_uri, b.discovered_at,
    ].map(cell).join(','))
  }

  const date = todayString(new Date(), getTimeZone(event))
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="leads-${date}.csv"`)
  const BOM = String.fromCharCode(0xfeff)
  return BOM + lines.join('\r\n') + '\r\n'
})
