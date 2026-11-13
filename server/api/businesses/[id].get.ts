import { getBusiness } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Geçersiz id' })
  }

  const business = getBusiness(id)
  if (!business) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'İşletme bulunamadı' })
  }

  return business
})
