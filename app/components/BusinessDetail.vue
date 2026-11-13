<script setup lang="ts">
import type { Business, BusinessStatus, ProductIdea, ReviewSnippet } from '#shared/types/business'

const props = defineProps<{ business: Business }>()
const emit = defineEmits<{ processed: [business: Business]; statusChanged: [business: Business] }>()

const { copiedKey, copy } = useClipboard()
const { refreshUsage } = useUsage()
const processing = ref(false)
const updatingStatus = ref(false)
const errorText = ref<string | null>(null)

const reviews = computed<ReviewSnippet[]>(() => {
  if (!props.business.reviews_json) return []
  try {
    return JSON.parse(props.business.reviews_json)
  } catch {
    return []
  }
})

const ideas = computed<ProductIdea[]>(() => {
  if (!props.business.ideas_json) return []
  try {
    return JSON.parse(props.business.ideas_json)
  } catch {
    return []
  }
})

const sections = computed(() => {
  const b = props.business
  const result: Array<{ key: string; title: string; text: string }> = []
  if (b.profile_md) result.push({ key: 'profile_md', title: 'İşletme Profili', text: b.profile_md })
  if (b.pitch_script_md) result.push({ key: 'pitch_script_md', title: 'Pitch Script', text: b.pitch_script_md })
  return result
})

async function generate() {
  processing.value = true
  errorText.value = null
  try {
    const updated = await $fetch<Business>(`/api/process/${props.business.id}`, { method: 'POST' })
    emit('processed', updated)
  } catch (error) {
    errorText.value = errorMessage(error, 'Üretim başarısız oldu, tekrar dene.')
  } finally {
    processing.value = false
    refreshUsage()
  }
}

async function setStatus(status: BusinessStatus) {
  updatingStatus.value = true
  errorText.value = null
  try {
    const updated = await $fetch<Business>(`/api/businesses/${props.business.id}/status`, {
      method: 'PATCH',
      body: { status },
    })
    emit('statusChanged', updated)
  } catch (error) {
    errorText.value = errorMessage(error, 'Durum güncellenemedi, tekrar dene.')
  } finally {
    updatingStatus.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
      <div class="flex items-start gap-5">
        <div class="w-16 h-16 shrink-0 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
          <AppIcon :name="categoryIconName(business.category)" class="w-8 h-8" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 class="text-2xl font-bold text-zinc-100 tracking-tight">{{ business.name }}</h2>
              <p class="text-amber-400 font-medium text-sm mt-0.5">{{ categoryLabel(business.category) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span
                v-if="!business.website_url"
                class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold bg-amber-500 text-zinc-950"
              >
                <AppIcon name="globe" class="w-3.5 h-3.5" /> Websitesi Yok — Fırsat
              </span>
              <span class="text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap" :class="STATUS_BADGE_CLASSES[business.status]">
                {{ STATUS_LABELS[business.status] }}
              </span>
            </div>
          </div>
          <p class="text-zinc-500 text-sm mt-2">{{ business.address }}</p>

          <div class="flex items-center gap-5 mt-4 pt-4 border-t border-zinc-800 text-sm flex-wrap">
            <span v-if="business.rating" class="flex items-center gap-1.5 text-zinc-300">
              <AppIcon name="star" class="w-4 h-4 text-amber-400" />
              {{ business.rating }}
              <span class="text-zinc-500">({{ business.review_count }} yorum)</span>
            </span>

            <a
              v-if="business.website_url"
              :href="business.website_url"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-1.5 text-amber-400 hover:underline cursor-pointer"
            >
              <AppIcon name="globe" class="w-4 h-4" /> Websitesi var
            </a>

            <a
              v-if="business.phone"
              :href="`tel:${business.phone}`"
              class="flex items-center gap-1.5 text-amber-400 hover:underline cursor-pointer"
            >
              <AppIcon name="phone" class="w-4 h-4" /> {{ business.phone }}
            </a>

            <a
              :href="googleMapsUrl(business)"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-1.5 text-amber-400 hover:underline cursor-pointer ml-auto"
            >
              <AppIcon name="pin" class="w-4 h-4" /> Google Haritalar'da aç
            </a>
          </div>
        </div>
      </div>
    </div>

    <section v-if="reviews.length > 0" class="border border-zinc-800 rounded-2xl p-6 bg-zinc-900">
      <h3 class="font-semibold text-zinc-100 mb-4">Yorumlar</h3>
      <div class="grid sm:grid-cols-2 gap-4">
        <div v-for="(review, i) in reviews" :key="i" class="bg-zinc-800/40 rounded-xl p-4">
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-medium text-zinc-300 text-sm">{{ review.author }}</span>
            <span class="flex items-center gap-0.5">
              <AppIcon v-for="n in Math.round(review.rating)" :key="n" name="star" class="w-3.5 h-3.5 text-amber-400" />
            </span>
          </div>
          <p class="text-zinc-400 text-sm leading-relaxed">{{ review.text }}</p>
        </div>
      </div>
    </section>

    <button
      v-if="ideas.length === 0"
      type="button"
      class="flex items-center gap-2 py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
      :disabled="processing"
      @click="generate"
    >
      <AppIcon name="sparkles" class="w-4 h-4" />
      {{ processing ? 'Üretiliyor…' : 'Profil + Pitch Üret' }}
    </button>
    <p v-if="errorText" class="text-red-400 text-sm">{{ errorText }}</p>

    <template v-if="ideas.length > 0">
      <section v-for="field in sections" :key="field.key" class="border border-zinc-800 rounded-2xl p-6 bg-zinc-900">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-semibold text-zinc-100">{{ field.title }}</h3>
          <button
            type="button"
            class="text-sm px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 bg-zinc-800/50 transition text-zinc-300 cursor-pointer"
            @click="copy(field.text, field.key)"
          >
            {{ copiedKey === field.key ? 'Kopyalandı' : 'Kopyala' }}
          </button>
        </div>
        <p class="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">{{ field.text }}</p>
      </section>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-zinc-100 text-lg">Ürün Fikirleri</h3>
          <button
            type="button"
            class="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 bg-zinc-900 transition text-zinc-300 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            :disabled="processing"
            @click="generate"
          >
            {{ processing ? 'Üretiliyor…' : 'Yeniden Üret' }}
          </button>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div v-for="(idea, i) in ideas" :key="i" class="border border-zinc-800 rounded-2xl p-6 bg-zinc-900 flex flex-col">
            <div class="flex items-start justify-between gap-2 flex-wrap mb-2">
              <h4 class="font-semibold text-zinc-100">{{ idea.title }}</h4>
              <span
                class="text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap"
                :class="idea.needs_cms ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-700/50 text-zinc-400'"
              >
                {{ idea.needs_cms ? 'Yönetim Panelli' : 'Tek Seferlik Yapım' }}
              </span>
            </div>
            <p class="text-sm text-zinc-400 flex-1">{{ idea.description }}</p>
            <p class="flex items-center gap-1.5 text-sm font-medium text-zinc-200 mt-3">
              <AppIcon name="currency" class="w-4 h-4 text-amber-400" /> {{ idea.price_estimate }}
            </p>

            <div v-if="idea.build_prompt" class="pt-3 mt-3 border-t border-zinc-800">
              <div class="flex justify-between items-center mb-1.5">
                <span class="text-xs font-medium text-zinc-500">Build Prompt</span>
                <button
                  type="button"
                  class="text-xs px-2 py-1 rounded-md border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 bg-zinc-800/50 transition text-zinc-300 cursor-pointer"
                  @click="copy(idea.build_prompt, `idea-${i}`)"
                >
                  {{ copiedKey === `idea-${i}` ? 'Kopyalandı' : 'Kopyala' }}
                </button>
              </div>
              <p class="whitespace-pre-wrap text-xs text-zinc-400 leading-relaxed max-h-40 overflow-y-auto">{{ idea.build_prompt }}</p>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- Status funnel: one contextual step at a time instead of three
         always-visible buttons that could jump the pipeline out of order.
         Shown even before generation, so a business can be tracked on foot
         without first spending a Gemini call on it. -->
    <div class="border border-zinc-800 rounded-2xl p-5 bg-zinc-900" :class="{ 'opacity-60 pointer-events-none': updatingStatus }">
      <button
        v-if="business.status === 'discovered' || business.status === 'processed'"
        type="button"
        class="w-full py-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-medium text-sm hover:bg-cyan-500/20 transition cursor-pointer"
        @click="setStatus('visited')"
      >
        Ziyaret Edildi Olarak İşaretle
      </button>

      <div v-else-if="business.status === 'visited'" class="flex gap-2">
        <button
          type="button"
          class="flex-1 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium text-sm hover:bg-emerald-500/20 transition cursor-pointer"
          @click="setStatus('won')"
        >
          Kazanıldı
        </button>
        <button
          type="button"
          class="flex-1 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-medium text-sm hover:bg-red-500/20 transition cursor-pointer"
          @click="setStatus('lost')"
        >
          Kaybedildi
        </button>
      </div>

      <div v-else class="flex items-center justify-between flex-wrap gap-2">
        <p class="text-sm" :class="business.status === 'won' ? 'text-emerald-400' : 'text-red-400'">
          Bu işletme {{ business.status === 'won' ? 'kazanıldı' : 'kaybedildi' }} olarak işaretlendi.
        </p>
        <button
          type="button"
          class="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 transition text-zinc-400 cursor-pointer"
          @click="setStatus('visited')"
        >
          Durumu Sıfırla
        </button>
      </div>
    </div>
  </div>
</template>
