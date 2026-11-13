<script setup lang="ts">
import type { ActivityWithBusiness, Business, BusinessStatus, SearchRecord } from '#shared/types/business'
import { BRAND } from '#shared/brand'

const { t, locale } = useI18n()
const { number, percent, relative, dateTime, intlLocale } = useFormat()
const { activityText } = useActivityText()
useHead({ title: () => t('nav.today') })

const businesses = ref<Business[]>([])
const activities = ref<ActivityWithBusiness[]>([])
const searches = ref<SearchRecord[]>([])
const loaded = ref(false)
const routeOpen = ref(false)

onMounted(async () => {
  const [b, a, s] = await Promise.all([
    $fetch<Business[]>('/api/businesses'),
    $fetch<ActivityWithBusiness[]>('/api/activities', { query: { limit: 8 } }),
    $fetch<SearchRecord[]>('/api/searches'),
  ])
  businesses.value = b
  activities.value = a
  searches.value = s
  loaded.value = true
})

const leads = computed(() => businesses.value.map(b => toLeadView(b)))
const total = computed(() => leads.value.length)
const noWebsite = computed(() => leads.value.filter(l => !l.business.website_url).length)

const STAGES: BusinessStatus[] = ['discovered', 'processed', 'visited', 'won', 'lost']
const stageCounts = computed(() => {
  const counts = Object.fromEntries(STAGES.map(s => [s, 0])) as Record<BusinessStatus, number>
  for (const l of leads.value) counts[l.business.status]++
  return counts
})

const won = computed(() => leads.value.filter(l => l.business.status === 'won'))
const wonValue = computed(() => won.value.reduce((sum, l) => sum + (l.business.deal_value ?? 0), 0))
const reachedVisit = computed(() => stageCounts.value.visited + stageCounts.value.won + stageCounts.value.lost)
const conversion = computed(() => (reachedVisit.value > 0 ? stageCounts.value.won / reachedVisit.value : null))

const followUps = computed(() => leads.value
  .filter(l => l.business.follow_up_at && l.business.status !== 'won' && l.business.status !== 'lost')
  .sort((a, b) => a.business.follow_up_at!.localeCompare(b.business.follow_up_at!)))
const overdueCount = computed(() => followUps.value.filter(l => l.followUpOverdue).length)
const dueCount = computed(() => followUps.value.filter(l => l.followUpDue).length)

const hottest = computed(() => leads.value
  .filter(l => (l.business.status === 'discovered' || l.business.status === 'processed') && l.business.google_status !== 'CLOSED_TEMPORARILY')
  .sort((a, b) => b.score.score - a.score.score || Number(b.openNow) - Number(a.openNow))
  .slice(0, 6))

const routeCandidates = computed(() => hottest.value.map(l => l.business))

const todayLabel = computed(() => new Intl.DateTimeFormat(intlLocale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()))
const money = (value: number) => number(value, { maximumFractionDigits: 0 })

function categoryText(b: Business) {
  return businessCategory(b, locale.value)
}
</script>

<template>
  <div class="space-y-7">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold text-muted first-letter:uppercase">{{ todayLabel }}</p>
        <h1 class="text-3xl sm:text-[34px] font-extrabold tracking-tight mt-1">{{ t('dashboard.title') }}</h1>
      </div>
      <div class="flex flex-wrap gap-2.5">
        <button
          type="button"
          class="flex items-center gap-2 px-4 py-3 rounded-xl border border-line-strong bg-surface text-sm font-bold hover:bg-subtle transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="routeCandidates.length === 0"
          data-testid="dashboard-route"
          @click="routeOpen = true"
        >
          <AppIcon name="route" class="w-4 h-4" /> {{ t('dashboard.planRoute') }}
        </button>
        <NuxtLink to="/discover" class="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent text-on-accent text-sm font-bold hover:bg-accent-hover transition">
          <AppIcon name="plus" class="w-4 h-4" /> {{ t('dashboard.newDiscovery') }}
        </NuxtLink>
      </div>
    </header>

    <div v-if="!loaded" class="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true">
      <div v-for="i in 4" :key="i" class="h-28 rounded-2xl bg-surface border border-line animate-pulse" />
    </div>

    <section v-else-if="total === 0" class="bg-surface border border-line rounded-3xl p-10 sm:p-14 text-center space-y-4" data-testid="dashboard-empty">
      <BrandMark :size="56" class="mx-auto" />
      <h2 class="text-2xl font-extrabold tracking-tight">{{ t('dashboard.emptyTitle') }}</h2>
      <p class="text-ink-2 max-w-md mx-auto leading-relaxed">{{ t('dashboard.emptyBody', { brand: BRAND.name }) }}</p>
      <NuxtLink to="/discover" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-on-accent font-bold hover:bg-accent-hover transition">
        <AppIcon name="search" class="w-4 h-4" /> {{ t('dashboard.emptyCta') }}
      </NuxtLink>
    </section>

    <template v-else>
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-kpis">
        <div class="bg-surface border border-line rounded-2xl p-5 space-y-1">
          <p class="text-[13px] font-semibold text-muted">{{ t('dashboard.kpiLeads') }}</p>
          <p class="text-3xl font-extrabold tabular">{{ number(total) }}</p>
          <p v-if="searches.length > 0" class="text-xs text-muted">{{ t('dashboard.kpiLeadsSub', { count: searches.length }) }}</p>
        </div>
        <div class="bg-surface border border-line rounded-2xl p-5 space-y-1">
          <p class="text-[13px] font-semibold text-muted">{{ t('dashboard.kpiNoWebsite') }}</p>
          <p class="text-3xl font-extrabold tabular text-accent">{{ number(noWebsite) }}</p>
          <p class="text-xs text-muted">{{ t('dashboard.kpiNoWebsiteSub', { percent: percent(noWebsite / total) }) }}</p>
        </div>
        <div class="bg-surface border border-line rounded-2xl p-5 space-y-1">
          <p class="text-[13px] font-semibold text-muted">{{ t('dashboard.kpiFollowUps') }}</p>
          <p class="text-3xl font-extrabold tabular">{{ number(dueCount) }}</p>
          <p class="text-xs" :class="overdueCount > 0 ? 'text-danger-ink font-semibold' : 'text-muted'">
            {{ overdueCount > 0 ? t('dashboard.kpiFollowUpsSub', { count: overdueCount }) : t('dashboard.kpiFollowUpsNone') }}
          </p>
        </div>
        <div class="bg-surface border border-line rounded-2xl p-5 space-y-1">
          <p class="text-[13px] font-semibold text-muted">{{ t('dashboard.kpiWon') }}</p>
          <p class="text-3xl font-extrabold tabular text-teal">{{ number(won.length) }}</p>
          <p class="text-xs text-muted">{{ wonValue > 0 ? t('dashboard.kpiWonValue', { value: money(wonValue) }) : t('dashboard.kpiWonNoValue') }}</p>
        </div>
      </section>

      <section class="bg-surface border border-line rounded-2xl p-5 sm:p-6 space-y-4" :aria-label="t('dashboard.pipeline')">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-[17px] font-bold">{{ t('dashboard.pipeline') }}</h2>
          <p class="text-[13px] text-muted">{{ conversion === null ? t('dashboard.conversionNone') : t('dashboard.conversion', { percent: percent(conversion) }) }}</p>
        </div>
        <div class="flex h-3.5 rounded-full overflow-hidden gap-0.5 bg-subtle" role="img" :aria-label="STAGES.map(s => `${t(`status.${s}`)} ${stageCounts[s]}`).join(', ')">
          <div v-for="s in STAGES" v-show="stageCounts[s] > 0" :key="s" :style="{ flex: stageCounts[s], background: `var(--st-${s}-dot)` }" />
        </div>
        <ul class="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-2">
          <li v-for="s in STAGES" :key="s" class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" :style="{ background: `var(--st-${s}-dot)` }" />
            {{ t(`status.${s}`) }} <strong class="tabular">{{ stageCounts[s] }}</strong>
          </li>
        </ul>
      </section>

      <div class="grid lg:grid-cols-2 gap-5">
        <section class="bg-surface border border-line rounded-2xl p-5 sm:p-6" data-testid="dashboard-hottest">
          <div class="flex items-baseline justify-between gap-3 pb-3">
            <h2 class="text-[17px] font-bold">{{ t('dashboard.hottest') }}</h2>
            <NuxtLink to="/businesses" class="text-[13px] font-bold text-accent hover:text-accent-hover shrink-0">{{ t('dashboard.seeAll') }}</NuxtLink>
          </div>
          <p v-if="hottest.length === 0" class="text-sm text-muted py-4">{{ t('dashboard.hottestEmpty') }}</p>
          <ul v-else>
            <li v-for="lead in hottest" :key="lead.business.id" class="border-t border-line first:border-t-0">
              <NuxtLink :to="`/businesses/${lead.business.id}`" class="flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-subtle transition">
                <ScoreBadge :score="lead.score.score" :band="lead.band" />
                <span class="flex-1 min-w-0">
                  <span class="block text-sm font-bold truncate">{{ lead.business.name }}</span>
                  <span class="block text-xs text-muted truncate">
                    {{ categoryText(lead.business) }}<template v-if="lead.business.district"> · {{ lead.business.district }}</template>
                  </span>
                </span>
                <span v-if="lead.openNow" class="text-xs font-bold text-teal-ink shrink-0">{{ t('dashboard.openNow') }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <div class="space-y-5">
          <section class="bg-surface border border-line rounded-2xl p-5 sm:p-6 space-y-3" data-testid="dashboard-followups">
            <h2 class="text-[17px] font-bold">{{ t('dashboard.followUps') }}</h2>
            <p v-if="followUps.length === 0" class="text-sm text-muted">{{ t('dashboard.followUpsEmpty') }}</p>
            <NuxtLink
              v-for="lead in followUps.slice(0, 5)"
              :key="lead.business.id"
              :to="`/businesses/${lead.business.id}`"
              class="flex items-center justify-between gap-3 p-3 rounded-xl transition hover:opacity-90"
              :class="lead.followUpOverdue ? 'bg-danger-soft' : 'bg-subtle'"
            >
              <span class="text-sm font-semibold truncate">{{ lead.business.name }}</span>
              <span class="text-xs font-bold shrink-0" :class="lead.followUpOverdue ? 'text-danger-ink' : 'text-ink-2'">
                <template v-if="lead.followUpOverdue">{{ t('dashboard.overdue') }} · </template>{{ dateTime(lead.business.follow_up_at) }}
              </span>
            </NuxtLink>
          </section>

          <section class="bg-surface border border-line rounded-2xl p-5 sm:p-6 space-y-3">
            <h2 class="text-[17px] font-bold">{{ t('dashboard.activity') }}</h2>
            <p v-if="activities.length === 0" class="text-sm text-muted">{{ t('dashboard.activityEmpty') }}</p>
            <ul v-else class="space-y-2.5">
              <li v-for="a in activities" :key="a.id" class="text-sm text-ink-2 leading-snug">
                <NuxtLink :to="`/businesses/${a.business_id}`" class="font-bold text-ink hover:text-accent">{{ a.business_name }}</NuxtLink>
                · <span :class="a.type === 'note' ? 'italic' : ''">{{ activityText(a) }}</span>
                <span class="text-muted whitespace-nowrap"> · {{ relative(a.created_at) }}</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </template>

    <RoutePlanner v-model:open="routeOpen" :businesses="routeCandidates" />
  </div>
</template>
