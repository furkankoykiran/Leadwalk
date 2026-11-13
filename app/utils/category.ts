// Google Places (New) type strings -> localised label + icon group.
// https://developers.google.com/maps/documentation/places/web-service/place-types
// Icon names correspond to AppIcon.vue — grouped into broad visual buckets
// rather than one icon per exact Google type.
import type { Locale } from '#shared/locales'

export type CategoryIconName = 'food' | 'lodging' | 'venue' | 'shopping' | 'health' | 'briefcase' | 'wrench' | 'building'

// One label per language in shared/locales.ts — a missing one is a type error.
type CategoryMeta = Record<Locale, string> & { icon: CategoryIconName }

const OTHER: Record<Locale, string> = { en: 'Other', tr: 'Diğer' }

// Offered in the discovery dropdown — every key must be a valid
// `includedTypes` value for Nearby Search (an invalid one fails the search).
const CATEGORY_META: Record<string, CategoryMeta> = {
  restaurant: { en: 'Restaurant', tr: 'Restoran', icon: 'food' },
  cafe: { en: 'Café', tr: 'Kafe', icon: 'food' },
  coffee_shop: { en: 'Coffee shop', tr: 'Kahveci', icon: 'food' },
  bakery: { en: 'Bakery', tr: 'Fırın', icon: 'food' },
  kebab_shop: { en: 'Kebab shop', tr: 'Kebapçı', icon: 'food' },
  bar: { en: 'Bar', tr: 'Bar', icon: 'food' },
  night_club: { en: 'Night club', tr: 'Gece Kulübü', icon: 'food' },

  hotel: { en: 'Hotel', tr: 'Otel', icon: 'lodging' },

  wedding_venue: { en: 'Wedding venue', tr: 'Düğün Salonu', icon: 'venue' },
  movie_theater: { en: 'Cinema', tr: 'Sinema', icon: 'venue' },
  amusement_park: { en: 'Amusement park', tr: 'Eğlence Parkı', icon: 'venue' },

  shopping_mall: { en: 'Shopping mall', tr: 'AVM', icon: 'shopping' },
  grocery_store: { en: 'Grocery', tr: 'Market', icon: 'shopping' },
  food_store: { en: 'Food store', tr: 'Gıda Mağazası', icon: 'shopping' },
  home_goods_store: { en: 'Home goods', tr: 'Ev Eşyası Mağazası', icon: 'shopping' },
  furniture_store: { en: 'Furniture store', tr: 'Mobilya Mağazası', icon: 'shopping' },
  warehouse_store: { en: 'Wholesale store', tr: 'Toptan Market', icon: 'shopping' },
  clothing_store: { en: 'Clothing store', tr: 'Giyim Mağazası', icon: 'shopping' },
  electronics_store: { en: 'Electronics store', tr: 'Elektronik Mağazası', icon: 'shopping' },
  jewelry_store: { en: 'Jeweller', tr: 'Kuyumcu', icon: 'shopping' },
  pet_store: { en: 'Pet shop', tr: 'Petshop', icon: 'shopping' },
  florist: { en: 'Florist', tr: 'Çiçekçi', icon: 'shopping' },
  book_store: { en: 'Bookshop', tr: 'Kitapçı', icon: 'shopping' },
  car_dealer: { en: 'Car dealer', tr: 'Oto Galeri', icon: 'shopping' },

  hospital: { en: 'Hospital', tr: 'Hastane', icon: 'health' },
  dentist: { en: 'Dentist', tr: 'Diş Hekimi', icon: 'health' },
  doctor: { en: 'Doctor', tr: 'Doktor', icon: 'health' },
  pharmacy: { en: 'Pharmacy', tr: 'Eczane', icon: 'health' },

  corporate_office: { en: 'Office', tr: 'Ofis', icon: 'briefcase' },
  government_office: { en: 'Government office', tr: 'Devlet Dairesi', icon: 'briefcase' },
  local_government_office: { en: 'Municipality', tr: 'Belediye', icon: 'briefcase' },
  lawyer: { en: 'Lawyer', tr: 'Avukat', icon: 'briefcase' },
  real_estate_agency: { en: 'Real estate', tr: 'Emlak', icon: 'briefcase' },
  insurance_agency: { en: 'Insurance agency', tr: 'Sigorta Acentesi', icon: 'briefcase' },
  travel_agency: { en: 'Travel agency', tr: 'Seyahat Acentesi', icon: 'briefcase' },
  bank: { en: 'Bank', tr: 'Banka', icon: 'briefcase' },
  association_or_organization: { en: 'Association', tr: 'Dernek/Kurum', icon: 'briefcase' },

  car_repair: { en: 'Car repair', tr: 'Oto Tamirci', icon: 'wrench' },
  service: { en: 'Service', tr: 'Hizmet', icon: 'wrench' },
  hair_care: { en: 'Hair salon', tr: 'Kuaför', icon: 'wrench' },
  hair_salon: { en: 'Hair salon', tr: 'Kuaför', icon: 'wrench' },
  beauty_salon: { en: 'Beauty salon', tr: 'Güzellik Salonu', icon: 'wrench' },
  gym: { en: 'Gym', tr: 'Spor Salonu', icon: 'wrench' },
}

// Display-only labels for types Google commonly returns as a place's
// primaryType but which are deliberately NOT offered in the discovery
// dropdown (sending an unsupported value as includedTypes makes Google reject
// the whole search). Without these the UI fell back to raw English.
const DISPLAY_ONLY_META: Record<string, CategoryMeta> = {
  fast_food_restaurant: { en: 'Fast food', tr: 'Fast Food', icon: 'food' },
  meal_takeaway: { en: 'Takeaway', tr: 'Paket Servis', icon: 'food' },
  pizza_restaurant: { en: 'Pizzeria', tr: 'Pizzacı', icon: 'food' },
  breakfast_restaurant: { en: 'Breakfast place', tr: 'Kahvaltı Salonu', icon: 'food' },
  dessert_shop: { en: 'Dessert shop', tr: 'Tatlıcı', icon: 'food' },
  ice_cream_shop: { en: 'Ice cream shop', tr: 'Dondurmacı', icon: 'food' },
  tea_house: { en: 'Tea house', tr: 'Çay Evi', icon: 'food' },
  pub: { en: 'Pub', tr: 'Pub', icon: 'food' },

  guest_house: { en: 'Guest house', tr: 'Pansiyon', icon: 'lodging' },
  hostel: { en: 'Hostel', tr: 'Hostel', icon: 'lodging' },
  lodging: { en: 'Lodging', tr: 'Konaklama', icon: 'lodging' },

  event_venue: { en: 'Event venue', tr: 'Etkinlik Mekânı', icon: 'venue' },
  banquet_hall: { en: 'Banquet hall', tr: 'Davet Salonu', icon: 'venue' },
  art_gallery: { en: 'Art gallery', tr: 'Sanat Galerisi', icon: 'venue' },
  museum: { en: 'Museum', tr: 'Müze', icon: 'venue' },
  monument: { en: 'Monument', tr: 'Anıt', icon: 'venue' },
  historical_landmark: { en: 'Historical landmark', tr: 'Tarihi Yer', icon: 'venue' },
  tourist_attraction: { en: 'Tourist attraction', tr: 'Turistik Yer', icon: 'venue' },
  garden: { en: 'Garden', tr: 'Bahçe', icon: 'venue' },

  store: { en: 'Store', tr: 'Mağaza', icon: 'shopping' },
  supermarket: { en: 'Supermarket', tr: 'Süpermarket', icon: 'shopping' },
  convenience_store: { en: 'Corner shop', tr: 'Bakkal', icon: 'shopping' },
  gift_shop: { en: 'Gift shop', tr: 'Hediyelik Eşya', icon: 'shopping' },
  shoe_store: { en: 'Shoe store', tr: 'Ayakkabı Mağazası', icon: 'shopping' },
  hardware_store: { en: 'Hardware store', tr: 'Hırdavat', icon: 'shopping' },
  cell_phone_store: { en: 'Phone shop', tr: 'Telefoncu', icon: 'shopping' },
  auto_parts_store: { en: 'Auto parts', tr: 'Oto Yedek Parça', icon: 'shopping' },
  sporting_goods_store: { en: 'Sporting goods', tr: 'Spor Malzemeleri', icon: 'shopping' },
  department_store: { en: 'Department store', tr: 'Büyük Mağaza', icon: 'shopping' },

  general_hospital: { en: 'Hospital', tr: 'Hastane', icon: 'health' },
  health: { en: 'Health', tr: 'Sağlık', icon: 'health' },
  medical_clinic: { en: 'Clinic', tr: 'Klinik', icon: 'health' },
  dental_clinic: { en: 'Dental clinic', tr: 'Diş Kliniği', icon: 'health' },
  medical_lab: { en: 'Medical lab', tr: 'Tıbbi Laboratuvar', icon: 'health' },
  physiotherapist: { en: 'Physiotherapist', tr: 'Fizyoterapist', icon: 'health' },
  veterinary_care: { en: 'Vet', tr: 'Veteriner', icon: 'health' },

  educational_institution: { en: 'Education', tr: 'Eğitim Kurumu', icon: 'briefcase' },
  academic_department: { en: 'Academic department', tr: 'Akademik Birim', icon: 'briefcase' },
  library: { en: 'Library', tr: 'Kütüphane', icon: 'briefcase' },
  consultant: { en: 'Consulting', tr: 'Danışmanlık', icon: 'briefcase' },
  accounting: { en: 'Accounting', tr: 'Muhasebe', icon: 'briefcase' },
  courier_service: { en: 'Courier', tr: 'Kargo/Kurye', icon: 'briefcase' },

  car_rental: { en: 'Car rental', tr: 'Araç Kiralama', icon: 'wrench' },
  transportation_service: { en: 'Transport service', tr: 'Ulaşım Hizmeti', icon: 'wrench' },
  moving_company: { en: 'Movers', tr: 'Nakliyat', icon: 'wrench' },
  general_contractor: { en: 'Contractor', tr: 'Müteahhit', icon: 'wrench' },
  electrician: { en: 'Electrician', tr: 'Elektrikçi', icon: 'wrench' },
  plumber: { en: 'Plumber', tr: 'Tesisatçı', icon: 'wrench' },
  painter: { en: 'Painter', tr: 'Boyacı', icon: 'wrench' },
  laundry: { en: 'Laundry', tr: 'Çamaşırhane', icon: 'wrench' },
  car_wash: { en: 'Car wash', tr: 'Oto Yıkama', icon: 'wrench' },
  barber_shop: { en: 'Barber', tr: 'Berber', icon: 'wrench' },
  nail_salon: { en: 'Nail salon', tr: 'Manikür Salonu', icon: 'wrench' },
  spa: { en: 'Spa', tr: 'Spa', icon: 'wrench' },
  massage: { en: 'Massage', tr: 'Masaj Salonu', icon: 'wrench' },
  yoga_studio: { en: 'Yoga studio', tr: 'Yoga Stüdyosu', icon: 'wrench' },
  fitness_center: { en: 'Fitness centre', tr: 'Fitness Merkezi', icon: 'wrench' },
  sports_club: { en: 'Sports club', tr: 'Spor Kulübü', icon: 'wrench' },
}

function metaFor(category: string): CategoryMeta | undefined {
  return CATEGORY_META[category] ?? DISPLAY_ONLY_META[category]
}

/** Label for a stored business: Google's own label is only trusted when it
 * is in the UI language (it is stored in the language of discovery). */
export function businessCategory(b: { category: string | null; type_label: string | null; google_locale: string | null }, locale: Locale): string {
  return categoryLabel(b.category, locale, b.google_locale === locale ? b.type_label : null)
}

function humanize(raw: string): string {
  return raw.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/**
 * Label for a Google type in the UI language. Falls back to Google's own
 * localised label captured at discovery (`googleLabel`), then to a
 * humanised type string — never the raw snake_case value.
 */
export function categoryLabel(category: string | null, locale: Locale = 'tr', googleLabel?: string | null): string {
  if (!category) return googleLabel || OTHER[locale]
  return metaFor(category)?.[locale] ?? googleLabel ?? humanize(category)
}

export function categoryIconName(category: string | null): CategoryIconName {
  if (!category) return 'building'
  return metaFor(category)?.icon ?? 'building'
}

/** Curated subset of Google Place Types (New) offered in the discovery
 * category dropdown, deduplicated by label (hair_care / hair_salon) and
 * sorted with the locale's collation. */
export function categoryOptionsList(locale: Locale = 'tr'): Array<{ value: string; label: string }> {
  const seenLabels = new Set<string>()
  const options: Array<{ value: string; label: string }> = []
  for (const [value, meta] of Object.entries(CATEGORY_META)) {
    const label = meta[locale]
    if (seenLabels.has(label)) continue
    seenLabels.add(label)
    options.push({ value, label })
  }
  return options.sort((a, b) => a.label.localeCompare(b.label, locale))
}
