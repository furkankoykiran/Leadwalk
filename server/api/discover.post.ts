import { incrementUsage, upsertBusinesses } from '../utils/db'
import { geocodeAddress, nearbySearch } from '../utils/places'
import type { DiscoverRequestBody } from '#shared/types/business'

// Places Nearby Search accepts a radius in (0, 50000] metres.
const MAX_RADIUS_METERS = 50_000
const DEFAULT_RADIUS_METERS = 3000

function badRequest(message: string): Error {
  return createError({ statusCode: 400, statusMessage: 'Bad Request', message })
}

export default defineEventHandler(async (event) => {
  const body = await readBody<DiscoverRequestBody>(event)
  const location = typeof body?.location === 'string' ? body.location.trim() : ''
  const hasCoords = Number.isFinite(body?.lat) && Number.isFinite(body?.lng)
  if (!location && !hasCoords) {
    throw badRequest('Bir adres yaz ya da haritada bir nokta seç.')
  }

  const radiusMeters = body.radiusMeters ?? DEFAULT_RADIUS_METERS
  if (typeof radiusMeters !== 'number' || !Number.isFinite(radiusMeters) || radiusMeters <= 0 || radiusMeters > MAX_RADIUS_METERS) {
    throw badRequest(`Yarıçap 0 ile ${MAX_RADIUS_METERS} metre arasında olmalı.`)
  }
  if (body.category !== undefined && (typeof body.category !== 'string' || !/^[a-z_]+$/.test(body.category))) {
    throw badRequest('Geçersiz kategori.')
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing GOOGLE_MAPS_API_KEY',
      message: 'GOOGLE_MAPS_API_KEY tanımlı değil. .env dosyasını kontrol et.',
    })
  }

  // A typed address takes precedence over a pin when both are sent.
  const center = location
    ? await geocodeAddress(location, apiKey)
    : { lat: body.lat as number, lng: body.lng as number }
  const places = await nearbySearch(center, radiusMeters, body.category, apiKey)
  incrementUsage('discover')

  if (places.length === 0) {
    return { count: 0, message: 'Bu bölgede işletme bulunamadı.' }
  }

  upsertBusinesses(places)
  return { count: places.length }
})
