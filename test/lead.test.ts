import { describe, expect, it } from 'vitest'
import { directionsUrl, placeUrl, whatsappUrl } from '../app/utils/lead'

const business = { name: 'Kahve Durağı', place_id: 'ChIJabc', lat: 39.92, lng: 32.85, maps_uri: null }

describe('placeUrl', () => {
  it('prefers Google\'s own place link', () => {
    expect(placeUrl({ ...business, maps_uri: 'https://maps.google.com/?cid=1' })).toBe('https://maps.google.com/?cid=1')
  })

  it('falls back to a Maps search pinned to the place_id', () => {
    const url = placeUrl(business)
    expect(url).toContain('query=39.92,32.85')
    expect(url).toContain('query_place_id=ChIJabc')
  })

  it('searches by name when there are no coordinates', () => {
    expect(placeUrl({ ...business, lat: null, lng: null })).toContain(`query=${encodeURIComponent('Kahve Durağı')}`)
  })
})

describe('directionsUrl', () => {
  it('asks for walking directions to the place', () => {
    const url = new URL(directionsUrl(business))
    expect(url.searchParams.get('travelmode')).toBe('walking')
    expect(url.searchParams.get('destination')).toBe('39.92,32.85')
    expect(url.searchParams.get('destination_place_id')).toBe('ChIJabc')
  })
})

describe('whatsappUrl', () => {
  it('turns an international number into a wa.me link', () => {
    expect(whatsappUrl('+90 532 123 45 67')).toBe('https://wa.me/905321234567')
  })

  it('returns null without a usable number', () => {
    expect(whatsappUrl(null)).toBeNull()
    expect(whatsappUrl('+90')).toBeNull()
  })
})
