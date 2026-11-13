<script setup lang="ts">
import type { Business, BusinessStatus, SearchRecord } from '#shared/types/business'
import type { ScoreBand } from '#shared/utils/opportunity'
import type { LeadView } from '~/utils/lead'

const { t, locale } = useI18n()
const { load, available } = useGoogleMapsScript()
useHead({ title: () => t('nav.map') })

const STAGES: BusinessStatus[] = ['discovered', 'processed', 'visited', 'won', 'lost']
const BANDS: ScoreBand[] = ['hot', 'warm', 'cold']

const businesses = ref<Business[]>([])
const searches = ref<SearchRecord[]>([])
const loading = ref(true)
const mapContainer = ref<HTMLDivElement | null>(null)
const mapError = ref(false)
const colorBy = ref<'status' | 'score'>('status')
const showSearches = ref(true)

const leads = computed(() => businesses.value.map(b => toLeadView(b)).filter(l => l.hasCoords))

let map: google.maps.Map | null = null
let infoWindow: google.maps.InfoWindow | null = null
let markers: google.maps.Marker[] = []
let circles: google.maps.Circle[] = []

const bandColor = (band: ScoreBand) => (band === 'hot' ? cssVar('--accent') : band === 'warm' ? '#d97706' : cssVar('--st-discovered-dot'))

function markerColor(lead: LeadView): string {
  return colorBy.value === 'status' ? cssVar(`--st-${lead.business.status}-dot`) : bandColor(lead.band)
}

// Built with DOM nodes rather than an HTML string: business names come from
// Google and must never be interpreted as markup.
function infoContent(lead: LeadView): HTMLElement {
  const b = lead.business
  const root = document.createElement('div')
  root.style.cssText = 'font-family: inherit; max-width: 220px; color: #1c1917;'
  const name = document.createElement('p')
  name.style.cssText = 'font-weight: 700; margin: 0 0 4px;'
  name.textContent = b.name
  const meta = document.createElement('p')
  meta.style.cssText = 'font-size: 12px; color: #6b635b; margin: 0 0 8px;'
  meta.textContent = `${categoryLabel(b.category, locale.value, b.type_label)} · ${t(`status.${b.status}`)} · ${t('score.label')} ${lead.score.score}`
  const link = document.createElement('a')
  link.href = `/businesses/${b.id}`
  link.style.cssText = 'font-size: 13px; color: #c2410c; font-weight: 700;'
  link.textContent = t('map.openDetail')
  link.addEventListener('click', (event) => {
    event.preventDefault()
    navigateTo(`/businesses/${b.id}`)
  })
  root.append(name, meta, link)
  return root
}

function drawMarkers() {
  if (!map) return
  for (const m of markers) m.setMap(null)
  markers = leads.value.map((lead) => {
    const marker = new google.maps.Marker({
      position: { lat: lead.business.lat as number, lng: lead.business.lng as number },
      map,
      title: lead.business.name,
      // Hotter / later-stage leads draw on top.
      zIndex: colorBy.value === 'score' ? lead.score.score : STAGES.indexOf(lead.business.status),
      icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: markerColor(lead), fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2, scale: 8 },
    })
    marker.addListener('click', () => {
      infoWindow?.setContent(infoContent(lead))
      infoWindow?.open(map!, marker)
    })
    return marker
  })
}

function drawSearches() {
  if (!map) return
  for (const c of circles) c.setMap(null)
  circles = showSearches.value
    ? searches.value.map(s => new google.maps.Circle({
        map,
        center: { lat: s.lat, lng: s.lng },
        radius: s.radius_meters,
        strokeColor: cssVar('--muted'),
        strokeOpacity: 0.6,
        strokeWeight: 1,
        fillColor: cssVar('--muted'),
        fillOpacity: 0.05,
        clickable: false,
      }))
    : []
}

async function initMap() {
  if (!mapContainer.value) return
  try {
    await load()
  } catch {
    mapError.value = true
    return
  }
  map = new google.maps.Map(mapContainer.value, {
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
    // Hide Google's own POI and transit icons here: they are grey dots too
    // and blended in with the "New" lead markers. The discover page keeps
    // them, where they help you find your way.
    styles: [
      ...themedMapStyle(),
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
    ],
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
  })
  infoWindow = new google.maps.InfoWindow()
  drawSearches()
  drawMarkers()

  // Frame every lead instead of always opening on the default city.
  if (leads.value.length === 1) {
    map.setCenter({ lat: leads.value[0]!.business.lat!, lng: leads.value[0]!.business.lng! })
    map.setZoom(15)
  } else if (leads.value.length > 1) {
    const bounds = new google.maps.LatLngBounds()
    for (const l of leads.value) bounds.extend({ lat: l.business.lat!, lng: l.business.lng! })
    map.fitBounds(bounds, 48)
  }
}

watch(colorBy, drawMarkers)
watch(showSearches, drawSearches)

onMounted(async () => {
  const [b, s] = await Promise.all([
    $fetch<Business[]>('/api/businesses'),
    $fetch<SearchRecord[]>('/api/searches'),
  ])
  businesses.value = b
  searches.value = s
  loading.value = false
  await nextTick()
  await initMap()
})
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">{{ t('map.title') }}</h1>
        <p class="text-muted text-sm mt-1">{{ t('map.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex rounded-xl border border-line-strong bg-surface p-1" role="group" :aria-label="t('map.colorBy')">
          <button
            v-for="mode in (['status', 'score'] as const)"
            :key="mode"
            type="button"
            class="px-3 py-1.5 rounded-lg text-[13px] font-bold transition cursor-pointer"
            :class="colorBy === mode ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-subtle'"
            :aria-pressed="colorBy === mode"
            :data-testid="`color-${mode}`"
            @click="colorBy = mode"
          >
            {{ mode === 'status' ? t('map.colorStatus') : t('map.colorScore') }}
          </button>
        </div>
        <label class="flex items-center gap-2 text-[13px] font-semibold text-ink-2 cursor-pointer">
          <input v-model="showSearches" type="checkbox" class="w-4 h-4 accent-[var(--accent)]">
          {{ t('map.showSearches') }}
        </label>
      </div>
    </div>

    <ul class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-ink-2" data-testid="map-legend">
      <template v-if="colorBy === 'status'">
        <li v-for="s in STAGES" :key="s" class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full" :style="{ background: `var(--st-${s}-dot)` }" /> {{ t(`status.${s}`) }}
        </li>
      </template>
      <template v-else>
        <li v-for="band in BANDS" :key="band" class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full" :style="{ background: band === 'hot' ? 'var(--accent)' : band === 'warm' ? '#d97706' : 'var(--st-discovered-dot)' }" /> {{ t(`score.${band}`) }}
        </li>
      </template>
    </ul>

    <p v-if="!available" class="text-sm text-muted">{{ t('map.unavailable') }}</p>
    <p v-else-if="mapError" class="text-danger-ink text-sm">{{ t('map.loadError') }}</p>
    <div v-else ref="mapContainer" class="w-full flex-1 min-h-[24rem] rounded-3xl border border-line" data-testid="leads-map" />

    <p v-if="available && !loading && leads.length === 0" class="text-sm text-muted">{{ t('map.empty') }}</p>
  </div>
</template>
