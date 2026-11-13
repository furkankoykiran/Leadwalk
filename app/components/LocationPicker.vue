<script setup lang="ts">
// Types come from @types/google.maps; the `google` global itself is injected
// at runtime by useGoogleMapsScript(), so it is only safe to touch after
// loadGoogleMapsScript() resolves.

const props = defineProps<{ radiusMeters: number }>()

const coords = defineModel<{ lat: number; lng: number } | null>('coords', { default: null })

const { load: loadGoogleMapsScript, available: mapAvailable } = useGoogleMapsScript()

const mapContainer = ref<HTMLDivElement | null>(null)
const mapError = ref<string | null>(null)

const PIN_ZOOM = 13

let map: google.maps.Map | null = null
let marker: google.maps.Marker | null = null
let circle: google.maps.Circle | null = null

function placePin(point: { lat: number; lng: number }, pan = true) {
  coords.value = point
  if (!map) return

  if (!marker) {
    marker = new google.maps.Marker({
      position: point,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#f59e0b',
        fillOpacity: 1,
        strokeColor: '#09090b',
        strokeWeight: 2,
        scale: 9,
      },
    })
  } else {
    marker.setPosition(point)
  }

  if (!circle) {
    circle = new google.maps.Circle({
      map,
      center: point,
      radius: props.radiusMeters,
      fillColor: '#f59e0b',
      fillOpacity: 0.12,
      strokeColor: '#f59e0b',
      strokeWeight: 1,
    })
  } else {
    circle.setCenter(point)
    circle.setRadius(props.radiusMeters)
  }

  if (pan) map.panTo(point)
}

async function initMap() {
  if (!mapContainer.value) return
  try {
    await loadGoogleMapsScript()
  } catch {
    mapError.value = 'Harita yüklenemedi'
    return
  }
  mapError.value = null

  map = new google.maps.Map(mapContainer.value, {
    center: coords.value ?? DEFAULT_MAP_CENTER,
    zoom: coords.value ? PIN_ZOOM : DEFAULT_MAP_ZOOM,
    styles: DARK_MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: true,
    // Clicking a Google POI (a museum, a mall…) to drop the pin otherwise
    // also pops Google's own info bubble over the map.
    clickableIcons: false,
  })
  map.addListener('click', (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    placePin({ lat: e.latLng.lat(), lng: e.latLng.lng() })
  })
  if (coords.value) {
    placePin(coords.value, false)
  }
}

watch(() => props.radiusMeters, (r) => {
  circle?.setRadius(r)
})

onMounted(initMap)
</script>

<template>
  <div class="flex flex-col">
    <p v-if="!mapAvailable" class="text-red-400 text-sm">
      Harita kullanılamıyor — <code class="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">NUXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY</code> tanımlı değil.
    </p>
    <template v-else>
      <p v-if="mapError" class="text-red-400 text-sm mb-2">{{ mapError }}</p>
      <div ref="mapContainer" class="w-full flex-1 min-h-[24rem] rounded-xl border border-zinc-700 cursor-crosshair" />
      <p class="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
        <AppIcon name="pin" class="w-3.5 h-3.5" /> Haritada bir noktaya tıklayarak pin bırak.
      </p>
    </template>
  </div>
</template>
