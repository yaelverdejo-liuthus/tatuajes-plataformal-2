import { createClient } from '@supabase/supabase-js'
import type { Database } from './tipos'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env.local y llénalas.',
  )
}

/**
 * Cliente único. La anon key es pública por diseño: toda la seguridad
 * vive en las políticas RLS de Postgres, no en esconder la llave.
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 5 } },
})
