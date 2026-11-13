import type { Business, BusinessSignals, OpeningHours, ProcessResultBody, ProductIdea, ReviewSnippet, ReviewSummary } from '#shared/types/business'
import { formatOpeningHours } from '#shared/utils/hours'
import { parseJson } from '#shared/utils/opportunity'
import type { ServerLocale } from './locale'
import { LOCALE_INFO } from '#shared/locales'
import { appError } from './locale'
import { isRetryable, upstreamError, withRetry } from './upstream'

// Languages with a hand-written prompt. Any other UI language uses the
// English prompt and is told which language to write in.
type PromptLanguage = 'en' | 'tr'

// One generation normally takes 10–30 s. Without a ceiling a stalled request
// left the "generating…" button spinning indefinitely.
const GEMINI_TIMEOUT_MS = 45_000

// Tried in order. The lite model is only used when the primary one is
// overloaded or rate-limited (both are on the free tier); in a live test
// gemini-flash-latest returned 503 for minutes while the lite one answered.
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'] as const

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    profile_md: { type: 'STRING' },
    pitch_script_md: { type: 'STRING' },
    ideas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          price_estimate: { type: 'STRING' },
          needs_cms: { type: 'BOOLEAN' },
          build_prompt: { type: 'STRING' },
        },
        required: ['title', 'description', 'price_estimate', 'needs_cms', 'build_prompt'],
      },
    },
  },
  required: ['profile_md', 'pitch_script_md', 'ideas'],
}

const SIGNAL_LABELS: Record<keyof BusinessSignals, { en: string; tr: string }> = {
  reservable: { en: 'takes reservations', tr: 'rezervasyon alıyor' },
  delivery: { en: 'delivers', tr: 'paket servis/teslimat yapıyor' },
  takeout: { en: 'offers takeout', tr: 'gel-al hizmeti var' },
  dine_in: { en: 'dine-in', tr: 'içeride oturma var' },
  serves_breakfast: { en: 'serves breakfast', tr: 'kahvaltı servisi var' },
  serves_lunch: { en: 'serves lunch', tr: 'öğle yemeği servisi var' },
  serves_dinner: { en: 'serves dinner', tr: 'akşam yemeği servisi var' },
  serves_coffee: { en: 'serves coffee', tr: 'kahve servisi var' },
  serves_beer: { en: 'serves beer', tr: 'bira servisi var' },
  serves_wine: { en: 'serves wine', tr: 'şarap servisi var' },
  outdoor_seating: { en: 'has outdoor seating', tr: 'açık alanda oturma var' },
  good_for_groups: { en: 'good for groups', tr: 'gruplar için uygun' },
  accepts_credit_cards: { en: 'accepts cards', tr: 'kart kabul ediyor' },
  accepts_nfc: { en: 'accepts contactless/NFC', tr: 'temassız ödeme kabul ediyor' },
  cash_only: { en: 'cash only', tr: 'yalnızca nakit' },
}

function describeSignals(signals: BusinessSignals, locale: PromptLanguage): string | null {
  const known = (Object.entries(signals) as Array<[keyof BusinessSignals, boolean]>)
    .map(([key, value]) => {
      const label = SIGNAL_LABELS[key]?.[locale]
      if (!label) return null
      return value ? label : (locale === 'tr' ? `${label}: hayır` : `not ${label}`)
    })
    .filter((x): x is string => !!x)
  return known.length > 0 ? known.join('; ') : null
}

function formatReviews(reviews: ReviewSnippet[], locale: PromptLanguage): string {
  if (reviews.length === 0) return locale === 'tr' ? '- Müşteri yorumları: yok' : '- Customer reviews: none'
  const lines = reviews.map(r => `  - (${r.rating}/5) ${r.text.replace(/\s+/g, ' ').trim()}`)
  const header = locale === 'tr'
    ? '- Müşteri yorumlarından örnekler (güçlü/zayıf yönleri ve ihtiyaçları anlamak için kullan, aynen alıntılama):'
    : '- Sample customer reviews (use them to understand strengths, weaknesses and needs; do not quote them verbatim):'
  return `${header}\n${lines.join('\n')}`
}

function businessFacts(business: Business, locale: PromptLanguage): string {
  const tr = locale === 'tr'
  const unknown = tr ? 'bilinmiyor' : 'unknown'
  const none = tr ? 'yok' : 'none'
  const hours = parseJson<OpeningHours | null>(business.opening_hours_json, null)
  const signals = describeSignals(parseJson<BusinessSignals>(business.signals_json, {}), locale)
  const summary = parseJson<ReviewSummary | null>(business.review_summary_json, null)
  const facts = [
    `- ${tr ? 'İsim' : 'Name'}: ${business.name}`,
    `- ${tr ? 'Kategori' : 'Category'}: ${(business.google_locale === locale ? business.type_label : null) ?? business.category ?? unknown}`,
    `- ${tr ? 'Adres' : 'Address'}: ${business.address ?? unknown}`,
    `- ${tr ? 'Telefon' : 'Phone'}: ${business.phone ?? none}`,
    `- ${tr ? 'Mevcut website' : 'Current website'}: ${business.website_url ?? none}`,
    `- ${tr ? 'Google puanı' : 'Google rating'}: ${business.rating ?? none} (${business.review_count ?? 0} ${tr ? 'yorum' : 'reviews'})`,
  ]
  if (business.price_level) facts.push(`- ${tr ? 'Fiyat seviyesi' : 'Price level'}: ${business.price_level.replace('PRICE_LEVEL_', '').toLowerCase()}`)
  if (business.google_status === 'FUTURE_OPENING') facts.push(tr ? '- Durum: henüz açılmadı (yakında açılıyor)' : '- Status: not open yet (opening soon)')
  const formatted = formatOpeningHours(hours, LOCALE_INFO[locale].intl)
  if (formatted) {
    const closed = tr ? 'kapalı' : 'closed'
    const text = formatted.allDay
      ? (tr ? '7/24 açık' : 'open 24/7')
      : formatted.days.map(d => `${d.name}: ${d.ranges.join(', ') || closed}`).join('; ')
    facts.push(`- ${tr ? 'Çalışma saatleri' : 'Opening hours'}: ${text}`)
  }
  if (signals) facts.push(`- ${tr ? 'Google\'daki hizmet bilgileri' : 'Service details on Google'}: ${signals}`)
  if (business.editorial_summary) facts.push(`- ${tr ? 'Google açıklaması' : 'Google description'}: ${business.editorial_summary}`)
  if (summary) facts.push(`- ${tr ? 'Google\'ın yorum özeti' : 'Google review summary'}: ${summary.text}`)
  facts.push(formatReviews(parseJson<ReviewSnippet[]>(business.reviews_json, []), locale))
  return facts.join('\n')
}

function buildPromptTr(business: Business): string {
  return `Sen, yerel işletmelere özel dijital çözümler geliştiren bağımsız bir yazılımcı/serbest çalışan için saha satış asistanısın. Bu yazılımcı büyük bir şirket ya da ekip değil — tek başına çalışan biri olabilir. Aşağıdaki işletme için TÜM çıktıyı TÜRKÇE üret.

İşletme verisi:
${businessFacts(business, 'tr')}

ÖNEMLİ — pitch_script_md için kesin kural:
- Var olmayan bir şirket/ekip/marka ismi UYDURMA (örn. "X şirketinden geliyorum", "Y ekibindenim" gibi ifadeler YASAK).
- Konuşmacının kim olduğuna dair nötr ve kişisel bir açılış kullan — örneğin "Merhaba, yerel işletmelere özel yazılım çözümleri geliştiren bağımsız bir yazılımcıyım" gibi.
- Script'i okuyan kişi kendi ismini/varsa işletmesinin adını açılışa kolayca ekleyebilmeli.
- Sıcak, saygılı ve baskısız ol: önce küçük bir "evet" iste (örn. 1 dakikalık bir göz atma), satışı zorlama.

Üretilecek alanlar:
- profile_md: işletmenin ne iş yaptığı ve öne çıkan noktalarını özetleyen 4-6 cümlelik profil
- pitch_script_md: kapıdan girerken kullanılacak, konuşma diliyle tek sayfalık genel sözlü pitch (açılış cümlesi, işletmeye özel değer önerisi, olası itiraz karşılama, kapanış). Belirli bir ürüne kilitlenmesin, birden fazla çözüm önerebileceğini ima etsin.
- ideas: bu işletmeye özel 2-3 farklı yazılım/ürün fikri. Her fikir için:
  - title: kısa başlık (örn. "QR Menü + Yönetilebilir Web Sitesi", "Randevu ve Hatırlatma Sistemi")
  - description: 1-2 cümlede bu çözümün işletmeye ne kazandıracağı
  - price_estimate: aşağıdaki fiyatlandırma kuralına göre belirle
  - needs_cms: içeriği (menü, kampanya, randevu vb.) kendi güncelleyebileceği bir yönetim paneli gerekiyor mu (true/false)
  - build_prompt: bu fikri hayata geçirecek bir yazılımcıya ya da başka bir AI'ya verilebilecek, bu işletmeye özel hazır yapım promptu. needs_cms true ise yönetim paneli ihtiyacını açıkça belirt.

Google verisini kullan: rezervasyon almıyorsa randevu/rezervasyon sistemi, yalnızca nakit çalışıyorsa ödeme kolaylığı, içeride oturma varsa QR menü, henüz açılmadıysa açılış öncesi dijital kurulum gibi bağlantıları kur. Bilinmeyen bir bilgiyi "yok" sayma.

ÖNEMLİ — fikirler GERÇEK yazılım geliştirme işi olmalı:
- Sadece bir WhatsApp numarasına veya Google yorum sayfasına yönlendiren bir QR kod TEK BAŞINA bir fikir DEĞİLDİR; ancak daha büyük bir fikrin içinde küçük bir özellik olabilir.

ÖNEMLİ — fiyatlandırma gerçekçi ve efora orantılı olmalı:
- Çok basit, tek sayfalık statik yapılar (dijital kartvizit gibi): 500-1.200 TL tek seferlik
- Orta karmaşıklıkta statik yapı (çok bölümlü tek sayfa, galeri, form): 1.200-2.500 TL tek seferlik
- Yönetim panelli sistem (menü, randevu, stok vb.): 3.000-6.000 TL kurulum + aylık 300-750 TL
- Entegrasyon gerektiren kapsamlı sistem (otomatik bildirim, çoklu panel, WhatsApp API): 5.000-10.000 TL
- İşletme Türkiye dışındaysa fiyatları o ülkenin para birimine ve yerel seviyesine uyarla.

KESİNLİKLE ÖNERME: e-ticaret/sepet sistemi; karmaşık muhasebe, ERP veya finans yazılımı; tek başına bir dış linke yönlendiren QR kod.

En az bir fikir needs_cms=true, en az bir fikir needs_cms=false olsun — ama işletmenin gerçek ihtiyacına göre karar ver. Fikirlerden en az biri işletmenin kategorisine özel ve gerçekten anlamlı olmalı.`
}

function buildPromptEn(business: Business, language = 'English'): string {
  return `You are a field-sales assistant for an independent developer/freelancer who builds small custom software for local businesses. They are not a big company or agency — possibly one person. Write ALL output in ${language.toUpperCase()}.

Business data:
${businessFacts(business, 'en')}

IMPORTANT — strict rules for pitch_script_md:
- NEVER invent a company, team or brand name (no "I'm from X agency").
- Use a neutral, personal opener such as "Hi, I'm an independent developer who builds simple software for local businesses."
- The reader must be able to drop their own name (and business, if any) into the opener easily.
- Be warm, respectful and low-pressure: ask for a small "yes" first (e.g. a one-minute look), never push the sale.

Fields to produce:
- profile_md: a 4–6 sentence profile of what the business does and what stands out
- pitch_script_md: a one-page, conversational door-opening pitch (opener, value specific to this business, handling a likely objection, close). Do not lock onto one product; hint that several solutions are possible.
- ideas: 2–3 different software/product ideas specific to this business. For each:
  - title: short title (e.g. "QR Menu + Editable Website", "Booking and Reminder System")
  - description: in 1–2 sentences, what it gives the business
  - price_estimate: follow the pricing rule below
  - needs_cms: does it need an admin panel the owner updates themselves (menu, offers, bookings…) (true/false)
  - build_prompt: a ready-to-use build brief for a developer or another AI, specific to this business. If needs_cms is true, say clearly that an admin panel is required.

Use the Google data: no reservations → booking system; cash only → easier payments; dine-in → QR menu; not open yet → pre-launch digital setup. Treat unknown information as unknown, not as "no".

IMPORTANT — ideas must be REAL software work:
- A QR code that only points to a WhatsApp number or a Google review page is NOT an idea on its own; it can only be a small feature of a bigger idea.

IMPORTANT — pricing must be realistic and proportional to effort. Reference bands for Türkiye (Turkish lira):
- Very simple one-page static site (digital business card): 500–1,200 TL one-off
- Medium static site (multi-section page, gallery, form): 1,200–2,500 TL one-off
- System with an admin panel (menu, bookings, stock…): 3,000–6,000 TL setup + 300–750 TL/month
- Larger system with integrations (automatic notifications, several panels, WhatsApp API): 5,000–10,000 TL
- If the business is outside Türkiye, convert to its local currency at a realistic local level.

NEVER suggest: e-commerce/shopping-cart systems; complex accounting, ERP or finance software; a standalone QR code that only links elsewhere.

At least one idea should have needs_cms=true and at least one needs_cms=false — but decide by the business's real needs. At least one idea must be specific to this business's category and genuinely useful.`
}

export function buildPrompt(business: Business, locale: ServerLocale = 'tr'): string {
  return locale === 'tr' ? buildPromptTr(business) : buildPromptEn(business, LOCALE_INFO[locale].english)
}

interface GenerateContentResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

function generateContent(model: string, prompt: string, apiKey: string): Promise<GenerateContentResponse> {
  return $fetch<GenerateContentResponse>(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey },
    timeout: GEMINI_TIMEOUT_MS,
    body: {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    },
  })
}

export async function processBusinessWithGemini(business: Business, apiKey: string, locale: ServerLocale): Promise<ProcessResultBody> {
  const prompt = buildPrompt(business, locale)

  let response: GenerateContentResponse | undefined
  let lastError: unknown
  for (const model of GEMINI_MODELS) {
    try {
      // Gemini regularly answers 503 ("model overloaded") or 429 for a while;
      // a spaced retry rides out short blips, and the next model in the list
      // covers longer outages of the primary one.
      response = await withRetry(() => generateContent(model, prompt, apiKey), [3000])
      break
    } catch (error) {
      lastError = error
      if (!isRetryable(error)) break
    }
  }
  if (!response) throw upstreamError('Gemini', lastError, locale)

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw appError(502, locale, 'geminiEmpty')

  let parsed: ProcessResultBody
  try {
    parsed = JSON.parse(text)
  } catch {
    throw appError(502, locale, 'geminiBadJson')
  }

  if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) throw appError(502, locale, 'geminiNoIdeas')

  return {
    profile_md: parsed.profile_md,
    pitch_script_md: parsed.pitch_script_md,
    ideas: parsed.ideas as ProductIdea[],
  }
}
