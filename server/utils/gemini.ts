import type { Business, ProcessResultBody, ProductIdea, ReviewSnippet } from '#shared/types/business'
import { isRetryable, upstreamError, withRetry } from './upstream'

// One generation normally takes 10–30 s. Without a ceiling a stalled request
// left the "Üretiliyor…" button spinning indefinitely.
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

function parseReviews(reviewsJson: string | null): ReviewSnippet[] {
  if (!reviewsJson) return []
  try {
    const parsed = JSON.parse(reviewsJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatReviews(business: Business): string {
  const reviews = parseReviews(business.reviews_json)
  if (reviews.length === 0) return '- Müşteri yorumları: yok'
  const lines = reviews.map(r => `  - (${r.rating}/5) ${r.text.replace(/\s+/g, ' ').trim()}`)
  return `- Müşteri yorumlarından örnekler (işletmenin güçlü/zayıf yönlerini ve ihtiyaçlarını anlamak için kullan, aynen alıntılama):\n${lines.join('\n')}`
}

export function buildPrompt(business: Business): string {
  return `Sen, yerel işletmelere özel dijital çözümler geliştiren bağımsız bir yazılımcı/serbest çalışan için saha satış asistanısın. Bu yazılımcı büyük bir şirket ya da ekip değil — tek başına çalışan biri olabilir. Aşağıdaki işletme için TÜM çıktıyı TÜRKÇE üret.

İşletme verisi:
- İsim: ${business.name}
- Kategori: ${business.category ?? 'bilinmiyor'}
- Adres: ${business.address ?? 'bilinmiyor'}
- Telefon: ${business.phone ?? 'yok'}
- Mevcut website: ${business.website_url ?? 'yok'}
- Google puanı: ${business.rating ?? 'yok'} (${business.review_count ?? 0} yorum)
${formatReviews(business)}

ÖNEMLİ — pitch_script_md için kesin kural:
- Var olmayan bir şirket/ekip/marka ismi UYDURMA (örn. "X şirketinden geliyorum", "Y ekibindenim" gibi ifadeler YASAK).
- Konuşmacının kim olduğuna dair nötr ve kişisel bir açılış kullan — örneğin "Merhaba, yerel işletmelere özel yazılım çözümleri geliştiren bağımsız bir yazılımcıyım" gibi. Bu ifade hem tek başına çalışan bir yazılımcı hem de küçük bir ekip tarafından rahatça kullanılabilmeli.
- Script'i okuyan kişi kendi ismini/varsa işletmesinin adını açılışa kolayca ekleyebilmeli.

Üretilecek alanlar:
- profile_md: işletmenin ne iş yaptığı ve öne çıkan noktalarını özetleyen 4-6 cümlelik profil
- pitch_script_md: kapıdan girerken kullanılacak, konuşma diliyle tek sayfalık genel sözlü pitch (açılış cümlesi, işletmeye özel değer önerisi, olası itiraz karşılama, kapanış). Bu script belirli bir ürüne kilitlenmesin, birden fazla çözüm önerebileceğini ima etsin.
- ideas: bu işletmeye özel 2-3 farklı yazılım/ürün fikri. Her fikir için:
  - title: kısa başlık (örn. "QR Menü + Yönetilebilir Web Sitesi", "Randevu ve Hatırlatma Sistemi")
  - description: 1-2 cümlede bu çözümün işletmeye ne kazandıracağı
  - price_estimate: aşağıdaki fiyatlandırma kuralına göre belirle
  - needs_cms: bu fikir işletmenin içeriği (menü, kampanya, randevu vb.) kendi başına sık sık güncelleyebileceği bir yönetim paneli/CMS mi gerektiriyor, yoksa tek seferlik statik bir yapım mı yeterli (true/false)
  - build_prompt: bu fikri hayata geçirecek bir yazılımcıya ya da başka bir AI'ya verilebilecek, bu işletmeye özel hazır yapım promptu. needs_cms true ise promptta içerik yönetim paneli/CMS ihtiyacını açıkça belirt.

ÖNEMLİ — fikirler GERÇEK yazılım geliştirme işi olmalı:
- Sadece bir WhatsApp numarasına veya Google yorum sayfasına yönlendiren bir QR kod, TEK BAŞINA bir fikir/ürün DEĞİLDİR — bunu üretmek neredeyse sıfır efor gerektirir (bir QR kod üreticisiyle 30 saniyede yapılır), bunu ayrı bir "proje" gibi sunma veya fiyatlandırma.
- Bu tarz bir QR yönlendirmesi ancak daha büyük bir fikrin (örn. QR menü sisteminin) içinde küçük bir özellik olarak yer alabilir, kendi başına fikir olamaz.

ÖNEMLİ — fiyatlandırma gerçekçi ve efora orantılı olmalı, her şeyi "proje" gibi pahalı gösterme:
- Çok basit, tek sayfalık statik yapılar (sadece adres/telefon/harita/WhatsApp butonu olan dijital kartvizit gibi): 500-1.200 TL tek seferlik
- Orta karmaşıklıkta statik yapı (çok bölümlü tek sayfa, görsel galeri, form): 1.200-2.500 TL tek seferlik
- Yönetim panelli/CMS gerektiren sistem (kendi güncelleyebileceği menü, randevu, stok vb.): 3.000-6.000 TL kurulum + aylık 300-750 TL
- Entegrasyon gerektiren daha kapsamlı sistem (otomatik bildirim, çoklu panel, WhatsApp API entegrasyonu): 5.000-10.000 TL

Fikir üretirken KESİNLİKLE ÖNERME:
- E-ticaret / online satış-sepet sistemi
- Karmaşık muhasebe, ERP veya finans yazılımları
- Sadece bir dış linke (WhatsApp, Google yorum vb.) yönlendiren tek başına bir QR kod

Bunun yerine şuna benzer basit, uygulanabilir fikirlere odaklan: QR menü, randevu/rezervasyon sistemi, sıra yönetimi, stok/envanter takibi, müşteri sadakat programı, hatırlatma/bildirim sistemi, dijital katalog, geri bildirim/değerlendirme toplama sistemi, içeriği kendi güncelleyebileceği kurumsal bir web sitesi.

En az bir fikir needs_cms=true olmalı, en az bir fikir needs_cms=false olmalı — ama bunu zorla dağıtma, işletmenin gerçek ihtiyacına göre karar ver. Fikirlerden en az biri işletmenin kategorisine (${business.category ?? 'bilinmiyor'}) özel, gerçekten anlamlı olmalı — genel geçer önerilerden kaçın.`
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

function invalidResponse(message: string): Error {
  return createError({ statusCode: 502, statusMessage: 'Invalid Gemini response', message })
}

export async function processBusinessWithGemini(business: Business, apiKey: string): Promise<ProcessResultBody> {
  const prompt = buildPrompt(business)

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
  if (!response) {
    throw upstreamError('Gemini', lastError)
  }

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw invalidResponse('Gemini boş yanıt döndürdü, tekrar dene.')
  }

  let parsed: ProcessResultBody
  try {
    parsed = JSON.parse(text)
  } catch {
    throw invalidResponse('Gemini yanıtı geçerli JSON değil, tekrar dene.')
  }

  if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
    throw invalidResponse('Gemini fikir listesi döndürmedi, tekrar dene.')
  }

  return {
    profile_md: parsed.profile_md,
    pitch_script_md: parsed.pitch_script_md,
    ideas: parsed.ideas as ProductIdea[],
  }
}
