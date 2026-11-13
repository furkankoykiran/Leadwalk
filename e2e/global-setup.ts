import { rmSync } from 'node:fs'
import { SAMPLE_PLACES } from './seed'

export const E2E_DB = 'data/e2e.db'

/** Fresh database with the sample leads before every run. The dev server
 * only opens the file on its first API request, which comes after this. */
export default async function globalSetup() {
  for (const suffix of ['', '-wal', '-shm']) rmSync(`${E2E_DB}${suffix}`, { force: true })
  process.env.DATABASE_PATH = E2E_DB
  const db = await import('../server/utils/db')
  db.upsertBusinesses(SAMPLE_PLACES)
  const byPlace = new Map(db.listBusinesses().map(b => [b.place_id, b.id]))

  const cafe = byPlace.get('e2e-istiklal')!
  db.updateStatus(cafe, 'visited')
  // A fixed instant, so tests can assert it renders in the browser's zone:
  // 09:00 UTC = 12:00 in Istanbul = 04:00 in New York.
  db.setFollowUp(cafe, '2026-11-20T09:00:00.000Z')

  const dentist = byPlace.get('e2e-dentist')!
  db.updateStatus(dentist, 'visited')
  db.updateStatus(dentist, 'won')
  db.setDealValue(dentist, 4500)
  db.closeDb()
}
