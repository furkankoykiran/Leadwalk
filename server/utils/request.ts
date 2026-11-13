import type { H3Event } from 'h3'
import type { Business } from '#shared/types/business'
import { getBusiness } from './db'
import { appError, getLocale } from './locale'

/** Reads the numeric `:id` route param or throws a localised 400. */
export function requireId(event: H3Event, param = 'id'): number {
  const id = Number(getRouterParam(event, param))
  if (!Number.isInteger(id) || id <= 0) throw appError(400, getLocale(event), 'invalidId')
  return id
}

/** Loads the business named by `:id` or throws a localised 404. */
export function requireBusiness(event: H3Event): Business {
  const business = getBusiness(requireId(event))
  if (!business) throw appError(404, getLocale(event), 'notFound')
  return business
}
