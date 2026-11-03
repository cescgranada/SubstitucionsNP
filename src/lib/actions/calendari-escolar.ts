'use server'

import { createClient } from '@/lib/supabase/server'
import { esEquipDirectiu } from '@/lib/roles'
import { diesLaborables } from '@/lib/curs'
import { revalidatePath } from 'next/cache'

type Supabase = Awaited<ReturnType<typeof createClient>>

const TIPUS = ['festiu', 'festa_local', 'vacances', 'no_lectiu', 'fora_de_curs']
const DATA = /^\d{4}-\d{2}-\d{2}$/

async function comprovaGestor(supabase: Supabase): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return 'Sessió no vàlida'
  const { data: docent } = await supabase.from('docents').select('id').eq('email', user.email).single()
  if (!docent) return 'Sessió no vàlida'
  const { data: rols } = await supabase.from('docent_rols').select('rol').eq('docent_id', docent.id)
  return esEquipDirectiu(rols) ? null : 'Sense permís per canviar el calendari escolar'
}

/**
 * Marca com a dies sense classe tots els dies laborables d'un interval (els
 * caps de setmana ja s'ometen sempre). Si un dia ja hi era, se n'actualitza el tipus.
 */
export async function afegirDiesSenseClasse(p: {
  des: string
  fins: string
  tipus: string
  descripcio: string
}): Promise<{ ok: boolean; error?: string; afegits?: number }> {
  const supabase = await createClient()
  const noPermis = await comprovaGestor(supabase)
  if (noPermis) return { ok: false, error: noPermis }

  if (!DATA.test(p.des) || !DATA.test(p.fins) || p.des > p.fins) return { ok: false, error: 'Dates no vàlides' }
  if (!TIPUS.includes(p.tipus)) return { ok: false, error: 'Tipus no vàlid' }
  const dies = diesLaborables(p.des, p.fins)
  if (dies.length === 0) return { ok: false, error: 'En aquest interval no hi ha cap dia laborable' }
  if (dies.length > 300) return { ok: false, error: 'Interval massa llarg' }

  const descripcio = p.descripcio.trim() || null
  const { error } = await supabase
    .from('calendari_escolar')
    .upsert(dies.map(data => ({ data, tipus: p.tipus, descripcio })), { onConflict: 'data' })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/calendari-escolar')
  revalidatePath('/calendari')
  return { ok: true, afegits: dies.length }
}

/** Torna a fer lectiu un dia. Les substitucions que no es van generar no es creen soles: cal tornar-les a generar. */
export async function eliminarDiaSenseClasse(data: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const noPermis = await comprovaGestor(supabase)
  if (noPermis) return { ok: false, error: noPermis }
  if (!DATA.test(data)) return { ok: false, error: 'Data no vàlida' }

  const { error } = await supabase.from('calendari_escolar').delete().eq('data', data)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/calendari-escolar')
  revalidatePath('/calendari')
  return { ok: true }
}
