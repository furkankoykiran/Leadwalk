import { listActivities } from '../../../utils/db'
import { requireBusiness } from '../../../utils/request'

export default defineEventHandler(event => listActivities(requireBusiness(event).id))
