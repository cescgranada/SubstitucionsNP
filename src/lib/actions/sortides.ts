'use server'

import { createClient } from '@/lib/supabase/server'
import { reassignarSubstitucionsPendentsDia } from './generar-substitucions'

/**
 * Aprova o rebutja una sortida escolar.
 * Si s'aprova, activa l'efecte cascada: els docents alliberats pels grups
 * que surten passen a ser candidats prioritaris per a les substitucions
 * pendents del mateix dia.
 */
export async function actualitzarEstatSortida(
  sortidaId: string,
  nouEstat: 'aprovada' | 'rebutjada',
  docentGestorId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica que qui aprova és gestor
  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docentGestorId)

  const esGestor = rols?.some(r =>
    ['director', 'sotsdirector', 'coordinacio_etapa'].includes(r.rol)
  )
  if (!esGestor) return { ok: false, error: 'Sense permís per gestionar sortides' }

  const { error } = await supabase
    .from('sortides')
    .update({
      estat: nouEstat,
      aprovada_per: docentGestorId,
      data_aprovacio: new Date().toISOString(),
    })
    .eq('id', sortidaId)

  if (error) return { ok: false, error: error.message }

  if (nouEstat === 'aprovada') {
    const cascada = await reassignarSubstitucionsPendentsDia(sortidaId)
    if (!cascada.ok) console.error('Error en efecte cascada sortida:', cascada.error)
  }

  return { ok: true }
}
