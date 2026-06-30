// Supabase persistence (optional). If SUPABASE_URL / SUPABASE_SERVICE_KEY are
// not set, the server runs in-memory only (still shared + refresh-proof; just
// doesn't survive a server restart).
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
const ROW_ID = 1

let sb = null
if (url && key) sb = createClient(url, key, { auth: { persistSession: false } })

export const storeEnabled = () => !!sb

export async function loadState() {
  if (!sb) return null
  try {
    const { data, error } = await sb.from('game_state').select('data').eq('id', ROW_ID).maybeSingle()
    if (error) { console.warn('[store] load:', error.message); return null }
    return data?.data || null
  } catch (e) { console.warn('[store] load error:', e.message); return null }
}

export async function saveState(snapshot) {
  if (!sb) return
  try {
    const { error } = await sb.from('game_state').upsert({ id: ROW_ID, data: snapshot, updated_at: new Date().toISOString() })
    if (error) console.warn('[store] save:', error.message)
  } catch (e) { console.warn('[store] save error:', e.message) }
}
