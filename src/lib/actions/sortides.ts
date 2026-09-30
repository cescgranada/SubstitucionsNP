'use server'

import { createClient } from '@/lib/supabase/server'
import { reassignarSubstitucionsPendentsDia, generarSubstitucionsAcompanyants } from './generar-substitucions'
import { enviarNotificacioResolucioSortida, enviarNotificacioNovaSortida } from '@/lib/email'
import { crearEsdevenimentSortida, eliminarEsdeveniment } from '@/lib/gcal'
import { esEquipDirectiu, esPas } from '@/lib/roles'

const CAMPS_GESTIO_PAS = {
  dinar: { bool: 'dinar_demanat', per: 'dinar_demanat_per', at: 'dinar_demanat_at' },
  transport: { bool: 'transport_demanat', per: 'transport_demanat_per', at: 'transport_demanat_at' },
  pagament: { bool: 'pagament_fet', per: 'pagament_fet_per', at: 'pagament_fet_at' },
} as const

/**
 * Marca (o desmarca) un dels 3 punts de gestió logística d'una sortida
 * ja aprovada: dinar demanat, transport demanat, pagament fet. Reservat
 * al rol PAS — és l'única escriptura que té sobre les sortides.
 */
export async function marcarGestioSortida(params: {
  sortidaId: string
  camp: 'dinar' | 'transport' | 'pagament'
  valor: boolean
  docentActualId: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', params.docentActualId)

  if (!esPas(rols)) return { ok: false, error: 'Sense permís' }

  const { data: sortida } = await supabase
    .from('sortides')
    .select('estat')
    .eq('id', params.sortidaId)
    .single()

  if (!sortida) return { ok: false, error: 'Sortida no trobada' }
  if (sortida.estat !== 'aprovada') {
    return { ok: false, error: 'Aquesta sortida encara no està aprovada' }
  }

  const { bool, per, at } = CAMPS_GESTIO_PAS[params.camp]

  // Només s'actualitzen aquests 3 camps concrets — mai la resta de la
  // sortida, encara que la RLS del PAS permeti l'UPDATE de la fila sencera.
  const { error } = await supabase
    .from('sortides')
    .update({
      [bool]: params.valor,
      [per]: params.valor ? params.docentActualId : null,
      [at]: params.valor ? new Date().toISOString() : null,
    })
    .eq('id', params.sortidaId)

  if (error) return { ok: false, error: error.message }

  return { ok: true }
}

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
  necessitaDinar: boolean
  transport: 'peu' | 'autocar' | 'transport_public' | null
  requereixPagament: boolean
  dataLimitPagament?: string
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

  // Mateixa regla que el CHECK de la base de dades, però amb un missatge
  // clar per a qui omple el formulari.
  if (params.requereixPagament && !params.dataLimitPagament) {
    return { ok: false, error: 'Cal indicar la data límit de pagament.' }
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
      necessita_dinar: params.necessitaDinar,
      transport: params.transport,
      requereix_pagament: params.requereixPagament,
      data_limit_pagament: params.requereixPagament ? params.dataLimitPagament : null,
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

  // Notifica tot l'equip directiu
  const { data: gestors } = await supabase
    .from('docent_rols')
    .select('docent:docent_id(nom, email)')
    .eq('rol', 'equip_directiu')

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

  // Verifica que qui aprova és de l'equip directiu
  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docentGestorId)

  if (!esEquipDirectiu(rols)) return { ok: false, error: 'Sense permís per gestionar sortides' }

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

/**
 * Elimina una sortida. No s'esborra mai de la base de dades: es marca
 * amb estat 'eliminada' i queda registrat qui ho ha fet i quan, de
 * manera que sempre es pot consultar l'historial d'eliminacions.
 * - DOCENT: només la seva pròpia proposta i només mentre estigui en estat 'proposta'.
 * - EQUIP_DIRECTIU: qualsevol sortida, en qualsevol estat.
 * La RLS aplica la mateixa regla a nivell de base de dades (no permet
 * cap DELETE físic sobre la taula).
 */
export async function eliminarSortida(
  sortidaId: string,
  docentActualId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: sortida } = await supabase
    .from('sortides')
    .select('id, proposada_per, estat, google_event_id')
    .eq('id', sortidaId)
    .single()

  if (!sortida) return { ok: false, error: 'Sortida no trobada' }
  if (sortida.estat === 'eliminada') return { ok: false, error: 'Aquesta sortida ja està eliminada' }

  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docentActualId)

  const potEliminar = esEquipDirectiu(rols) ||
    (sortida.proposada_per === docentActualId && sortida.estat === 'proposta')

  if (!potEliminar) return { ok: false, error: 'Sense permís per eliminar aquesta sortida' }

  // Les substitucions generades (p. ex. per cobrir els acompanyants) deixen
  // de tenir sentit un cop retirada la sortida original, però es marquen
  // com a eliminades (no s'esborren) per mantenir-ne la traçabilitat.
  await supabase
    .from('substitucions')
    .update({ estat: 'eliminada', eliminada_per: docentActualId, eliminada_at: new Date().toISOString() })
    .eq('sortida_id', sortidaId)

  const { error } = await supabase
    .from('sortides')
    .update({
      estat: 'eliminada',
      eliminada_per: docentActualId,
      eliminada_at: new Date().toISOString(),
    })
    .eq('id', sortidaId)

  if (error) return { ok: false, error: error.message }

  if (sortida.google_event_id) {
    eliminarEsdeveniment(sortida.google_event_id).catch(console.error)
  }

  return { ok: true }
}
