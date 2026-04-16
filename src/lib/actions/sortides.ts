'use server'

import { createClient } from '@/lib/supabase/server'
import { reassignarSubstitucionsPendentsDia, generarSubstitucionsAcompanyants } from './generar-substitucions'
import { enviarNotificacioResolucioSortida } from '@/lib/email'
import { crearEsdevenimentSortida, eliminarEsdeveniment } from '@/lib/gcal'

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
      .select(`
        descripcio, data, hora_inici, hora_fi, google_event_id,
        proposador:proposada_per(nom, email),
        sortida_grups(grup:grup_id(nom)),
        sortida_acompanyants(docent:docent_id(nom))
      `)
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

    // Google Calendar: crea l'esdeveniment i desa l'ID
    if (sortida) {
      const grups = ((sortida as any).sortida_grups ?? [])
        .map((sg: any) => sg.grup?.nom).filter(Boolean)
      const acompanyants = ((sortida as any).sortida_acompanyants ?? [])
        .map((sa: any) => sa.docent?.nom).filter(Boolean)

      const eventId = await crearEsdevenimentSortida({
        descripcio: sortida.descripcio,
        data: sortida.data,
        horaInici: (sortida as any).hora_inici,
        horaFi: (sortida as any).hora_fi,
        grups,
        acompanyants,
      })

      if (eventId) {
        await supabase
          .from('sortides')
          .update({ google_event_id: eventId })
          .eq('id', sortidaId)
      }
    }
  }

  if (nouEstat === 'rebutjada') {
    const googleEventId = (sortida as any)?.google_event_id
    if (googleEventId) eliminarEsdeveniment(googleEventId).catch(console.error)
  }

  return { ok: true }
}
