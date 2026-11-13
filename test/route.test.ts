import { describe, expect, it } from 'vitest'
import { googleMapsRouteUrl, haversineMeters, MAX_ROUTE_STOPS, orderByNearestNeighbour, routeLengthMeters } from '../app/utils/route'

describe('haversineMeters', () => {
  it('measures roughly 111 km per degree of latitude', () => {
    expect(haversineMeters({ lat: 39, lng: 32 }, { lat: 40, lng: 32 })).toBeGreaterThan(110_000)
    expect(haversineMeters({ lat: 39, lng: 32 }, { lat: 40, lng: 32 })).toBeLessThan(112_000)
  })
})

describe('orderByNearestNeighbour', () => {
  it('starts at the first stop and always walks to the closest next one', () => {
    const a = { id: 1, lat: 0, lng: 0 }
    const far = { id: 2, lat: 0, lng: 0.03 }
    const near = { id: 3, lat: 0, lng: 0.01 }
    const mid = { id: 4, lat: 0, lng: 0.02 }
    expect(orderByNearestNeighbour([a, far, near, mid]).map(s => s.id)).toEqual([1, 3, 4, 2])
  })

  it('never makes a straight-line walk longer than the given order', () => {
    const stops = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.03 }, { lat: 0, lng: 0.01 }, { lat: 0, lng: 0.02 }]
    expect(routeLengthMeters(orderByNearestNeighbour(stops))).toBeLessThan(routeLengthMeters(stops))
  })
})

describe('googleMapsRouteUrl', () => {
  it('builds a walking directions link with origin, waypoints and destination', () => {
    const url = new URL(googleMapsRouteUrl([{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, { lat: 5, lng: 6 }]))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('travelmode')).toBe('walking')
    expect(url.searchParams.get('origin')).toBe('1,2')
    expect(url.searchParams.get('waypoints')).toBe('3,4')
    expect(url.searchParams.get('destination')).toBe('5,6')
  })

  it('caps the stops at what Google Maps accepts', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ lat: i, lng: i }))
    const url = new URL(googleMapsRouteUrl(many))
    expect(url.searchParams.get('waypoints')!.split('|')).toHaveLength(MAX_ROUTE_STOPS - 2)
  })
})
