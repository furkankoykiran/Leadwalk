import { getBusiness, incrementUsage, saveProcessResult } from '../../utils/db'
import { processBusinessWithGemini } from '../../utils/gemini'
import { appError, getLocale, getTimeZone } from '../../utils/locale'
import { requireBusiness } from '../../utils/request'

export default defineEventHandler(async (event) => {
  const locale = getLocale(event)
  const business = requireBusiness(event)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw appError(500, locale, 'missingGeminiKey')

  const result = await processBusinessWithGemini(business, apiKey, locale)
  incrementUsage('process', getTimeZone(event))
  saveProcessResult(business.id, result, locale)
  return getBusiness(business.id)
})
