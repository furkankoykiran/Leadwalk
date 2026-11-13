import { requireBusiness } from '../../utils/request'

export default defineEventHandler(event => requireBusiness(event))
