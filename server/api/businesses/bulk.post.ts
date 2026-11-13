import type { BulkActionBody } from '#shared/types/business'
import { bulkDelete, bulkUpdateStatus, isValidStatus } from '../../utils/db'
import { appError, getLocale } from '../../utils/locale'

const MAX_IDS = 500

export default defineEventHandler(async (event) => {
  const locale = getLocale(event)
  const body = await readBody<BulkActionBody>(event)
  const ids = Array.isArray(body?.ids) ? body.ids.filter(id => Number.isInteger(id) && id > 0) : []
  if (ids.length === 0 || ids.length > MAX_IDS) throw appError(400, locale, 'invalidBody')

  if (body.action === 'delete') return { affected: bulkDelete(ids) }
  if (body.action === 'status') {
    if (!body.status || !isValidStatus(body.status)) throw appError(400, locale, 'invalidStatus')
    return { affected: bulkUpdateStatus(ids, body.status) }
  }
  throw appError(400, locale, 'invalidBody')
})
