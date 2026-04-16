'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Aprova o rebutja una sortida escolar.
 * Si s'aprova, en el futur aquí s'activaria l'efecte cascada
 * (alliberar els docents que tenien classe amb els grups que surten).
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

  // TODO Fase 2: si aprovada, generar substitucions per efecte cascada
  // (els docents que tenien classe amb els grups que surten queden alliberats)

  return { ok: true }
}
