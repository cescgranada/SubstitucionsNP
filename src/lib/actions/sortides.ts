'use server'

import { createClient } from '@/lib/supabase/server'
import { reassignarSubstitucionsPendentsDia, generarSubstitucionsAcompanyants } from './generar-substitucions'
import { enviarNotificacioResolucioSortida } from '@/lib/email'

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

  const [{ data: sortida }, { data: gestor }] = await Promise.all([
    supabase
      .from('sortides')
      .select('descripcio, data, proposador:proposada_per(nom, email)')
      .eq('id', sortidaId)
      .single(),
    supabase
      .from('docents')
      .select('nom')
      .eq('id', docentGestorId)
      .single(),
  ])

  const { error } = await supabase
    .from('sortides')
    .update({
      estat: nouEstat,
      aprovada_per: docentGestorId,
      data_aprovacio: new Date().toISOString(),
    })
    .eq('id', sortidaId)

  if (error) return { ok: false, error: error.message }

  // Notifica el proposador
  const proposador = (sortida as any)?.proposador
  if (sortida && gestor && proposador?.email) {
    enviarNotificacioResolucioSortida({
      emailProposador: proposador.email,
      nomProposador: proposador.nom,
      descripcio: sortida.descripcio,
      data: sortida.data,
      estat: nouEstat,
      nomGestor: gestor.nom,
    }).catch(console.error)
  }

  if (nouEstat === 'aprovada') {
    const [acomp, cascada] = await Promise.all([
      generarSubstitucionsAcompanyants(sortidaId),
      reassignarSubstitucionsPendentsDia(sortidaId),
    ])
    if (!acomp.ok) console.error('Error generant substitucions acompanyants:', acomp.error)
    if (!cascada.ok) console.error('Error en efecte cascada sortida:', cascada.error)
  }

  return { ok: true }
}
