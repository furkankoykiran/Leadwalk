import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type {
  Activity,
  ActivityType,
  ActivityWithBusiness,
  Business,
  BusinessStatus,
  DiscoveredBusiness,
  ProcessResultBody,
  SearchRecord,
} from '#shared/types/business'
import type { DailyUsage, UsageSummary } from '#shared/types/usage'

const LEGACY_DB_PATH = 'data/prospectforge.db'

/** DATABASE_PATH wins; the pre-rename variable and file keep working so an
 * upgrade never strands someone's existing leads. */
function resolveDbPath(): string {
  const configured = process.env.DATABASE_PATH || process.env.PROSPECTFORGE_DB_PATH
  if (configured) return configured
  return existsSync(LEGACY_DB_PATH) ? LEGACY_DB_PATH : 'data/leads.db'
}

const VALID_STATUSES: readonly BusinessStatus[] = ['discovered', 'processed', 'visited', 'won', 'lost']

let db: Database.Database | null = null

/** Columns added after the first release. Each is added on first use if
 * missing, so an existing database upgrades itself in place. */
const ADDED_COLUMNS: Array<[string, string]> = [
  ['lat', 'REAL'],
  ['lng', 'REAL'],
  ['reviews_json', 'TEXT'],
  ['ideas_json', 'TEXT'],
  ['type_label', 'TEXT'],
  ['types_json', 'TEXT'],
  ['district', 'TEXT'],
  ['international_phone', 'TEXT'],
  ['maps_uri', 'TEXT'],
  ['price_level', 'TEXT'],
  ['google_status', 'TEXT'],
  ['utc_offset_minutes', 'INTEGER'],
  ['opening_hours_json', 'TEXT'],
  ['signals_json', 'TEXT'],
  ['editorial_summary', 'TEXT'],
  ['review_summary_json', 'TEXT'],
  ['generated_locale', 'TEXT'],
  ['status_changed_at', 'TEXT'],
  ['last_visited_at', 'TEXT'],
  ['follow_up_at', 'TEXT'],
  ['deal_value', 'REAL'],
  ['search_id', 'INTEGER'],
]

/**
 * Opens (or creates) the local SQLite file and makes sure its schema is up
 * to date. Called lazily by every function below via `getDb()` — there's no
 * separate "run migrations" step, the schema just self-heals on first use.
 */
export function getDb(): Database.Database {
  if (db) return db
  const path = resolveDbPath()
  mkdirSync(dirname(path), { recursive: true })
  db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

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
  for (const [name, type] of ADDED_COLUMNS) ensureColumn(db, name, type)
  // Superseded by ideas_json (a business can now have several product ideas
  // instead of one fixed decision) — dropped for anyone upgrading from an
  // older version of the app.
  dropColumnIfExists(db, 'decision')
  dropColumnIfExists(db, 'decision_reason')
  dropColumnIfExists(db, 'build_prompt_md')

  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      body TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS activities_business ON activities(business_id, created_at);

    CREATE TABLE IF NOT EXISTS searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius_meters INTEGER NOT NULL,
      category TEXT,
      result_count INTEGER NOT NULL DEFAULT 0,
      new_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage_daily (
      date TEXT PRIMARY KEY,
      discover_count INTEGER NOT NULL DEFAULT 0,
      process_count INTEGER NOT NULL DEFAULT 0
    );
  `)
  ensureColumn(db, 'geocode_count', 'INTEGER NOT NULL DEFAULT 0', 'usage_daily')

  return db
}

/** Closes the connection (tests use this before deleting their temp
 * directory — Windows refuses to delete a file that is still open). */
export function closeDb(): void {
  db?.close()
  db = null
}

function ensureColumn(database: Database.Database, name: string, type: string, table = 'businesses'): void {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!columns.some(c => c.name === name)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`)
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

function now(): string {
  return new Date().toISOString()
}

function logActivity(
  businessId: number,
  type: ActivityType,
  fields: { from_status?: BusinessStatus | null; to_status?: BusinessStatus | null; body?: string | null } = {},
): void {
  getDb().prepare(`
    INSERT INTO activities (business_id, type, from_status, to_status, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(businessId, type, fields.from_status ?? null, fields.to_status ?? null, fields.body ?? null, now())
}

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------

const GOOGLE_FIELDS = [
  'name', 'category', 'type_label', 'types_json', 'address', 'district', 'phone', 'international_phone',
  'website_url', 'maps_uri', 'rating', 'review_count', 'price_level', 'google_status', 'lat', 'lng',
  'utc_offset_minutes', 'opening_hours_json', 'signals_json', 'editorial_summary', 'review_summary_json', 'reviews_json',
] as const

/** Inserts newly-discovered places, or refreshes an existing one's Google
 * data without touching anything the user or the AI added (status, notes,
 * profile, ideas). Matched by Google's place_id. Returns how many were new. */
export function upsertBusinesses(items: DiscoveredBusiness[], searchId: number | null = null): { newCount: number } {
  const database = getDb()
  const columns = ['place_id', ...GOOGLE_FIELDS]
  const stmt = database.prepare(`
    INSERT INTO businesses (${columns.join(', ')}, discovered_at, search_id)
    VALUES (${columns.map(c => `@${c}`).join(', ')}, @discovered_at, @search_id)
    ON CONFLICT(place_id) DO UPDATE SET
      ${GOOGLE_FIELDS.map(c => `${c} = excluded.${c}`).join(',\n      ')}
  `)
  const exists = database.prepare('SELECT id FROM businesses WHERE place_id = ?')
  let newCount = 0
  const insertMany = database.transaction((rows: DiscoveredBusiness[]) => {
    const discovered_at = now()
    for (const row of rows) {
      const isNew = !exists.get(row.place_id)
      const info = stmt.run({ ...row, discovered_at, search_id: searchId })
      if (isNew) {
        newCount++
        logActivity(Number(info.lastInsertRowid), 'discovered')
      }
    }
  })
  insertMany(items)
  return { newCount }
}

const SELECT_BUSINESS = `
  SELECT b.*, (SELECT COUNT(*) FROM activities a WHERE a.business_id = b.id AND a.type = 'note') AS notes_count
  FROM businesses b
`

export function listBusinesses(): Business[] {
  return getDb().prepare(`${SELECT_BUSINESS} ORDER BY b.discovered_at DESC, b.id DESC`).all() as Business[]
}

export function getBusiness(id: number): Business | undefined {
  return getDb().prepare(`${SELECT_BUSINESS} WHERE b.id = ?`).get(id) as Business | undefined
}

/** Stores a generation result. Only advances the status from "discovered"
 * to "processed" — regenerating ideas for a business already marked visited,
 * won or lost must not silently push it back down the funnel. */
export function saveProcessResult(id: number, result: ProcessResultBody, locale: string | null = null): void {
  const before = getBusiness(id)
  getDb().prepare(`
    UPDATE businesses SET
      status = CASE WHEN status = 'discovered' THEN 'processed' ELSE status END,
      status_changed_at = CASE WHEN status = 'discovered' THEN @processed_at ELSE status_changed_at END,
      profile_md = @profile_md,
      pitch_script_md = @pitch_script_md,
      ideas_json = @ideas_json,
      generated_locale = @locale,
      processed_at = @processed_at
    WHERE id = @id
  `).run({
    profile_md: result.profile_md,
    pitch_script_md: result.pitch_script_md,
    ideas_json: JSON.stringify(result.ideas),
    locale,
    id,
    processed_at: now(),
  })
  logActivity(id, 'generated', before?.status === 'discovered' ? { from_status: 'discovered', to_status: 'processed' } : {})
}

export function isValidStatus(value: string): value is BusinessStatus {
  return (VALID_STATUSES as readonly string[]).includes(value)
}

export function updateStatus(id: number, status: BusinessStatus): void {
  const before = getBusiness(id)
  if (!before || before.status === status) return
  const at = now()
  getDb().prepare(`
    UPDATE businesses SET status = @status, status_changed_at = @at,
      last_visited_at = CASE WHEN @status = 'visited' THEN @at ELSE last_visited_at END
    WHERE id = @id
  `).run({ status, at, id })
  logActivity(id, 'status', { from_status: before.status, to_status: status })
}

export function setFollowUp(id: number, followUpAt: string | null): void {
  getDb().prepare('UPDATE businesses SET follow_up_at = ? WHERE id = ?').run(followUpAt, id)
  if (followUpAt) logActivity(id, 'follow_up', { body: followUpAt })
}

export function setDealValue(id: number, value: number | null): void {
  getDb().prepare('UPDATE businesses SET deal_value = ? WHERE id = ?').run(value, id)
}

export function deleteBusiness(id: number): void {
  getDb().prepare('DELETE FROM businesses WHERE id = ?').run(id)
}

export function deleteAllBusinesses(): void {
  const database = getDb()
  database.transaction(() => {
    database.exec('DELETE FROM activities')
    database.exec('DELETE FROM businesses')
    database.exec('DELETE FROM searches')
  })()
}

export function bulkUpdateStatus(ids: number[], status: BusinessStatus): number {
  let changed = 0
  getDb().transaction(() => {
    for (const id of ids) {
      const before = getBusiness(id)
      if (before && before.status !== status) {
        updateStatus(id, status)
        changed++
      }
    }
  })()
  return changed
}

export function bulkDelete(ids: number[]): number {
  const stmt = getDb().prepare('DELETE FROM businesses WHERE id = ?')
  let removed = 0
  getDb().transaction(() => {
    for (const id of ids) removed += stmt.run(id).changes
  })()
  return removed
}

// ---------------------------------------------------------------------------
// Notes and activity history
// ---------------------------------------------------------------------------

export function addNote(businessId: number, body: string): void {
  logActivity(businessId, 'note', { body })
}

export function deleteActivity(businessId: number, activityId: number): boolean {
  return getDb().prepare("DELETE FROM activities WHERE id = ? AND business_id = ? AND type = 'note'").run(activityId, businessId).changes > 0
}

export function listActivities(businessId: number): Activity[] {
  return getDb().prepare('SELECT * FROM activities WHERE business_id = ? ORDER BY created_at DESC, id DESC').all(businessId) as Activity[]
}

export function recentActivities(limit = 15): ActivityWithBusiness[] {
  return getDb().prepare(`
    SELECT a.*, b.name AS business_name FROM activities a
    JOIN businesses b ON b.id = a.business_id
    ORDER BY a.created_at DESC, a.id DESC LIMIT ?
  `).all(limit) as ActivityWithBusiness[]
}

// ---------------------------------------------------------------------------
// Search history
// ---------------------------------------------------------------------------

export function createSearch(fields: Omit<SearchRecord, 'id' | 'created_at' | 'result_count' | 'new_count'>): number {
  const info = getDb().prepare(`
    INSERT INTO searches (address, lat, lng, radius_meters, category, created_at)
    VALUES (@address, @lat, @lng, @radius_meters, @category, @created_at)
  `).run({ ...fields, created_at: now() })
  return Number(info.lastInsertRowid)
}

export function finishSearch(id: number, resultCount: number, newCount: number): void {
  getDb().prepare('UPDATE searches SET result_count = ?, new_count = ? WHERE id = ?').run(resultCount, newCount, id)
}

export function listSearches(): SearchRecord[] {
  return getDb().prepare('SELECT * FROM searches ORDER BY created_at DESC, id DESC').all() as SearchRecord[]
}

// ---------------------------------------------------------------------------
// Usage (self-monitoring for the billable actions), bucketed by the
// user's calendar day in their browser's time zone.
// ---------------------------------------------------------------------------

/** YYYY-MM-DD for `at` in `timeZone` (the browser's, sent with each request),
 * falling back to the server's local day. */
export function todayString(at: Date = new Date(), timeZone?: string): string {
  if (timeZone) {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
    } catch {
      // Unknown zone: fall through to the server's local day.
    }
  }
  const y = at.getFullYear()
  const m = String(at.getMonth() + 1).padStart(2, '0')
  const d = String(at.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export type UsageAction = 'discover' | 'process' | 'geocode'

export function incrementUsage(action: UsageAction, timeZone?: string): void {
  const date = todayString(new Date(), timeZone)
  const column = { discover: 'discover_count', process: 'process_count', geocode: 'geocode_count' }[action]
  getDb().prepare(`
    INSERT INTO usage_daily (date, ${column}) VALUES (@date, 1)
    ON CONFLICT(date) DO UPDATE SET ${column} = ${column} + 1
  `).run({ date })
}

export function getTodayUsage(timeZone?: string): DailyUsage {
  const date = todayString(new Date(), timeZone)
  const row = getDb().prepare('SELECT date, discover_count, process_count, geocode_count FROM usage_daily WHERE date = ?').get(date) as DailyUsage | undefined
  return row ?? { date, discover_count: 0, process_count: 0, geocode_count: 0 }
}

/** Today plus month-to-date totals, which is what the free tiers are
 * counted against (Google resets them monthly). */
export function getUsageSummary(timeZone?: string): UsageSummary {
  const today = getTodayUsage(timeZone)
  const month = today.date.slice(0, 7)
  const row = getDb().prepare(`
    SELECT COALESCE(SUM(discover_count), 0) AS discover_count,
           COALESCE(SUM(process_count), 0) AS process_count,
           COALESCE(SUM(geocode_count), 0) AS geocode_count
    FROM usage_daily WHERE substr(date, 1, 7) = ?
  `).get(month) as Omit<DailyUsage, 'date'>
  return { today, month: { month, ...row } }
}
