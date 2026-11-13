// Shared between the discover pin-picker and the /map overview so both
// start centered on the same area.
export const DEFAULT_MAP_CENTER = { lat: 39.9334, lng: 32.8597 } // Ankara
export const DEFAULT_MAP_ZOOM = 12

// Warm-neutral dark style matching the app's dark theme tokens. Light
// theme keeps Google's default style, with business POIs dimmed so our own
// markers stay the loudest thing on the map.
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1c1917' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1c1917' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a8a29e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#e7e5e4' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8a827a' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#23201d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2a26' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1c1917' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#a8a29e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3f3934' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#fdba74' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2e2a26' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1d24' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#57534e' }] },
]

export const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
]

export function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
}

export function themedMapStyle(): google.maps.MapTypeStyle[] {
  return prefersDark() ? DARK_MAP_STYLE : LIGHT_MAP_STYLE
}

/** Reads a CSS custom property from :root, so map markers use the same
 * colours as the rest of the UI in either theme. */
export function cssVar(name: string, fallback = '#888888'): string {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}
