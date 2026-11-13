<script setup lang="ts">
import type {
  Activity,
  Business,
  BusinessSignals,
  BusinessStatus,
  OpeningHours,
  ProductIdea,
  ReviewSnippet,
  ReviewSummary,
} from '#shared/types/business'
import { parseJson } from '#shared/utils/opportunity'

const props = defineProps<{ business: Business; activities: Activity[] }>()
const emit = defineEmits<{ updated: [business: Business]; activities: [activities: Activity[]] }>()

const { t, locale } = useI18n()
const { relative, number, dateTime } = useFormat()
const { activityText } = useActivityText()
const { copiedKey, copy } = useClipboard()
const { refreshUsage } = useUsage()
const { confirmDialog } = useConfirm()

const processing = ref(false)
const saving = ref(false)
const errorText = ref<string | null>(null)
const noteDraft = ref('')

const lead = computed(() => toLeadView(props.business))
const reviews = computed(() => parseJson<ReviewSnippet[]>(props.business.reviews_json, []))
const ideas = computed(() => parseJson<ProductIdea[]>(props.business.ideas_json, []))
const hours = computed(() => parseJson<OpeningHours | null>(props.business.opening_hours_json, null))
const signals = computed(() => parseJson<BusinessSignals>(props.business.signals_json, {}))
const reviewSummary = computed(() => parseJson<ReviewSummary | null>(props.business.review_summary_json, null))
const whatsapp = computed(() => whatsappUrl(props.business.international_phone))
const category = computed(() => categoryLabel(props.business.category, locale.value, props.business.type_label))

const signalChips = computed(() => (Object.entries(signals.value) as Array<[keyof BusinessSignals, boolean]>)
  .map(([key, value]) => ({ key, value, text: value ? t(`detail.signals.${key}`) : t('detail.no', { thing: t(`detail.signals.${key}`) }) })))

const openState = computed(() => {
  const status = props.business.google_status
  if (status === 'FUTURE_OPENING') return { text: t('detail.opening'), cls: 'text-accent-ink' }
  if (status === 'CLOSED_TEMPORARILY') return { text: t('detail.tempClosed'), cls: 'text-danger-ink' }
  if (lead.value.openNow === true) return { text: t('detail.openNow'), cls: 'text-teal-ink' }
  if (lead.value.openNow === false) return { text: t('detail.closedNow'), cls: 'text-muted' }
  return null
})

const ringStyle = computed(() => ({
  background: `conic-gradient(var(--accent) 0 ${lead.value.score.score}%, var(--line) ${lead.value.score.score}% 100%)`,
}))

const generatedLanguage = computed(() => {
  const code = props.business.generated_locale
  return code === 'en' || code === 'tr' ? t(`language.${code}`) : null
})

async function generate() {
  processing.value = true
  errorText.value = null
  try {
    const updated = await $fetch<Business>(`/api/process/${props.business.id}`, { method: 'POST' })
    emit('updated', updated)
  } catch (error) {
    errorText.value = errorMessage(error, t('errors.generation'))
  } finally {
    processing.value = false
    refreshUsage()
  }
}

async function patch(body: Record<string, unknown>) {
  saving.value = true
  errorText.value = null
  try {
    const updated = await $fetch<Business>(`/api/businesses/${props.business.id}`, { method: 'PATCH', body })
    emit('updated', updated)
  } catch (error) {
    errorText.value = errorMessage(error, t('errors.update'))
  } finally {
    saving.value = false
  }
}

function setStatus(status: BusinessStatus) {
  return patch({ status })
}

// <input type="datetime-local"> works in the browser's local time zone.
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const followUpInput = ref(toLocalInput(props.business.follow_up_at))
const dealInput = ref<string>(props.business.deal_value != null ? String(props.business.deal_value) : '')
watch(() => props.business, (b) => {
  followUpInput.value = toLocalInput(b.follow_up_at)
  dealInput.value = b.deal_value != null ? String(b.deal_value) : ''
})

function saveFollowUp() {
  const value = followUpInput.value ? new Date(followUpInput.value).toISOString() : null
  if (value === props.business.follow_up_at) return
  return patch({ follow_up_at: value })
}

function clearFollowUp() {
  followUpInput.value = ''
  return patch({ follow_up_at: null })
}

function saveDeal() {
  const raw = String(dealInput.value ?? '').trim().replace(',', '.')
  const value = raw === '' ? null : Number(raw)
  if (value !== null && (!Number.isFinite(value) || value < 0)) return
  if (value === props.business.deal_value) return
  return patch({ deal_value: value })
}

async function addNote() {
  const body = noteDraft.value.trim()
  if (!body) return
  try {
    const list = await $fetch<Activity[]>(`/api/businesses/${props.business.id}/notes`, { method: 'POST', body: { body } })
    noteDraft.value = ''
    emit('activities', list)
  } catch (error) {
    errorText.value = errorMessage(error, t('errors.update'))
  }
}

async function deleteNote(activity: Activity) {
  const list = await $fetch<Activity[]>(`/api/businesses/${props.business.id}/notes/${activity.id}`, { method: 'DELETE' })
  emit('activities', list)
}

async function removeLead() {
  const ok = await confirmDialog(t('leads.deleteOne'), { confirmText: t('common.delete'), danger: true })
  if (!ok) return
  await $fetch(`/api/businesses/${props.business.id}`, { method: 'DELETE' })
  await navigateTo('/businesses')
}
</script>

<template>
  <div class="space-y-5">
    <header class="bg-surface border border-line rounded-3xl p-5 sm:p-7 flex flex-wrap gap-6 items-center">
      <div class="w-[88px] h-[88px] shrink-0 rounded-full flex items-center justify-center" :style="ringStyle" role="img" :aria-label="`${t('score.label')} ${lead.score.score}`">
        <div class="w-[70px] h-[70px] rounded-full bg-surface flex flex-col items-center justify-center">
          <span class="text-2xl font-extrabold leading-none tabular" data-testid="detail-score">{{ lead.score.score }}</span>
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted mt-0.5">{{ t(`score.${lead.band}`) }}</span>
        </div>
      </div>

      <div class="flex-1 min-w-[260px] space-y-2">
        <div class="flex flex-wrap items-center gap-2.5">
          <h1 class="text-2xl sm:text-[28px] font-extrabold tracking-tight" data-testid="detail-name">{{ business.name }}</h1>
          <StatusBadge :status="business.status" data-testid="detail-status" />
        </div>
        <p class="text-sm text-muted leading-relaxed">
          <span class="font-semibold text-ink-2">{{ category }}</span>
          <template v-if="business.address"> · {{ business.address }}</template>
          <template v-if="business.rating">
            · <AppIcon name="star" class="inline w-3.5 h-3.5 text-accent -mt-0.5" />
            {{ number(business.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }} ({{ t('leads.reviews', { count: business.review_count ?? 0 }) }})
          </template>
          <template v-if="openState"> · <span class="font-bold" :class="openState.cls">{{ openState.text }}</span></template>
        </p>
        <ul class="flex flex-wrap gap-1.5 pt-1" :aria-label="t('score.explain')">
          <li
            v-for="reason in lead.score.reasons"
            :key="reason.key"
            class="px-2.5 py-1 rounded-lg text-xs font-bold"
            :class="reason.points >= 15 ? 'bg-accent-soft text-accent-ink' : reason.points > 0 ? 'bg-subtle text-ink-2' : 'bg-danger-soft text-danger-ink'"
          >
            {{ reason.points > 0 ? '+' : '' }}{{ reason.points }} {{ t(`score.reasons.${reason.key}`) }}
          </li>
        </ul>
      </div>

      <div class="flex flex-wrap gap-2">
        <a v-if="business.phone" :href="`tel:${business.international_phone ?? business.phone}`" class="flex items-center gap-2 px-4 py-3 rounded-xl border border-line-strong text-sm font-bold hover:bg-subtle transition">
          <AppIcon name="phone" class="w-4 h-4" /> {{ t('detail.call') }}
        </a>
        <a v-if="whatsapp" :href="whatsapp" target="_blank" rel="noopener" class="flex items-center gap-2 px-4 py-3 rounded-xl border border-line-strong text-sm font-bold hover:bg-subtle transition">
          <AppIcon name="message" class="w-4 h-4" /> {{ t('detail.whatsapp') }}
        </a>
        <a v-if="business.website_url" :href="business.website_url" target="_blank" rel="noopener" class="flex items-center gap-2 px-4 py-3 rounded-xl border border-line-strong text-sm font-bold hover:bg-subtle transition">
          <AppIcon name="globe" class="w-4 h-4" /> {{ t('detail.website') }}
        </a>
        <a :href="directionsUrl(business)" target="_blank" rel="noopener" class="flex items-center gap-2 px-4 py-3 rounded-xl bg-ink text-paper text-sm font-bold hover:opacity-90 transition">
          <AppIcon name="navigation" class="w-4 h-4" /> {{ t('detail.directions') }}
        </a>
      </div>
    </header>

    <p v-if="errorText" class="text-sm font-semibold text-danger-ink bg-danger-soft rounded-xl px-4 py-3" role="alert" data-testid="detail-error">{{ errorText }}</p>

    <div class="flex flex-wrap gap-5 items-start">
      <div class="flex-[999_1_560px] min-w-0 space-y-5">
        <section v-if="ideas.length === 0" class="bg-surface border border-line rounded-2xl p-6 space-y-3">
          <button
            type="button"
            class="flex items-center gap-2 py-3.5 px-6 rounded-xl bg-accent text-on-accent font-bold hover:bg-accent-hover disabled:opacity-60 transition cursor-pointer disabled:cursor-wait"
            :disabled="processing"
            data-testid="generate"
            @click="generate"
          >
            <AppIcon name="sparkles" class="w-4 h-4" />
            {{ processing ? t('detail.generating') : t('detail.generate') }}
          </button>
          <p class="text-xs text-muted">{{ t('detail.generateHint') }}</p>
        </section>

        <template v-else>
          <section class="bg-surface border border-line rounded-2xl p-6 space-y-3" data-testid="pitch">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-[17px] font-bold">{{ t('detail.opener') }}</h2>
                <p v-if="generatedLanguage" class="text-xs text-muted">{{ t('detail.generatedIn', { lang: generatedLanguage }) }} · {{ relative(business.processed_at) }}</p>
              </div>
              <div class="flex gap-2">
                <button type="button" class="px-3 py-2 rounded-xl border border-line-strong text-[13px] font-bold hover:bg-subtle cursor-pointer" @click="copy(business.pitch_script_md ?? '', 'pitch')">
                  {{ copiedKey === 'pitch' ? t('common.copied') : t('common.copy') }}
                </button>
                <button type="button" class="px-3 py-2 rounded-xl border border-line-strong text-[13px] font-bold hover:bg-subtle cursor-pointer disabled:opacity-60 disabled:cursor-wait" :disabled="processing" data-testid="regenerate" @click="generate">
                  {{ processing ? t('detail.generating') : t('detail.regenerate') }}
                </button>
              </div>
            </div>
            <p class="whitespace-pre-wrap text-[15px] leading-7 text-ink">{{ business.pitch_script_md }}</p>
          </section>

          <section class="space-y-3">
            <h2 class="text-[17px] font-bold">{{ t('detail.ideas') }}</h2>
            <div class="grid md:grid-cols-2 gap-4" data-testid="ideas">
              <article v-for="(idea, i) in ideas" :key="i" class="bg-surface border border-line rounded-2xl p-5 flex flex-col gap-2.5">
                <span class="self-start px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide" :class="idea.needs_cms ? 'bg-accent-soft text-accent-ink' : 'bg-subtle text-ink-2'">
                  {{ idea.needs_cms ? t('detail.withPanel') : t('detail.oneOff') }}
                </span>
                <h3 class="font-bold">{{ idea.title }}</h3>
                <p class="text-sm text-ink-2 leading-relaxed flex-1">{{ idea.description }}</p>
                <p class="flex items-center gap-1.5 text-[15px] font-extrabold"><AppIcon name="currency" class="w-4 h-4 text-accent" /> {{ idea.price_estimate }}</p>
                <details v-if="idea.build_prompt" class="group border-t border-line pt-2.5">
                  <summary class="flex items-center justify-between cursor-pointer text-xs font-bold text-muted list-none">
                    {{ t('detail.buildPrompt') }}
                    <AppIcon name="chevron-down" class="w-4 h-4 transition group-open:rotate-180" />
                  </summary>
                  <p class="whitespace-pre-wrap text-xs text-ink-2 leading-relaxed mt-2 max-h-48 overflow-y-auto">{{ idea.build_prompt }}</p>
                  <button type="button" class="mt-2 px-2.5 py-1.5 rounded-lg border border-line-strong text-xs font-bold hover:bg-subtle cursor-pointer" @click="copy(idea.build_prompt, `idea-${i}`)">
                    {{ copiedKey === `idea-${i}` ? t('common.copied') : t('common.copy') }}
                  </button>
                </details>
              </article>
            </div>
          </section>

          <section class="bg-surface border border-line rounded-2xl p-6 space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-[17px] font-bold">{{ t('detail.profile') }}</h2>
              <button type="button" class="px-3 py-2 rounded-xl border border-line-strong text-[13px] font-bold hover:bg-subtle cursor-pointer" @click="copy(business.profile_md ?? '', 'profile')">
                {{ copiedKey === 'profile' ? t('common.copied') : t('common.copy') }}
              </button>
            </div>
            <p class="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{{ business.profile_md }}</p>
          </section>
        </template>

        <section class="bg-surface border border-line rounded-2xl p-6 space-y-4" data-testid="google-facts">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-[17px] font-bold">{{ t('detail.googleKnows') }}</h2>
            <a :href="placeUrl(business)" target="_blank" rel="noopener" class="flex items-center gap-1 text-[13px] font-bold text-accent hover:text-accent-hover">
              Google Maps <AppIcon name="external" class="w-3.5 h-3.5" />
            </a>
          </div>

          <div v-if="!business.website_url" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-on-accent text-xs font-bold">
            <AppIcon name="globe" class="w-3.5 h-3.5" /> {{ t('detail.noWebsite') }}
          </div>

          <ul v-if="signalChips.length > 0" class="flex flex-wrap gap-2">
            <li v-for="chip in signalChips" :key="chip.key" class="px-2.5 py-1.5 rounded-lg text-[13px]" :class="chip.value ? 'bg-subtle text-ink' : 'bg-subtle text-muted'">
              {{ chip.text }}
            </li>
          </ul>

          <p v-if="business.price_level" class="text-sm text-ink-2"><span class="font-semibold">{{ t('detail.priceLevel') }}:</span> {{ t(`detail.price.${business.price_level}`) }}</p>

          <div v-if="hours?.weekday_descriptions.length" class="space-y-1">
            <p class="text-sm font-semibold">{{ t('detail.hours') }}</p>
            <ul class="text-sm text-ink-2 grid sm:grid-cols-2 gap-x-6 gap-y-0.5">
              <li v-for="line in hours.weekday_descriptions" :key="line">{{ line }}</li>
            </ul>
          </div>

          <figure v-if="business.editorial_summary" class="text-sm text-ink-2 border-l-2 border-line pl-3">
            <blockquote>{{ business.editorial_summary }}</blockquote>
            <figcaption class="text-xs text-muted mt-1">{{ t('detail.aboutGoogle') }}</figcaption>
          </figure>

          <!-- Google's policy: AI summaries are shown unaltered with their
               disclosure text and links. -->
          <div v-if="reviewSummary" class="rounded-xl bg-subtle p-4 space-y-2">
            <p class="text-sm font-bold">{{ t('detail.reviewSummary') }}</p>
            <p class="text-sm text-ink-2 leading-relaxed">{{ reviewSummary.text }}</p>
            <p v-if="reviewSummary.disclosure" class="text-xs text-muted">{{ reviewSummary.disclosure }}</p>
            <p class="flex flex-wrap gap-4 text-xs font-bold">
              <a v-if="reviewSummary.reviews_uri" :href="reviewSummary.reviews_uri" target="_blank" rel="noopener" class="text-accent">{{ t('detail.seeReviews') }}</a>
              <a v-if="reviewSummary.flag_uri" :href="reviewSummary.flag_uri" target="_blank" rel="noopener" class="text-muted">{{ t('detail.reportSummary') }}</a>
            </p>
          </div>

          <div v-if="reviews.length > 0" class="space-y-2">
            <p class="text-sm font-semibold">{{ t('detail.reviews') }}</p>
            <div class="grid sm:grid-cols-2 gap-3">
              <article v-for="(review, i) in reviews" :key="i" class="rounded-xl bg-subtle p-4 space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-semibold truncate">{{ review.author || t('common.unknown') }}</span>
                  <span class="flex items-center gap-0.5 shrink-0" :aria-label="`${review.rating}/5`">
                    <AppIcon v-for="n in Math.round(review.rating)" :key="n" name="star" class="w-3 h-3 text-accent" />
                  </span>
                </div>
                <p class="text-sm text-ink-2 leading-relaxed">{{ review.text }}</p>
                <p v-if="review.published_at" class="text-xs text-muted">{{ relative(review.published_at) }}</p>
              </article>
            </div>
          </div>
        </section>
      </div>

      <aside class="flex-[1_1_320px] min-w-0 space-y-5">
        <section class="bg-surface border border-line rounded-2xl p-5 space-y-4" data-testid="next-step" :class="{ 'opacity-70 pointer-events-none': saving }">
          <h2 class="text-[17px] font-bold">{{ t('detail.nextStep') }}</h2>

          <button
            v-if="business.status === 'discovered' || business.status === 'processed'"
            type="button"
            class="w-full py-3 rounded-xl font-bold text-sm text-white cursor-pointer hover:opacity-90"
            :style="{ background: 'var(--st-visited-dot)' }"
            data-testid="mark-visited"
            @click="setStatus('visited')"
          >
            {{ t('detail.markVisited') }}
          </button>

          <div v-else-if="business.status === 'visited'" class="flex gap-2">
            <button type="button" class="flex-1 py-3 rounded-xl font-bold text-sm bg-teal-soft text-teal-ink hover:opacity-90 cursor-pointer" data-testid="mark-won" @click="setStatus('won')">{{ t('detail.markWon') }}</button>
            <button type="button" class="flex-1 py-3 rounded-xl font-bold text-sm bg-danger-soft text-danger-ink hover:opacity-90 cursor-pointer" data-testid="mark-lost" @click="setStatus('lost')">{{ t('detail.markLost') }}</button>
          </div>

          <div v-else class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-semibold" :class="business.status === 'won' ? 'text-teal-ink' : 'text-danger-ink'">
              {{ business.status === 'won' ? t('detail.wonText') : t('detail.lostText') }}
            </p>
            <button type="button" class="px-3 py-1.5 rounded-lg border border-line-strong text-xs font-bold text-ink-2 hover:bg-subtle cursor-pointer" data-testid="reopen" @click="setStatus('visited')">{{ t('detail.reopen') }}</button>
          </div>

          <div class="space-y-1.5">
            <label for="follow-up" class="text-[13px] font-semibold text-ink-2">{{ t('detail.followUp') }}</label>
            <div class="flex gap-2">
              <input id="follow-up" v-model="followUpInput" type="datetime-local" class="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-line-strong bg-surface text-sm" data-testid="follow-up" @change="saveFollowUp">
              <button v-if="business.follow_up_at" type="button" class="px-3 rounded-xl border border-line-strong text-xs font-bold hover:bg-subtle cursor-pointer" @click="clearFollowUp">{{ t('common.clear') }}</button>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="deal-value" class="text-[13px] font-semibold text-ink-2">{{ t('detail.dealValue') }}</label>
            <input id="deal-value" v-model="dealInput" type="number" min="0" step="any" inputmode="decimal" class="w-full px-3 py-2.5 rounded-xl border border-line-strong bg-surface text-sm tabular" data-testid="deal-value" @change="saveDeal">
          </div>
        </section>

        <section class="bg-surface border border-line rounded-2xl p-5 space-y-4" data-testid="notes">
          <h2 class="text-[17px] font-bold">{{ t('detail.notes') }}</h2>
          <form class="space-y-2" @submit.prevent="addNote">
            <label for="note" class="text-[13px] font-semibold text-ink-2">{{ t('detail.addNote') }}</label>
            <textarea id="note" v-model="noteDraft" rows="3" maxlength="4000" :placeholder="t('detail.notePlaceholder')" class="w-full px-3 py-2.5 rounded-xl border border-line-strong bg-surface text-sm resize-y placeholder:text-muted" data-testid="note-input" />
            <button type="submit" class="px-4 py-2.5 rounded-xl bg-ink text-paper text-sm font-bold hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed" :disabled="!noteDraft.trim()" data-testid="note-save">{{ t('detail.saveNote') }}</button>
          </form>

          <p v-if="activities.length === 0" class="text-sm text-muted">{{ t('detail.noHistory') }}</p>
          <ol v-else class="border-l-2 border-line pl-4 space-y-3" data-testid="history">
            <li v-for="a in activities" :key="a.id" class="relative">
              <span class="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full" :class="a.type === 'note' ? 'bg-accent' : 'bg-line-strong'" />
              <p class="text-sm leading-snug" :class="a.type === 'note' ? 'text-ink whitespace-pre-wrap' : 'text-ink-2'">
                <template v-if="a.type === 'note'">{{ a.body }}</template>
                <strong v-else class="font-semibold">{{ activityText(a) }}</strong>
              </p>
              <p class="text-xs text-muted mt-0.5 flex items-center gap-2">
                <span :title="dateTime(a.created_at)">{{ relative(a.created_at) }}</span>
                <button v-if="a.type === 'note'" type="button" class="underline hover:text-danger cursor-pointer" @click="deleteNote(a)">{{ t('detail.deleteNote') }}</button>
              </p>
            </li>
          </ol>
        </section>

        <button type="button" class="flex items-center gap-2 text-sm font-semibold text-danger hover:underline cursor-pointer" data-testid="remove-lead" @click="removeLead">
          <AppIcon name="trash" class="w-4 h-4" /> {{ t('detail.removeLead') }}
        </button>
      </aside>
    </div>
  </div>
</template>
