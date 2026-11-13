// Deterministic sample data for the offline E2E tests. Written straight into
// the E2E database through the app's own data layer, so tests exercise the
// real schema without calling Google.
import type { DiscoveredBusiness } from '../shared/types/business'

const HOURS_9_TO_21 = JSON.stringify({
  periods: [1, 2, 3, 4, 5, 6].map(day => ({ open: { day, hour: 9, minute: 0 }, close: { day, hour: 21, minute: 0 } })),
  weekday_descriptions: ['Pazartesi: 09:00–21:00', 'Salı: 09:00–21:00', 'Çarşamba: 09:00–21:00', 'Perşembe: 09:00–21:00', 'Cuma: 09:00–21:00', 'Cumartesi: 09:00–21:00', 'Pazar: Kapalı'],
})

function place(overrides: Partial<DiscoveredBusiness> & Pick<DiscoveredBusiness, 'place_id' | 'name'>): DiscoveredBusiness {
  return {
    category: null,
    type_label: null,
    google_locale: 'tr',
    types_json: null,
    address: 'Kızılay, Çankaya/Ankara, Türkiye',
    district: 'Kızılay, Çankaya',
    phone: '0312 000 00 00',
    international_phone: '+90 312 000 00 00',
    website_url: null,
    maps_uri: null,
    rating: 4.5,
    review_count: 12,
    price_level: null,
    google_status: 'OPERATIONAL',
    lat: 39.9208,
    lng: 32.8541,
    utc_offset_minutes: 180,
    opening_hours_json: null,
    signals_json: null,
    editorial_summary: null,
    review_summary_json: null,
    reviews_json: null,
    ...overrides,
  }
}

export const SAMPLE_PLACES: DiscoveredBusiness[] = [
  place({
    place_id: 'e2e-barber',
    name: 'Usta Berber Salonu',
    category: 'barber_shop',
    type_label: 'Berber',
    rating: 4.9,
    review_count: 14,
    lat: 39.9212,
    lng: 32.8538,
    opening_hours_json: HOURS_9_TO_21,
    signals_json: JSON.stringify({ reservable: false, accepts_credit_cards: true }),
    reviews_json: JSON.stringify([{ author: 'Ayşe', rating: 5, text: 'Randevu almak zor ama çok iyi.', published_at: '2026-10-01T10:00:00Z' }]),
  }),
  place({ place_id: 'e2e-istiklal', name: 'İstiklal Kafe', category: 'cafe', type_label: 'Kafe', rating: 4.4, review_count: 80, lat: 39.9201, lng: 32.8550 }),
  place({ place_id: 'e2e-site', name: 'Kurumsal Hukuk Bürosu', category: 'lawyer', type_label: 'Avukat', website_url: 'https://example.com', rating: 4.1, review_count: 40, lat: 39.9190, lng: 32.8560 }),
  place({ place_id: 'e2e-bakery', name: 'Sabah Fırını', category: 'bakery', type_label: 'Fırın', rating: 4.7, review_count: 6, lat: 39.9225, lng: 32.8525 }),
  place({ place_id: 'e2e-dentist', name: 'Gülüş Diş Kliniği', category: 'dental_clinic', type_label: 'Diş Kliniği', rating: 4.8, review_count: 35, lat: 39.9180, lng: 32.8570 }),
  place({ place_id: 'e2e-closed', name: 'Eski Kırtasiye', category: 'store', type_label: 'Mağaza', google_status: 'CLOSED_TEMPORARILY', rating: 3.9, review_count: 9, lat: 39.9230, lng: 32.8510 }),
]
