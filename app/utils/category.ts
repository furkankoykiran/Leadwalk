// Google Places (New) type strings -> Turkish label + icon group.
// https://developers.google.com/maps/documentation/places/web-service/place-types
// Icon names correspond to AppIcon.vue — grouped into broad visual buckets
// rather than one icon per exact Google type (there are ~40 of those).
export type CategoryIconName = 'food' | 'lodging' | 'venue' | 'shopping' | 'health' | 'briefcase' | 'wrench' | 'building'

const CATEGORY_META: Record<string, { label: string; icon: CategoryIconName }> = {
  restaurant: { label: 'Restoran', icon: 'food' },
  cafe: { label: 'Kafe', icon: 'food' },
  coffee_shop: { label: 'Kahveci', icon: 'food' },
  bakery: { label: 'Fırın', icon: 'food' },
  kebab_shop: { label: 'Kebapçı', icon: 'food' },
  bar: { label: 'Bar', icon: 'food' },
  night_club: { label: 'Gece Kulübü', icon: 'food' },

  hotel: { label: 'Otel', icon: 'lodging' },

  wedding_venue: { label: 'Düğün Salonu', icon: 'venue' },
  movie_theater: { label: 'Sinema', icon: 'venue' },
  amusement_park: { label: 'Eğlence Parkı', icon: 'venue' },

  shopping_mall: { label: 'AVM', icon: 'shopping' },
  grocery_store: { label: 'Market', icon: 'shopping' },
  food_store: { label: 'Gıda Mağazası', icon: 'shopping' },
  home_goods_store: { label: 'Ev Eşyası Mağazası', icon: 'shopping' },
  furniture_store: { label: 'Mobilya Mağazası', icon: 'shopping' },
  warehouse_store: { label: 'Toptan Market', icon: 'shopping' },
  clothing_store: { label: 'Giyim Mağazası', icon: 'shopping' },
  electronics_store: { label: 'Elektronik Mağazası', icon: 'shopping' },
  jewelry_store: { label: 'Kuyumcu', icon: 'shopping' },
  pet_store: { label: 'Petshop', icon: 'shopping' },
  florist: { label: 'Çiçekçi', icon: 'shopping' },
  book_store: { label: 'Kitapçı', icon: 'shopping' },
  car_dealer: { label: 'Oto Galeri', icon: 'shopping' },

  hospital: { label: 'Hastane', icon: 'health' },
  dentist: { label: 'Diş Hekimi', icon: 'health' },
  doctor: { label: 'Doktor', icon: 'health' },
  pharmacy: { label: 'Eczane', icon: 'health' },

  corporate_office: { label: 'Ofis', icon: 'briefcase' },
  government_office: { label: 'Devlet Dairesi', icon: 'briefcase' },
  local_government_office: { label: 'Belediye', icon: 'briefcase' },
  lawyer: { label: 'Avukat', icon: 'briefcase' },
  real_estate_agency: { label: 'Emlak', icon: 'briefcase' },
  insurance_agency: { label: 'Sigorta Acentesi', icon: 'briefcase' },
  travel_agency: { label: 'Seyahat Acentesi', icon: 'briefcase' },
  bank: { label: 'Banka', icon: 'briefcase' },
  association_or_organization: { label: 'Dernek/Kurum', icon: 'briefcase' },

  car_repair: { label: 'Oto Tamirci', icon: 'wrench' },
  service: { label: 'Hizmet', icon: 'wrench' },
  hair_care: { label: 'Kuaför', icon: 'wrench' },
  hair_salon: { label: 'Kuaför', icon: 'wrench' },
  beauty_salon: { label: 'Güzellik Salonu', icon: 'wrench' },
  gym: { label: 'Spor Salonu', icon: 'wrench' },
}

// Display-only labels for types Google commonly returns as a place's
// primaryType but which are deliberately NOT offered in the discovery
// dropdown (sending an unsupported value as includedTypes makes Google reject
// the whole search). Without these the UI fell back to English, e.g.
// "Gift Shop" or "Yoga Studio", in an otherwise Turkish interface.
const DISPLAY_ONLY_META: Record<string, { label: string; icon: CategoryIconName }> = {
  fast_food_restaurant: { label: 'Fast Food', icon: 'food' },
  meal_takeaway: { label: 'Paket Servis', icon: 'food' },
  pizza_restaurant: { label: 'Pizzacı', icon: 'food' },
  breakfast_restaurant: { label: 'Kahvaltı Salonu', icon: 'food' },
  dessert_shop: { label: 'Tatlıcı', icon: 'food' },
  ice_cream_shop: { label: 'Dondurmacı', icon: 'food' },
  tea_house: { label: 'Çay Evi', icon: 'food' },
  pub: { label: 'Pub', icon: 'food' },

  guest_house: { label: 'Pansiyon', icon: 'lodging' },
  hostel: { label: 'Hostel', icon: 'lodging' },
  lodging: { label: 'Konaklama', icon: 'lodging' },

  event_venue: { label: 'Etkinlik Mekânı', icon: 'venue' },
  banquet_hall: { label: 'Davet Salonu', icon: 'venue' },
  art_gallery: { label: 'Sanat Galerisi', icon: 'venue' },
  museum: { label: 'Müze', icon: 'venue' },
  monument: { label: 'Anıt', icon: 'venue' },
  historical_landmark: { label: 'Tarihi Yer', icon: 'venue' },
  tourist_attraction: { label: 'Turistik Yer', icon: 'venue' },

  store: { label: 'Mağaza', icon: 'shopping' },
  supermarket: { label: 'Süpermarket', icon: 'shopping' },
  convenience_store: { label: 'Bakkal', icon: 'shopping' },
  gift_shop: { label: 'Hediyelik Eşya', icon: 'shopping' },
  shoe_store: { label: 'Ayakkabı Mağazası', icon: 'shopping' },
  hardware_store: { label: 'Hırdavat', icon: 'shopping' },
  cell_phone_store: { label: 'Telefoncu', icon: 'shopping' },
  auto_parts_store: { label: 'Oto Yedek Parça', icon: 'shopping' },
  car_rental: { label: 'Araç Kiralama', icon: 'wrench' },
  sporting_goods_store: { label: 'Spor Malzemeleri', icon: 'shopping' },
  department_store: { label: 'Büyük Mağaza', icon: 'shopping' },

  general_hospital: { label: 'Hastane', icon: 'health' },
  health: { label: 'Sağlık', icon: 'health' },
  medical_clinic: { label: 'Klinik', icon: 'health' },
  dental_clinic: { label: 'Diş Kliniği', icon: 'health' },
  medical_lab: { label: 'Tıbbi Laboratuvar', icon: 'health' },
  physiotherapist: { label: 'Fizyoterapist', icon: 'health' },
  veterinary_care: { label: 'Veteriner', icon: 'health' },

  educational_institution: { label: 'Eğitim Kurumu', icon: 'briefcase' },
  academic_department: { label: 'Akademik Birim', icon: 'briefcase' },
  library: { label: 'Kütüphane', icon: 'briefcase' },
  garden: { label: 'Bahçe', icon: 'venue' },
  consultant: { label: 'Danışmanlık', icon: 'briefcase' },
  accounting: { label: 'Muhasebe', icon: 'briefcase' },
  courier_service: { label: 'Kargo/Kurye', icon: 'briefcase' },

  transportation_service: { label: 'Ulaşım Hizmeti', icon: 'wrench' },
  moving_company: { label: 'Nakliyat', icon: 'wrench' },
  general_contractor: { label: 'Müteahhit', icon: 'wrench' },
  electrician: { label: 'Elektrikçi', icon: 'wrench' },
  plumber: { label: 'Tesisatçı', icon: 'wrench' },
  painter: { label: 'Boyacı', icon: 'wrench' },
  laundry: { label: 'Çamaşırhane', icon: 'wrench' },
  car_wash: { label: 'Oto Yıkama', icon: 'wrench' },
  barber_shop: { label: 'Berber', icon: 'wrench' },
  nail_salon: { label: 'Manikür Salonu', icon: 'wrench' },
  spa: { label: 'Spa', icon: 'wrench' },
  massage: { label: 'Masaj Salonu', icon: 'wrench' },
  yoga_studio: { label: 'Yoga Stüdyosu', icon: 'wrench' },
  fitness_center: { label: 'Fitness Merkezi', icon: 'wrench' },
  sports_club: { label: 'Spor Kulübü', icon: 'wrench' },
}

function metaFor(category: string): { label: string; icon: CategoryIconName } | undefined {
  return CATEGORY_META[category] ?? DISPLAY_ONLY_META[category]
}

// categoryOptionsList() dedupes by label so aliases (e.g. hair_care /
// hair_salon both meaning "Kuaför") don't produce two identical dropdown
// entries — only one value per distinct label is kept.

function humanize(raw: string): string {
  return raw.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function categoryLabel(category: string | null): string {
  if (!category) return 'Diğer'
  return metaFor(category)?.label ?? humanize(category)
}

export function categoryIconName(category: string | null): CategoryIconName {
  if (!category) return 'building'
  return metaFor(category)?.icon ?? 'building'
}

/** Curated subset of Google Place Types (New) offered in the discovery
 * category dropdown, sorted alphabetically by Turkish label. */
export function categoryOptionsList(): Array<{ value: string; label: string }> {
  const seenLabels = new Set<string>()
  const options: Array<{ value: string; label: string }> = []
  for (const [value, meta] of Object.entries(CATEGORY_META)) {
    if (seenLabels.has(meta.label)) continue
    seenLabels.add(meta.label)
    options.push({ value, label: meta.label })
  }
  return options.sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}
