<script setup lang="ts">
import type { Business } from '#shared/types/business'

const props = defineProps<{ businesses: Business[] }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const { number } = useFormat()

const located = computed(() => props.businesses
  .filter(b => b.lat != null && b.lng != null)
  .map(b => ({ id: b.id, name: b.name, lat: b.lat as number, lng: b.lng as number })))

const truncated = computed(() => located.value.length > MAX_ROUTE_STOPS)
const ordered = computed(() => orderByNearestNeighbour(located.value.slice(0, MAX_ROUTE_STOPS)))
const distanceKm = computed(() => routeLengthMeters(ordered.value) / 1000)
const url = computed(() => googleMapsRouteUrl(ordered.value))

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" @click.self="open = false" @keydown="onKeydown">
      <div role="dialog" aria-modal="true" aria-labelledby="route-title" class="bg-surface border border-line rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" data-testid="route-planner">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 id="route-title" class="font-bold text-lg">{{ t('route.title') }}</h3>
            <p v-if="ordered.length > 0" class="text-sm text-muted mt-0.5">
              {{ t('route.stops', { count: ordered.length }) }} · {{ number(distanceKm, { maximumFractionDigits: 1 }) }} km
            </p>
          </div>
          <button type="button" class="p-2 rounded-lg hover:bg-subtle cursor-pointer" :aria-label="t('common.close')" @click="open = false">
            <AppIcon name="close" class="w-4 h-4" />
          </button>
        </div>

        <p v-if="ordered.length === 0" class="text-sm text-ink-2">{{ t('route.none') }}</p>
        <template v-else>
          <p class="text-sm text-ink-2 leading-relaxed">{{ t('route.body') }}</p>
          <p v-if="truncated" class="text-xs font-semibold text-warm-ink bg-warm-soft rounded-lg px-3 py-2">{{ t('route.tooMany', { max: MAX_ROUTE_STOPS }) }}</p>
          <ol class="space-y-1.5 max-h-72 overflow-y-auto">
            <li v-for="(stop, i) in ordered" :key="stop.id" class="flex items-center gap-3 text-sm">
              <span class="w-6 h-6 shrink-0 rounded-full bg-accent-soft text-accent-ink text-xs font-bold flex items-center justify-center tabular">{{ i + 1 }}</span>
              <span class="truncate">{{ stop.name }}</span>
            </li>
          </ol>
          <a
            :href="url"
            target="_blank"
            rel="noopener"
            class="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent text-on-accent font-bold hover:bg-accent-hover transition"
            data-testid="route-open"
          >
            <AppIcon name="navigation" class="w-4 h-4" />
            {{ t('route.open') }}
          </a>
        </template>
      </div>
    </div>
  </Teleport>
</template>
