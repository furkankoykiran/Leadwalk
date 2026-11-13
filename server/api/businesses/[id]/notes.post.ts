import { addNote, listActivities } from '../../../utils/db'
import { appError, getLocale } from '../../../utils/locale'
import { requireBusiness } from '../../../utils/request'

const MAX_NOTE_LENGTH = 4000

export default defineEventHandler(async (event) => {
  const business = requireBusiness(event)
  const body = await readBody<{ body?: unknown }>(event)
  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!text || text.length > MAX_NOTE_LENGTH) throw appError(400, getLocale(event), 'invalidBody')
  addNote(business.id, text)
  return listActivities(business.id)
})
