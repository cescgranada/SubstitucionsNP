'use server'

import { createClient } from '@/lib/supabase/server'
import { reassignarSubstitucionsPendentsDia, generarSubstitucionsAcompanyants } from './generar-substitucions'
import { enviarNotificacioResolucioSortida, enviarNotificacioNovaSortida } from '@/lib/email'
import { crearEsdevenimentSortida, eliminarEsdeveniment } from '@/lib/gcal'

/**
 * Crea una nova proposta de sortida i notifica els caps d'etapa (responsabilitat
 * primària) i la direcció (fallback) perquè la revisin.
 */
export async function proposarSortida(params: {
  docentId: string
  data: string
  horaInici: string
  horaFi: string
  descripcio: string
  observacions?: string
  grupsIds: string[]
}): Promise<{ ok: boolean; sortidaId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticat' }

  // Verifica que el docentId correspon a l'usuari autenticat
  const { data: docent } = await supabase
    .from('docents')
    .select('id, nom')
    .eq('email', user.email!)
    .single()
  if (!docent || docent.id !== params.docentId) {
    return { ok: false, error: 'Sense permís' }
  }

  // Crea la sortida
  const { data: sortida, error: errSortida } = await supabase
    .from('sortides')
    .insert({
      proposada_per: params.docentId,
      data: params.data,
      hora_inici: params.horaInici,
      hora_fi: params.horaFi,
      descripcio: params.descripcio.trim(),
      observacions: params.observacions?.trim() || null,
      estat: 'proposta',
    })
    .select('id')
    .single()

  if (errSortida || !sortida) return { ok: false, error: errSortida?.message ?? 'Error en crear la sortida' }

  // Associa els grups
  if (params.grupsIds.length > 0) {
    const { error: errGrups } = await supabase
      .from('sortida_grups')
      .insert(params.grupsIds.map(grupId => ({ sortida_id: sortida.id, grup_id: grupId })))
    if (errGrups) return { ok: false, error: 'Sortida creada però error en associar grups' }
  }

  // Recupera els noms dels grups per a la notificació
  const { data: grups } = await supabase
    .from('grups')
    .select('nom')
    .in('id', params.grupsIds)
  const grupsNoms = (grups ?? []).map((g: any) => g.nom)

  // Notifica caps d'etapa (responsabilitat primària) + director + sotsdirector (fallback)
  const { data: gestors } = await supabase
    .from('docent_rols')
    .select('docent:docent_id(nom, email)')
    .in('rol', ['coordinacio_etapa', 'director', 'sotsdirector'])

  const emailsVistos = new Set<string>()
  for (const g of (gestors ?? []) as any[]) {
    if (g.docent?.email && !emailsVistos.has(g.docent.email)) {
      emailsVistos.add(g.docent.email)
      enviarNotificacioNovaSortida({
        emailGestor: g.docent.email,
        nomGestor: g.docent.nom,
        nomProposador: docent.nom,
        descripcio: params.descripcio,
        data: params.data,
        grups: grupsNoms,
      }).catch(console.error)
    }
  }

  return { ok: true, sortidaId: sortida.id }
}

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
