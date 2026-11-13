<script setup lang="ts">
import { FREE_MONTHLY_CAPS } from '#shared/types/usage'
import type { Locale } from '~/utils/locale'

const route = useRoute()
const { t, locale, isAuto, browserLocale, setLocale } = useI18n()
const { usage, refreshUsage } = useUsage()
const { number } = useFormat()
const { confirmDialog } = useConfirm()

const NAV_ITEMS = computed(() => [
  { to: '/', label: t('nav.today'), icon: 'home', exact: true },
  { to: '/businesses', label: t('nav.leads'), icon: 'list', exact: false },
  { to: '/map', label: t('nav.map'), icon: 'map', exact: false },
  { to: '/discover', label: t('nav.discover'), icon: 'search', exact: false },
])

function isActive(item: { to: string; exact: boolean }) {
  return item.exact ? route.path === item.to : route.path.startsWith(item.to)
}

// /map and /discover are map-first pages that want the full height.
const isMapPage = computed(() => route.path === '/map' || route.path === '/discover')

const monthUsed = computed(() => usage.value?.month.discover_count ?? 0)
const monthShare = computed(() => Math.min(1, monthUsed.value / FREE_MONTHLY_CAPS.nearbySearch))
const usageTone = computed(() => (monthShare.value >= 1 ? 'over' : monthShare.value >= 0.8 ? 'warn' : 'safe'))

const languageChoice = computed<'auto' | Locale>({
  get: () => (isAuto.value ? 'auto' : locale.value),
  set: value => setLocale(value),
})

const clearing = ref(false)
async function clearAll() {
  const list = await $fetch<unknown[]>('/api/businesses')
  if (list.length === 0) return
  const ok = await confirmDialog(t('clearAll.confirm', { count: list.length }), {
    confirmText: t('clearAll.confirmButton'),
    danger: true,
  })
  if (!ok) return
  clearing.value = true
  try {
    await $fetch('/api/businesses', { method: 'DELETE' })
    window.location.assign('/')
  } finally {
    clearing.value = false
  }
}

onMounted(refreshUsage)
watch(() => route.fullPath, refreshUsage)
</script>

<template>
  <div class="min-h-dvh bg-paper text-ink lg:flex">
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-surface focus:px-4 focus:py-2 focus:rounded-lg">{{ t('common.skipToContent') }}</a>

    <aside class="lg:w-64 lg:shrink-0 lg:h-dvh lg:sticky lg:top-0 border-b lg:border-b-0 lg:border-r border-line bg-paper flex lg:flex-col gap-3 px-4 py-3 lg:p-5 items-center lg:items-stretch flex-wrap">
      <NuxtLink to="/" class="flex items-center rounded-xl lg:px-2 lg:pb-4" :aria-label="t('nav.today')">
        <AppLogo :size="34" />
      </NuxtLink>

      <nav :aria-label="t('nav.main')" class="flex lg:flex-col gap-1 order-3 lg:order-none w-full lg:w-auto overflow-x-auto">
        <NuxtLink
          v-for="item in NAV_ITEMS"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap"
          :class="isActive(item) ? 'bg-accent-soft text-accent-ink' : 'text-ink-2 hover:bg-subtle hover:text-ink'"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          <AppIcon :name="item.icon" class="w-[18px] h-[18px]" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="ml-auto lg:ml-0 lg:mt-auto flex lg:flex-col gap-3 items-center lg:items-stretch">
        <section v-if="usage" class="hidden lg:flex flex-col gap-2 p-4 rounded-2xl bg-surface border border-line" :aria-label="t('usage.title')">
          <p class="text-xs font-bold text-muted">{{ t('usage.title') }}</p>
          <p class="text-[13px] text-ink-2">
            {{ t('usage.today', { count: usage.today.discover_count }) }} · {{ t('usage.generations', { count: usage.today.process_count }) }}
          </p>
          <div
            class="h-1.5 rounded-full bg-subtle overflow-hidden"
            role="meter"
            :aria-valuenow="monthUsed"
            aria-valuemin="0"
            :aria-valuemax="FREE_MONTHLY_CAPS.nearbySearch"
            :aria-label="t('usage.month', { used: number(monthUsed), cap: number(FREE_MONTHLY_CAPS.nearbySearch) })"
          >
            <div
              class="h-full rounded-full"
              :class="usageTone === 'safe' ? 'bg-teal' : usageTone === 'warn' ? 'bg-accent' : 'bg-danger'"
              :style="{ width: `${Math.max(2, monthShare * 100)}%` }"
            />
          </div>
          <p class="text-[11px] text-muted leading-snug">{{ t('usage.month', { used: number(monthUsed), cap: number(FREE_MONTHLY_CAPS.nearbySearch) }) }}</p>
          <p class="text-[11px] font-semibold" :class="usageTone === 'safe' ? 'text-teal-ink' : usageTone === 'warn' ? 'text-accent-ink' : 'text-danger-ink'">{{ t(`usage.${usageTone}`) }}</p>
        </section>

        <label class="flex items-center gap-2 text-xs font-semibold text-muted">
          <AppIcon name="language" class="w-4 h-4" />
          <span class="sr-only">{{ t('language.label') }}</span>
          <select v-model="languageChoice" class="bg-surface border border-line rounded-lg px-2 py-1.5 text-xs text-ink cursor-pointer" data-testid="language-select">
            <option value="auto">{{ t('language.auto', { lang: t(`language.${browserLocale}`) }) }}</option>
            <option value="en">{{ t('language.en') }}</option>
            <option value="tr">{{ t('language.tr') }}</option>
          </select>
        </label>

        <button
          type="button"
          class="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-danger hover:bg-danger-soft transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          :disabled="clearing"
          @click="clearAll"
        >
          <AppIcon name="trash" class="w-3.5 h-3.5" />
          {{ clearing ? t('clearAll.clearing') : t('clearAll.button') }}
        </button>
      </div>
    </aside>

    <main id="main" class="flex-1 min-w-0" :class="isMapPage ? 'p-4 lg:p-6 lg:h-dvh lg:overflow-hidden' : 'p-4 sm:p-6 lg:p-10'">
      <div :class="isMapPage ? 'h-full' : 'max-w-6xl mx-auto'">
        <slot />
      </div>
    </main>
  </div>
</template>
