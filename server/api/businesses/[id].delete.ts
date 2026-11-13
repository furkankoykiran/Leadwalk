import { deleteBusiness } from '../../utils/db'
import { requireBusiness } from '../../utils/request'

export default defineEventHandler((event) => {
  deleteBusiness(requireBusiness(event).id)
  return { success: true }
})
