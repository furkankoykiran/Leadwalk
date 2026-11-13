import { getBusiness, isValidStatus, updateStatus } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Geçersiz id' })
  }

  const body = await readBody<{ status?: string }>(event)
  if (!body?.status || !isValidStatus(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Geçersiz durum' })
  }

  const business = getBusiness(id)
  if (!business) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'İşletme bulunamadı' })
  }

  updateStatus(id, body.status)
  return getBusiness(id)
})
