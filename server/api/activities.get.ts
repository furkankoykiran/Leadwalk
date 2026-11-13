import { recentActivities } from '../utils/db'

export default defineEventHandler((event) => {
  const limit = Math.min(100, Math.max(1, Number(getQuery(event).limit) || 15))
  return recentActivities(limit)
})
