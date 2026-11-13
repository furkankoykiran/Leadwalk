import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { DiscoveredBusiness, ProductIdea } from '#shared/types/business'

// db.ts resolves its file path once at module load, so the override has to be
// set before the dynamic import below. This is what PROSPECTFORGE_DB_PATH is
// for: keeping tests off the working-directory database.
let dir: string
let db: typeof import('../server/utils/db')

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'prospectforge-test-'))
  process.env.PROSPECTFORGE_DB_PATH = join(dir, 'nested', 'test.db')
  db = await import('../server/utils/db')
})

afterAll(() => {
  // Close first: Windows cannot delete the directory while the SQLite file
  // (and its WAL/SHM side files) are still held open.
  db.closeDb()
  rmSync(dir, { recursive: true, force: true })
})

beforeEach(() => {
  db.deleteAllBusinesses()
})

function discovered(overrides: Partial<DiscoveredBusiness> = {}): DiscoveredBusiness {
  return {
    place_id: 'place-1',
    name: 'Kahve Dünyası',
    category: 'cafe',
    address: 'Bir Sokak 1',
    phone: '+90 555 000 0000',
    website_url: null,
    rating: 4.5,
    review_count: 120,
    lat: 41.0082,
    lng: 28.9784,
    reviews_json: null,
    ...overrides,
  }
}

const idea: ProductIdea = {
  title: 'QR Menü',
  description: 'Masadan okunan dijital menü.',
  price_estimate: '15.000 TL',
  needs_cms: true,
  build_prompt: 'Build a QR menu.',
}

describe('schema bootstrap', () => {
  it('creates the database file and its parent directory on first use', () => {
    // The configured path includes a directory that does not exist yet.
    expect(() => db.getDb()).not.toThrow()
    expect(db.listBusinesses()).toEqual([])
  })
})

describe('upsertBusinesses', () => {
  it('inserts discovered businesses', () => {
    db.upsertBusinesses([discovered(), discovered({ place_id: 'place-2', name: 'Fırın' })])

    const all = db.listBusinesses()
    expect(all).toHaveLength(2)
    expect(all.map(b => b.name).sort()).toEqual(['Fırın', 'Kahve Dünyası'])
  })

  it('defaults new businesses to the discovered status', () => {
    db.upsertBusinesses([discovered()])
    expect(db.listBusinesses()[0]!.status).toBe('discovered')
  })

  it('is idempotent on place_id rather than creating duplicates', () => {
    db.upsertBusinesses([discovered()])
    db.upsertBusinesses([discovered()])
    expect(db.listBusinesses()).toHaveLength(1)
  })

  it('refreshes Google-sourced fields on re-discovery', () => {
    db.upsertBusinesses([discovered()])
    db.upsertBusinesses([discovered({ name: 'Kahve Dünyası A.Ş.', rating: 4.8, phone: null })])

    const business = db.listBusinesses()[0]!
    expect(business.name).toBe('Kahve Dünyası A.Ş.')
    expect(business.rating).toBe(4.8)
    expect(business.phone).toBeNull()
  })

  it('preserves AI-generated work when a business is re-discovered', () => {
    db.upsertBusinesses([discovered()])
    const id = db.listBusinesses()[0]!.id
    db.saveProcessResult(id, {
      profile_md: '# Profil',
      pitch_script_md: '# Pitch',
      ideas: [idea],
    })
    db.updateStatus(id, 'won')

    db.upsertBusinesses([discovered({ name: 'Yeni Ad' })])

    const business = db.getBusiness(id)!
    expect(business.name).toBe('Yeni Ad')
    expect(business.status).toBe('won')
    expect(business.profile_md).toBe('# Profil')
    expect(business.pitch_script_md).toBe('# Pitch')
    expect(business.ideas_json).toBe(JSON.stringify([idea]))
  })
})

describe('getBusiness', () => {
  it('returns undefined for an unknown id', () => {
    expect(db.getBusiness(999_999)).toBeUndefined()
  })
})

describe('saveProcessResult', () => {
  it('stores the generated output and marks the business processed', () => {
    db.upsertBusinesses([discovered()])
    const id = db.listBusinesses()[0]!.id

    db.saveProcessResult(id, { profile_md: 'P', pitch_script_md: 'S', ideas: [idea] })

    const business = db.getBusiness(id)!
    expect(business.status).toBe('processed')
    expect(business.profile_md).toBe('P')
    expect(business.processed_at).not.toBeNull()
    expect(JSON.parse(business.ideas_json!)).toEqual([idea])
  })

  it('does not push a visited/won/lost business back to processed on regeneration', () => {
    db.upsertBusinesses([discovered()])
    const id = db.listBusinesses()[0]!.id
    db.updateStatus(id, 'won')

    db.saveProcessResult(id, { profile_md: 'P2', pitch_script_md: 'S2', ideas: [idea] })

    const business = db.getBusiness(id)!
    expect(business.status).toBe('won')
    expect(business.profile_md).toBe('P2')
  })
})

describe('isValidStatus', () => {
  it.each(['discovered', 'processed', 'visited', 'won', 'lost'])('accepts %s', (status) => {
    expect(db.isValidStatus(status)).toBe(true)
  })

  it.each(['', 'WON', 'archived', 'constructor', 'toString'])('rejects %s', (status) => {
    expect(db.isValidStatus(status)).toBe(false)
  })
})

describe('deletion', () => {
  it('removes a single business and leaves the rest', () => {
    db.upsertBusinesses([discovered(), discovered({ place_id: 'place-2' })])
    const id = db.listBusinesses()[0]!.id

    db.deleteBusiness(id)

    const remaining = db.listBusinesses()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.id).not.toBe(id)
  })

  it('clears every business', () => {
    db.upsertBusinesses([discovered(), discovered({ place_id: 'place-2' })])
    db.deleteAllBusinesses()
    expect(db.listBusinesses()).toEqual([])
  })
})

describe('daily usage', () => {
  it('counts discover and process actions independently', () => {
    const before = db.getTodayUsage()

    db.incrementUsage('discover')
    db.incrementUsage('discover')
    db.incrementUsage('process')

    const after = db.getTodayUsage()
    expect(after.discover_count).toBe(before.discover_count + 2)
    expect(after.process_count).toBe(before.process_count + 1)
  })

  it('reports today, in ISO date form', () => {
    expect(db.getTodayUsage().date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('uses the local calendar day rather than the UTC one', () => {
    // 00:30 local on 14 Nov is still 13 Nov in UTC for any zone east of UTC.
    const justAfterLocalMidnight = new Date(2026, 10, 14, 0, 30)
    expect(db.todayString(justAfterLocalMidnight)).toBe('2026-11-14')
  })
})
