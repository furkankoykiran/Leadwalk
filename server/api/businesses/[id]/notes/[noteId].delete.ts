import { deleteActivity, listActivities } from '../../../../utils/db'
import { appError, getLocale } from '../../../../utils/locale'
import { requireBusiness, requireId } from '../../../../utils/request'

export default defineEventHandler((event) => {
  const business = requireBusiness(event)
  const noteId = requireId(event, 'noteId')
  if (!deleteActivity(business.id, noteId)) throw appError(404, getLocale(event), 'notFound')
  return listActivities(business.id)
})
