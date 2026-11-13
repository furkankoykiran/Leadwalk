// Walking-route helpers: plain geometry, no paid Directions/Routes API.

export interface RouteStop {
  id: number
  name: string
  lat: number
  lng: number
}

/** Google Maps directions URLs accept origin + destination + up to 9 waypoints. */
export const MAX_ROUTE_STOPS = 11

/** Great-circle distance in metres. */
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Orders stops by repeatedly walking to the nearest unvisited one, starting
 * from the first stop given. Good enough (and instant) for ≤ 11 stops. */
export function orderByNearestNeighbour<T extends { lat: number; lng: number }>(stops: T[]): T[] {
  if (stops.length <= 2) return [...stops]
  const remaining = [...stops]
  const ordered = [remaining.shift()!]
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1]!
    let bestIndex = 0
    let bestDistance = Infinity
    remaining.forEach((stop, i) => {
      const d = haversineMeters(last, stop)
      if (d < bestDistance) {
        bestDistance = d
        bestIndex = i
      }
    })
    ordered.push(remaining.splice(bestIndex, 1)[0]!)
  }
  return ordered
}

export function routeLengthMeters(stops: Array<{ lat: number; lng: number }>): number {
  let total = 0
  for (let i = 1; i < stops.length; i++) total += haversineMeters(stops[i - 1]!, stops[i]!)
  return total
}

/** Google Maps walking directions through the stops, in order. */
export function googleMapsRouteUrl(stops: Array<{ lat: number; lng: number }>): string {
  const coords = stops.slice(0, MAX_ROUTE_STOPS).map(s => `${s.lat},${s.lng}`)
  const params = new URLSearchParams({ api: '1', travelmode: 'walking' })
  if (coords.length === 0) return 'https://www.google.com/maps'
  params.set('destination', coords[coords.length - 1]!)
  if (coords.length > 1) params.set('origin', coords[0]!)
  const waypoints = coords.slice(1, -1)
  if (waypoints.length > 0) params.set('waypoints', waypoints.join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
