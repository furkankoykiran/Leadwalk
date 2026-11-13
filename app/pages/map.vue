<script setup lang="ts">
import type { Business } from '#shared/types/business'

const { load, available } = useGoogleMapsScript()

const businesses = ref<Business[]>([])
const loading = ref(true)
const mapContainer = ref<HTMLDivElement | null>(null)
const mapError = ref<string | null>(null)

const withCoords = computed(() => businesses.value.filter(b => b.lat != null && b.lng != null))

async function initMap() {
  if (!mapContainer.value) return
  try {
    await load()
  } catch {
    mapError.value = 'Harita yüklenemedi'
    return
  }
  mapError.value = null

  const map = new google.maps.Map(mapContainer.value, {
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
    styles: DARK_MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
  })
  const infoWindow = new google.maps.InfoWindow()

  if (withCoords.value.length === 0) return

  // Frame the saved businesses instead of always opening on the default
  // city — a discovery anywhere else was otherwise off-screen.
  const bounds = new google.maps.LatLngBounds()
  for (const b of withCoords.value) {
    const position = { lat: b.lat as number, lng: b.lng as number }
    bounds.extend(position)
    const marker = new google.maps.Marker({
      position,
      map,
      title: b.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: STATUS_HEX[b.status],
        fillOpacity: 1,
        strokeColor: '#09090b',
        strokeWeight: 2,
        scale: 8,
      },
    })
    marker.addListener('click', () => {
      infoWindow.setContent(infoWindowContent(b))
      infoWindow.open(map, marker)
    })
  }

  if (withCoords.value.length === 1) {
    map.setCenter(bounds.getCenter())
    map.setZoom(15)
  } else {
    map.fitBounds(bounds, 48)
  }
}

// Built with DOM nodes rather than an HTML string: business names come from
// Google and must never be interpreted as markup.
function infoWindowContent(b: Business): HTMLElement {
  const root = document.createElement('div')
  root.style.cssText = 'font-family: \'Inter\', sans-serif; max-width: 200px;'

  const name = document.createElement('p')
  name.style.cssText = 'font-weight: 600; margin: 0 0 4px; color: #18181b;'
  name.textContent = b.name

  const meta = document.createElement('p')
  meta.style.cssText = 'font-size: 12px; color: #71717a; margin: 0 0 8px;'
  meta.textContent = `${categoryLabel(b.category)} · ${STATUS_LABELS[b.status]}`

  const link = document.createElement('a')
  link.href = `/businesses/${b.id}`
  link.style.cssText = 'font-size: 13px; color: #d97706; font-weight: 600; cursor: pointer;'
  link.textContent = 'Detaya git →'
  link.addEventListener('click', (event) => {
    event.preventDefault()
    navigateTo(`/businesses/${b.id}`)
  })

  root.append(name, meta, link)
  return root
}

onMounted(async () => {
  businesses.value = await $fetch<Business[]>('/api/businesses')
  loading.value = false
  await nextTick()
  await initMap()
})
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-zinc-100 tracking-tight">Harita</h1>
        <p class="text-zinc-500 text-sm mt-0.5">Kaydedilen işletmelerin konumları, duruma göre renklendirilmiş.</p>
      </div>
      <div class="flex gap-4 text-xs text-zinc-400 flex-wrap bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
        <span v-for="(label, status) in STATUS_LABELS" :key="status" class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full inline-block" :style="{ backgroundColor: STATUS_HEX[status as Business['status']] }" />
          {{ label }}
        </span>
      </div>
    </div>

    <p v-if="!available" class="text-sm text-zinc-500">
      Harita için <code class="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">NUXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY</code> tanımlı değil.
    </p>
    <p v-else-if="mapError" class="text-red-400 text-sm">{{ mapError }}</p>
    <div v-else ref="mapContainer" class="w-full flex-1 rounded-2xl border border-zinc-800" />

    <p v-if="available && !loading && withCoords.length === 0" class="text-sm text-zinc-500">
      Haritada gösterilecek konum bilgisi olan işletme yok. Yeni bir keşif yaptığında burada görünecekler.
    </p>
  </div>
</template>
