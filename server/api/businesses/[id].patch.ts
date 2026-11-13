import type { BusinessUpdateBody } from '#shared/types/business'
import { getBusiness, isValidStatus, setDealValue, setFollowUp, updateStatus } from '../../utils/db'
import { appError, getLocale } from '../../utils/locale'
import { requireBusiness } from '../../utils/request'

/** Partial update of the user-owned fields: pipeline status, follow-up
 * date (ISO, or null to clear) and deal value. */
export default defineEventHandler(async (event) => {
  const locale = getLocale(event)
  const business = requireBusiness(event)
  const body = await readBody<BusinessUpdateBody>(event)
  if (!body || typeof body !== 'object') throw appError(400, locale, 'invalidBody')

  if (body.status !== undefined && (typeof body.status !== 'string' || !isValidStatus(body.status))) {
    throw appError(400, locale, 'invalidStatus')
  }
  if (body.follow_up_at !== undefined && body.follow_up_at !== null
    && (typeof body.follow_up_at !== 'string' || Number.isNaN(Date.parse(body.follow_up_at)))) {
    throw appError(400, locale, 'invalidBody')
  }
  if (body.deal_value !== undefined && body.deal_value !== null
    && (typeof body.deal_value !== 'number' || !Number.isFinite(body.deal_value) || body.deal_value < 0)) {
    throw appError(400, locale, 'invalidBody')
  }

  if (body.status !== undefined) updateStatus(business.id, body.status)
  if (body.follow_up_at !== undefined) {
    setFollowUp(business.id, body.follow_up_at === null ? null : new Date(body.follow_up_at).toISOString())
  }
  if (body.deal_value !== undefined) setDealValue(business.id, body.deal_value)

  return getBusiness(business.id)
})
