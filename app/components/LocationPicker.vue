<script setup lang="ts">
// Types come from @types/google.maps; the `google` global itself is injected
// at runtime by useGoogleMapsScript(), so it is only safe to touch after
// loadGoogleMapsScript() resolves.

const props = defineProps<{ radiusMeters: number }>()
const coords = defineModel<{ lat: number; lng: number } | null>('coords', { default: null })

const { t } = useI18n()
const { load: loadGoogleMapsScript, available: mapAvailable } = useGoogleMapsScript()

const mapContainer = ref<HTMLDivElement | null>(null)
const mapError = ref(false)
const PIN_ZOOM = 14

let map: google.maps.Map | null = null
let marker: google.maps.Marker | null = null
let circle: google.maps.Circle | null = null

function placePin(point: { lat: number; lng: number }, pan = true) {
  coords.value = point
  if (!map) return
  const accent = cssVar('--accent', '#c2410c')

  if (!marker) {
    marker = new google.maps.Marker({
      position: point,
      map,
      icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: accent, fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3, scale: 9 },
    })
  } else {
    marker.setPosition(point)
  }

  if (!circle) {
    circle = new google.maps.Circle({
      map,
      center: point,
      radius: props.radiusMeters,
      fillColor: accent,
      fillOpacity: 0.1,
      strokeColor: accent,
      strokeWeight: 1.5,
      clickable: false,
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
    mapError.value = true
    return
  }

  map = new google.maps.Map(mapContainer.value, {
    center: coords.value ?? DEFAULT_MAP_CENTER,
    zoom: coords.value ? PIN_ZOOM : DEFAULT_MAP_ZOOM,
    styles: themedMapStyle(),
    disableDefaultUI: true,
    zoomControl: true,
    // Clicking a Google POI to drop the pin would otherwise also pop
    // Google's own info bubble over the map.
    clickableIcons: false,
  })
  map.addListener('click', (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    placePin({ lat: e.latLng.lat(), lng: e.latLng.lng() })
  })
  if (coords.value) placePin(coords.value, false)
}

watch(() => props.radiusMeters, (r) => {
  circle?.setRadius(r)
})

onMounted(initMap)
</script>

<template>
  <div class="flex flex-col">
    <p v-if="!mapAvailable" class="text-danger-ink text-sm">{{ t('map.unavailable') }}</p>
    <template v-else>
      <p v-if="mapError" class="text-danger-ink text-sm mb-2">{{ t('map.loadError') }}</p>
      <div ref="mapContainer" class="w-full flex-1 min-h-[22rem] rounded-2xl border border-line cursor-crosshair" data-testid="location-map" />
      <p class="text-xs text-muted mt-2 flex items-center gap-1.5">
        <AppIcon name="pin" class="w-3.5 h-3.5" /> {{ t('discover.pinHint') }}
      </p>
    </template>
  </div>
</template>
