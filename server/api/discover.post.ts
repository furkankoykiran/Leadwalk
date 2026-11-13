import type { DiscoverRequestBody, DiscoverResponse } from '#shared/types/business'
import { createSearch, finishSearch, incrementUsage, upsertBusinesses } from '../utils/db'
import { appError, getLocale, getTimeZone, msg } from '../utils/locale'
import { geocodeAddress, nearbySearch } from '../utils/places'

// Places Nearby Search accepts a radius in (0, 50000] metres.
const MAX_RADIUS_METERS = 50_000
const DEFAULT_RADIUS_METERS = 3000

export default defineEventHandler(async (event): Promise<DiscoverResponse> => {
  const locale = getLocale(event)
  const timeZone = getTimeZone(event)
  const body = await readBody<DiscoverRequestBody>(event)
  const location = typeof body?.location === 'string' ? body.location.trim() : ''
  const hasCoords = Number.isFinite(body?.lat) && Number.isFinite(body?.lng)
  if (!location && !hasCoords) throw appError(400, locale, 'needLocation')

  const radiusMeters = body.radiusMeters ?? DEFAULT_RADIUS_METERS
  if (typeof radiusMeters !== 'number' || !Number.isFinite(radiusMeters) || radiusMeters <= 0 || radiusMeters > MAX_RADIUS_METERS) {
    throw appError(400, locale, 'badRadius', { max: MAX_RADIUS_METERS })
  }
  if (body.category !== undefined && (typeof body.category !== 'string' || !/^[a-z_]+$/.test(body.category))) {
    throw appError(400, locale, 'badCategory')
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw appError(500, locale, 'missingMapsKey')

  // A typed address takes precedence over a pin when both are sent.
  let center: { lat: number; lng: number }
  if (location) {
    center = await geocodeAddress(location, apiKey, locale)
    incrementUsage('geocode', timeZone)
  } else {
    center = { lat: body.lat as number, lng: body.lng as number }
  }

  const places = await nearbySearch(center, radiusMeters, body.category, apiKey, locale)
  incrementUsage('discover', timeZone)

  const searchId = createSearch({
    address: location || null,
    lat: center.lat,
    lng: center.lng,
    radius_meters: radiusMeters,
    category: body.category ?? null,
  })

  if (places.length === 0) {
    finishSearch(searchId, 0, 0)
    return { count: 0, new_count: 0, search_id: searchId, message: msg(locale, 'noneFound') }
  }

  const { newCount } = upsertBusinesses(places, searchId)
  finishSearch(searchId, places.length, newCount)
  return { count: places.length, new_count: newCount, search_id: searchId }
})
