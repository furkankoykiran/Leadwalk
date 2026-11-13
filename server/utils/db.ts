import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Business, BusinessStatus, DiscoveredBusiness, ProcessResultBody } from '#shared/types/business'
import type { DailyUsage } from '#shared/types/usage'

// Overridable so tests (and non-default deployments) can point at their own
// file instead of the working-directory default.
const DB_PATH = process.env.PROSPECTFORGE_DB_PATH || 'data/prospectforge.db'
const VALID_STATUSES: readonly BusinessStatus[] = ['discovered', 'processed', 'visited', 'won', 'lost']

let db: Database.Database | null = null

/**
 * Opens (or creates) the local SQLite file and makes sure its schema is up
 * to date. Called lazily by every function below via `getDb()` — there's no
 * separate "run migrations" step, the schema just self-heals on first use.
 */
export function getDb(): Database.Database {
  if (db) return db
  mkdirSync(dirname(DB_PATH), { recursive: true })
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      address TEXT,
      phone TEXT,
      website_url TEXT,
      rating REAL,
      review_count INTEGER,
      lat REAL,
      lng REAL,
      reviews_json TEXT,
      status TEXT NOT NULL DEFAULT 'discovered',
      profile_md TEXT,
      pitch_script_md TEXT,
      ideas_json TEXT,
      discovered_at TEXT NOT NULL,
      processed_at TEXT
    )
  `)
  // Columns added after the table already existed for early users — each
  // call is a no-op once the column is present. See ensureColumn() below.
  ensureColumn(db, 'lat', 'REAL')
  ensureColumn(db, 'lng', 'REAL')
  ensureColumn(db, 'reviews_json', 'TEXT')
  ensureColumn(db, 'ideas_json', 'TEXT')
  // Superseded by ideas_json (a business can now have several product ideas
  // instead of one fixed decision) — dropped for anyone upgrading from an
  // older version of the app.
  dropColumnIfExists(db, 'decision')
  dropColumnIfExists(db, 'decision_reason')
  dropColumnIfExists(db, 'build_prompt_md')

  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_daily (
      date TEXT PRIMARY KEY,
      discover_count INTEGER NOT NULL DEFAULT 0,
      process_count INTEGER NOT NULL DEFAULT 0
    )
  `)

  return db
}

/** Closes the connection (tests use this before deleting their temp
 * directory — Windows refuses to delete a file that is still open). */
export function closeDb(): void {
  db?.close()
  db = null
}

function ensureColumn(database: Database.Database, name: string, type: string): void {
  const columns = database.prepare('PRAGMA table_info(businesses)').all() as Array<{ name: string }>
  if (!columns.some(c => c.name === name)) {
    database.exec(`ALTER TABLE businesses ADD COLUMN ${name} ${type}`)
  }
}

function dropColumnIfExists(database: Database.Database, name: string): void {
  const columns = database.prepare('PRAGMA table_info(businesses)').all() as Array<{ name: string }>
  if (!columns.some(c => c.name === name)) return
  try {
    database.exec(`ALTER TABLE businesses DROP COLUMN ${name}`)
  } catch {
    // Older SQLite builds don't support DROP COLUMN — leave it, it's inert.
  }
}

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------

/** Inserts newly-discovered places, or refreshes an existing one's raw Google
 * data (name/address/rating/etc.) without touching anything the AI already
 * generated for it (status, profile, ideas). Matched by Google's place_id. */
export function upsertBusinesses(items: DiscoveredBusiness[]): void {
  const database = getDb()
  const stmt = database.prepare(`
    INSERT INTO businesses (place_id, name, category, address, phone, website_url, rating, review_count, lat, lng, reviews_json, discovered_at)
    VALUES (@place_id, @name, @category, @address, @phone, @website_url, @rating, @review_count, @lat, @lng, @reviews_json, @discovered_at)
    ON CONFLICT(place_id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      address = excluded.address,
      phone = excluded.phone,
      website_url = excluded.website_url,
      rating = excluded.rating,
      review_count = excluded.review_count,
      lat = excluded.lat,
      lng = excluded.lng,
      reviews_json = excluded.reviews_json
  `)
  const insertMany = database.transaction((rows: DiscoveredBusiness[]) => {
    const discovered_at = new Date().toISOString()
    for (const row of rows) {
      stmt.run({ ...row, discovered_at })
    }
  })
  insertMany(items)
}

export function listBusinesses(): Business[] {
  return getDb().prepare('SELECT * FROM businesses ORDER BY discovered_at DESC').all() as Business[]
}

export function getBusiness(id: number): Business | undefined {
  return getDb().prepare('SELECT * FROM businesses WHERE id = ?').get(id) as Business | undefined
}

/** Stores a generation result. Only advances the status from "discovered"
 * to "processed" — regenerating ideas for a business already marked visited,
 * won or lost must not silently push it back down the funnel. */
export function saveProcessResult(id: number, result: ProcessResultBody): void {
  getDb().prepare(`
    UPDATE businesses SET
      status = CASE WHEN status = 'discovered' THEN 'processed' ELSE status END,
      profile_md = @profile_md,
      pitch_script_md = @pitch_script_md,
      ideas_json = @ideas_json,
      processed_at = @processed_at
    WHERE id = @id
  `).run({
    profile_md: result.profile_md,
    pitch_script_md: result.pitch_script_md,
    ideas_json: JSON.stringify(result.ideas),
    id,
    processed_at: new Date().toISOString(),
  })
}

export function isValidStatus(value: string): value is BusinessStatus {
  return (VALID_STATUSES as readonly string[]).includes(value)
}

export function updateStatus(id: number, status: BusinessStatus): void {
  getDb().prepare('UPDATE businesses SET status = ? WHERE id = ?').run(status, id)
}

export function deleteBusiness(id: number): void {
  getDb().prepare('DELETE FROM businesses WHERE id = ?').run(id)
}

export function deleteAllBusinesses(): void {
  getDb().exec('DELETE FROM businesses')
}

// ---------------------------------------------------------------------------
// Daily usage (self-monitoring for the two billable actions: discover + process)
// ---------------------------------------------------------------------------

/** Today's date on the machine's local clock (YYYY-MM-DD). toISOString()
 * would use UTC, so in Turkey (UTC+3) the "today" counter rolled over at
 * 03:00 and searches made after midnight landed on the previous day. */
export function todayString(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function incrementUsage(action: 'discover' | 'process'): void {
  const date = todayString()
  const column = action === 'discover' ? 'discover_count' : 'process_count'
  getDb().prepare(`
    INSERT INTO usage_daily (date, ${column}) VALUES (@date, 1)
    ON CONFLICT(date) DO UPDATE SET ${column} = ${column} + 1
  `).run({ date })
}

export function getTodayUsage(): DailyUsage {
  const date = todayString()
  const row = getDb().prepare('SELECT * FROM usage_daily WHERE date = ?').get(date) as DailyUsage | undefined
  return row ?? { date, discover_count: 0, process_count: 0 }
}
