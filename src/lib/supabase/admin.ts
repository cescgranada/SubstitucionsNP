import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Client amb la clau de servei: es salta RLS. Només per a tasques de servidor
 * sense sessió d'usuari (el resum de la vespra); mai des d'una acció que
 * respongui a una persona, i mai exposat al navegador.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
