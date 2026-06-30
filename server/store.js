// Postgres persistence (Railway). If DATABASE_URL is not set, the server runs
// in-memory only (still shared + refresh-proof; just doesn't survive a restart).
import pg from 'pg'

const url = process.env.DATABASE_URL
let pool = null
if (url) {
  pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }, // Railway postgres-ssl
    max: 4,
    connectionTimeoutMillis: 8000, // fail fast instead of hanging
  })
  pool.on('error', (e) => console.warn('[store] pool error:', e.message))
}

export const storeEnabled = () => !!pool

export async function initStore() {
  if (!pool) return
  await pool.query(
    'create table if not exists game_state (id int primary key, data jsonb, updated_at timestamptz default now())',
  )
}

export async function loadState() {
  if (!pool) return null
  try {
    const r = await pool.query('select data from game_state where id = 1')
    return r.rows[0]?.data || null
  } catch (e) { console.warn('[store] load:', e.message); return null }
}

export async function saveState(snapshot) {
  if (!pool) return
  try {
    await pool.query(
      'insert into game_state (id, data, updated_at) values (1, $1::jsonb, now()) ' +
      'on conflict (id) do update set data = excluded.data, updated_at = now()',
      [JSON.stringify(snapshot)],
    )
  } catch (e) { console.warn('[store] save:', e.message) }
}
