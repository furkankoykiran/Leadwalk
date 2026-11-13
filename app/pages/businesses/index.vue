<script setup lang="ts">
import type { Business, BusinessStatus } from '#shared/types/business'
import type { LeadView } from '~/utils/lead'

const { t, locale } = useI18n()
const { dateTime, number } = useFormat()
const { confirmDialog } = useConfirm()
useHead({ title: () => t('nav.leads') })

const STAGES: BusinessStatus[] = ['discovered', 'processed', 'visited', 'won', 'lost']
type QuickFilter = 'noWebsite' | 'hot' | 'openNow' | 'fewReviews' | 'followUp'
type SortKey = 'score' | 'newest' | 'rating' | 'followUp' | 'name'

const QUICK_FILTERS: Array<{ key: QuickFilter; label: string; test: (l: LeadView) => boolean }> = [
  { key: 'noWebsite', label: 'leads.quickNoWebsite', test: l => !l.business.website_url },
  { key: 'hot', label: 'leads.quickHot', test: l => l.band === 'hot' },
  { key: 'openNow', label: 'leads.quickOpenNow', test: l => l.openNow === true },
  { key: 'fewReviews', label: 'leads.quickFewReviews', test: l => (l.business.review_count ?? 0) < 20 },
  { key: 'followUp', label: 'leads.quickFollowUp', test: l => l.followUpDue },
]

// Arriving from a discovery: say what it found and show the newest first.
const route = useRoute()
const discoveryResult = computed(() => {
  const found = Number(route.query.found)
  return Number.isFinite(found) && found > 0 ? { count: found, new: Number(route.query.new) || 0 } : null
})

const businesses = ref<Business[]>([])
const loaded = ref(false)
const searchQuery = ref('')
const sortKey = ref<SortKey>(discoveryResult.value ? 'newest' : 'score')
const quick = ref<Set<QuickFilter>>(new Set())
const stageFilter = ref<'all' | BusinessStatus>('all')
const categoryFilter = ref('all')
const selected = ref<Set<number>>(new Set())
const routeOpen = ref(false)
const bulkStatus = ref<'' | BusinessStatus>('')

async function load() {
  businesses.value = await $fetch<Business[]>('/api/businesses')
  loaded.value = true
  const existing = new Set(businesses.value.map(b => b.id))
  selected.value = new Set([...selected.value].filter(id => existing.has(id)))
}
onMounted(load)

const leads = computed(() => businesses.value.map(b => toLeadView(b)))

function categoryText(b: Business) {
  return categoryLabel(b.category, locale.value, b.type_label)
}

const categoryOptions = computed(() => {
  const counts = new Map<string, number>()
  for (const l of leads.value) {
    const label = categoryText(l.business)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], locale.value))
    .map(([label, count]) => ({ label, count }))
})

const quickCounts = computed(() => Object.fromEntries(QUICK_FILTERS.map(f => [f.key, leads.value.filter(f.test).length])))

const filtered = computed(() => {
  // Turkish-aware lowercasing: plain toLowerCase() turns "İ" into "i̇"
  // (i + combining dot), so "istiklal" would miss "İstiklal".
  const query = searchQuery.value.trim().toLocaleLowerCase(locale.value)
  const active = QUICK_FILTERS.filter(f => quick.value.has(f.key))
  const list = leads.value.filter((l) => {
    if (stageFilter.value !== 'all' && l.business.status !== stageFilter.value) return false
    if (categoryFilter.value !== 'all' && categoryText(l.business) !== categoryFilter.value) return false
    if (query && !l.business.name.toLocaleLowerCase(locale.value).includes(query)) return false
    return active.every(f => f.test(l))
  })
  const byName = (a: LeadView, b: LeadView) => a.business.name.localeCompare(b.business.name, locale.value)
  const sorters: Record<SortKey, (a: LeadView, b: LeadView) => number> = {
    score: (a, b) => b.score.score - a.score.score || byName(a, b),
    newest: (a, b) => b.business.discovered_at.localeCompare(a.business.discovered_at) || b.business.id - a.business.id,
    rating: (a, b) => (b.business.rating ?? 0) - (a.business.rating ?? 0) || (b.business.review_count ?? 0) - (a.business.review_count ?? 0),
    followUp: (a, b) => (a.business.follow_up_at ?? '9999').localeCompare(b.business.follow_up_at ?? '9999'),
    name: byName,
  }
  return [...list].sort(sorters[sortKey.value])
})

const hasFilters = computed(() => !!searchQuery.value || quick.value.size > 0 || stageFilter.value !== 'all' || categoryFilter.value !== 'all')
function resetFilters() {
  searchQuery.value = ''
  quick.value = new Set()
  stageFilter.value = 'all'
  categoryFilter.value = 'all'
}

function toggleQuick(key: QuickFilter) {
  const next = new Set(quick.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  quick.value = next
}

function toggleSelected(id: number) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

const allShownSelected = computed(() => filtered.value.length > 0 && filtered.value.every(l => selected.value.has(l.business.id)))
function toggleAllShown() {
  selected.value = allShownSelected.value ? new Set() : new Set(filtered.value.map(l => l.business.id))
}

const selectedBusinesses = computed(() => businesses.value.filter(b => selected.value.has(b.id)))

async function applyBulkStatus() {
  if (!bulkStatus.value || selected.value.size === 0) return
  await $fetch('/api/businesses/bulk', { method: 'POST', body: { ids: [...selected.value], action: 'status', status: bulkStatus.value } })
  bulkStatus.value = ''
  await load()
}

async function bulkDeleteSelected() {
  const count = selected.value.size
  if (count === 0) return
  const ok = await confirmDialog(t('leads.deleteConfirm', { count }), { confirmText: t('common.delete'), danger: true })
  if (!ok) return
  await $fetch('/api/businesses/bulk', { method: 'POST', body: { ids: [...selected.value], action: 'delete' } })
  selected.value = new Set()
  await load()
}

function exportCsv() {
  const ids = selected.value.size > 0 ? `?ids=${[...selected.value].join(',')}` : ''
  // A plain navigation lets the browser handle the download; the API reads
  // the language from the x-locale header only on fetches, so pass it along.
  const sep = ids ? '&' : '?'
  window.location.href = `/api/businesses/export${ids}${sep}locale=${locale.value}&tz=${encodeURIComponent(browserTimeZone())}`
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight">{{ t('leads.title') }}</h1>
        <p class="text-sm text-muted mt-1" data-testid="leads-count">{{ t('leads.subtitle', { count: businesses.length }) }}</p>
      </div>
      <div class="flex flex-wrap gap-2.5">
        <button type="button" class="flex items-center gap-2 px-4 py-3 rounded-xl border border-line-strong bg-surface text-sm font-bold hover:bg-subtle transition cursor-pointer disabled:opacity-50" :disabled="businesses.length === 0" data-testid="export-csv" @click="exportCsv">
          <AppIcon name="download" class="w-4 h-4" /> {{ t('leads.exportCsv') }}
        </button>
        <NuxtLink to="/discover" class="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent text-on-accent text-sm font-bold hover:bg-accent-hover transition">
          <AppIcon name="plus" class="w-4 h-4" /> {{ t('dashboard.newDiscovery') }}
        </NuxtLink>
      </div>
    </header>

    <p v-if="discoveryResult" class="flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-soft text-teal-ink text-sm font-bold" role="status" data-testid="discovery-result">
      <AppIcon name="check" class="w-4 h-4" /> {{ t('discover.result', { count: discoveryResult.count, new: discoveryResult.new }) }}
    </p>

    <div v-if="!loaded" class="space-y-3" aria-busy="true">
      <div v-for="i in 5" :key="i" class="h-[72px] rounded-2xl bg-surface border border-line animate-pulse" />
    </div>

    <div v-else-if="businesses.length === 0" class="bg-surface border border-line rounded-3xl p-12 text-center space-y-3">
      <AppIcon name="search" class="w-10 h-10 mx-auto text-muted" />
      <p class="text-ink-2">{{ t('leads.empty') }}</p>
      <NuxtLink to="/discover" class="inline-flex font-bold text-accent hover:text-accent-hover">{{ t('dashboard.emptyCta') }} →</NuxtLink>
    </div>

    <template v-else>
      <div class="flex flex-wrap gap-3 items-end">
        <label class="flex-1 min-w-[220px] flex flex-col gap-1 text-xs font-semibold text-muted">
          {{ t('leads.searchLabel') }}
          <input v-model="searchQuery" type="search" :placeholder="t('leads.searchPlaceholder')" class="px-3.5 py-2.5 rounded-xl border border-line-strong bg-surface text-sm text-ink placeholder:text-muted" data-testid="leads-search">
        </label>
        <label class="flex flex-col gap-1 text-xs font-semibold text-muted">
          {{ t('leads.stageFilter') }}
          <select v-model="stageFilter" class="px-3 py-2.5 rounded-xl border border-line-strong bg-surface text-sm text-ink cursor-pointer" data-testid="leads-stage">
            <option value="all">{{ t('leads.allStages') }}</option>
            <option v-for="s in STAGES" :key="s" :value="s">{{ t(`status.${s}`) }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-xs font-semibold text-muted">
          {{ t('leads.categoryFilter') }}
          <select v-model="categoryFilter" class="px-3 py-2.5 rounded-xl border border-line-strong bg-surface text-sm text-ink cursor-pointer max-w-56">
            <option value="all">{{ t('leads.allCategories') }}</option>
            <option v-for="c in categoryOptions" :key="c.label" :value="c.label">{{ c.label }} ({{ c.count }})</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-xs font-semibold text-muted">
          {{ t('leads.sortLabel') }}
          <select v-model="sortKey" class="px-3 py-2.5 rounded-xl border border-line-strong bg-surface text-sm text-ink cursor-pointer" data-testid="leads-sort">
            <option value="score">{{ t('leads.sortScore') }}</option>
            <option value="newest">{{ t('leads.sortNewest') }}</option>
            <option value="rating">{{ t('leads.sortRating') }}</option>
            <option value="followUp">{{ t('leads.sortFollowUp') }}</option>
            <option value="name">{{ t('leads.sortName') }}</option>
          </select>
        </label>
      </div>

      <div class="flex flex-wrap gap-2" role="group" :aria-label="t('leads.title')">
        <button
          v-for="f in QUICK_FILTERS"
          :key="f.key"
          type="button"
          class="px-3.5 py-2 rounded-full border text-[13px] font-semibold transition cursor-pointer"
          :class="quick.has(f.key) ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line-strong bg-surface text-ink-2 hover:bg-subtle'"
          :aria-pressed="quick.has(f.key)"
          :data-testid="`quick-${f.key}`"
          @click="toggleQuick(f.key)"
        >
          {{ t(f.label) }} · <span class="tabular">{{ quickCounts[f.key] }}</span>
        </button>
        <button v-if="hasFilters" type="button" class="px-3 py-2 text-[13px] font-semibold text-muted hover:text-ink cursor-pointer" @click="resetFilters">
          {{ t('leads.resetFilters') }}
        </button>
      </div>

      <div v-if="selected.size > 0" class="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-ink text-paper shadow-lg" data-testid="bulk-bar">
        <span class="text-sm font-bold">{{ t('leads.selected', { count: selected.size }) }}</span>
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="bulkStatus" class="px-3 py-2 rounded-xl bg-transparent border border-paper/30 text-sm cursor-pointer" :aria-label="t('leads.moveTo')" data-testid="bulk-status" @change="applyBulkStatus">
            <option value="" class="text-ink">{{ t('leads.moveTo') }}</option>
            <option v-for="s in STAGES" :key="s" :value="s" class="text-ink">{{ t(`status.${s}`) }}</option>
          </select>
          <button type="button" class="px-3 py-2 rounded-xl border border-paper/30 text-sm font-semibold hover:bg-paper/10 cursor-pointer" data-testid="bulk-route" @click="routeOpen = true">
            {{ t('leads.planRoute') }}
          </button>
          <button type="button" class="px-3 py-2 rounded-xl border border-paper/30 text-sm font-semibold hover:bg-paper/10 cursor-pointer" @click="exportCsv">
            {{ t('leads.exportCsv') }}
          </button>
          <button type="button" class="px-3 py-2 rounded-xl border border-danger/60 text-sm font-semibold text-danger hover:bg-danger/10 cursor-pointer" data-testid="bulk-delete" @click="bulkDeleteSelected">
            {{ t('leads.deleteSelected') }}
          </button>
        </div>
      </div>

      <p v-if="filtered.length === 0" class="text-sm text-muted text-center py-12">{{ t('leads.noMatch') }}</p>

      <div v-else class="bg-surface border border-line rounded-2xl overflow-hidden">
        <label class="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-line text-xs font-semibold text-muted cursor-pointer">
          <input type="checkbox" :checked="allShownSelected" class="w-[18px] h-[18px] accent-[var(--accent)]" data-testid="select-all" @change="toggleAllShown">
          {{ t('leads.selectAll') }} ({{ filtered.length }})
        </label>
        <ul data-testid="leads-list">
          <li v-for="lead in filtered" :key="lead.business.id" class="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 border-b border-line last:border-b-0 hover:bg-subtle/60 transition" :data-testid="`lead-row-${lead.business.id}`">
            <input
              type="checkbox"
              :checked="selected.has(lead.business.id)"
              :aria-label="t('leads.selectRow', { name: lead.business.name })"
              class="w-[18px] h-[18px] shrink-0 accent-[var(--accent)]"
              @change="toggleSelected(lead.business.id)"
            >
            <ScoreBadge :score="lead.score.score" :band="lead.band" />
            <div class="flex-1 min-w-0">
              <NuxtLink :to="`/businesses/${lead.business.id}`" class="block text-[15px] font-bold truncate hover:text-accent" data-testid="lead-name">{{ lead.business.name }}</NuxtLink>
              <p class="text-xs text-muted truncate mt-0.5">
                {{ categoryText(lead.business) }}
                <template v-if="lead.business.district"> · {{ lead.business.district }}</template>
                <template v-if="!lead.business.website_url"> · <span class="text-accent-ink font-semibold">{{ t('leads.quickNoWebsite') }}</span></template>
                <template v-if="lead.openNow"> · <span class="text-teal-ink font-semibold">{{ t('dashboard.openNow') }}</span></template>
                <template v-if="lead.business.follow_up_at && lead.followUpDue"> · <span class="font-semibold" :class="lead.followUpOverdue ? 'text-danger-ink' : 'text-ink-2'">{{ t('leads.followUpOn', { date: dateTime(lead.business.follow_up_at) }) }}</span></template>
              </p>
            </div>
            <span class="hidden sm:flex items-center gap-1 text-[13px] text-ink-2 w-28 shrink-0 tabular">
              <template v-if="lead.business.rating">
                <AppIcon name="star" class="w-3.5 h-3.5 text-accent" /> {{ number(lead.business.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }}
                <span class="text-muted">({{ number(lead.business.review_count ?? 0) }})</span>
              </template>
              <span v-else class="text-muted">{{ t('leads.noRating') }}</span>
            </span>
            <StatusBadge :status="lead.business.status" class="hidden md:inline-flex w-[118px] justify-center" />
          </li>
        </ul>
      </div>
    </template>

    <RoutePlanner v-model:open="routeOpen" :businesses="selectedBusinesses" />
  </div>
</template>
