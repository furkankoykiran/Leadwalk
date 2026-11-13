import { getUsageSummary } from '../utils/db'
import { getTimeZone } from '../utils/locale'

export default defineEventHandler(event => getUsageSummary(getTimeZone(event)))
