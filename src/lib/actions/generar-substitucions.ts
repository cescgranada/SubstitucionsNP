'use server'

import { createClient } from '@/lib/supabase/server'
import {
  enviarNotificacioSubstitut,
  enviarNotificacioAprovacioPendent,
  enviarNotificacioRessolucioAbsencia,
  enviarNotificacioCoordinador,
  enviarNotificacioSubstitucioAnullada,
} from '@/lib/email'

/**
 * Retorna els dies laborables (dl–dv) entre dues dates, en format YYYY-MM-DD.
 */
function diesLaborables(from: string, to: string): string[] {
  const dies: string[] = []
  const curr = new Date(from + 'T12:00:00')
  const end = new Date(to + 'T12:00:00')
  while (curr <= end) {
    const dia = curr.getDay()
    if (dia >= 1 && dia <= 5) {
      dies.push(curr.toISOString().split('T')[0])
    }
    curr.setDate(curr.getDate() + 1)
  }
  return dies
}

/**
 * Converteix un dia de la setmana de Date.getDay() (0=diumenge) al format de la BD (1=dilluns..5=divendres)
 */
function diaSetmana(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay() // 1=dl, 5=dv, cap de setmana filtrat a diesLaborables
}

/**
 * Proposa el millor substitut per a una franja:
 *  1. Guàrdia → 2. Permanència → 3. HNL
 *  Restricció: ha de pertànyer a l'etapa del docent absent.
 */
async function proposaSubstitut(
  supabase: Awaited<ReturnType<typeof createClient>>,
  franjaId: string,
  diaNum: number,
  etapaId: string,
  docentAbsentId: string
): Promise<{ substitutId: string | null; motiu: string | null }> {
  const { data: docentEtapa } = await supabase
    .from('docent_etapes')
    .select('docent_id')
    .eq('etapa_id', etapaId)
    .neq('docent_id', docentAbsentId)

  if (!docentEtapa || docentEtapa.length === 0) return { substitutId: null, motiu: null }

  const docentIdsEtapa = docentEtapa.map(d => d.docent_id)

  for (const tipus of ['guardia', 'permanencia', 'hnl'] as const) {
    const { data: candidats } = await supabase
      .from('horari_setmanal')
      .select('docent_id')
      .eq('franja_id', franjaId)
      .eq('dia_setmana', diaNum)
      .eq('tipus', tipus)
      .in('docent_id', docentIdsEtapa)

    if (candidats && candidats.length > 0) {
      return {
        substitutId: candidats[0].docent_id,
        motiu: `Docent amb ${tipus === 'guardia' ? 'guàrdia' : tipus === 'permanencia' ? 'permanència' : 'HNL'} en aquesta franja`,
      }
    }
  }

  return { substitutId: null, motiu: null }
}

/**
 * Cancel·la una absència pròpia i les substitucions associades.
 * Notifica els substituts afectats per email.
 */
export async function cancellarAbsencia(
  absenciaId: string,
  docentId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica autenticació
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticat' }

  const { data: docentAuth } = await supabase
    .from('docents')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!docentAuth || docentAuth.id !== docentId) {
    return { ok: false, error: 'Sense permís' }
  }

  // Carrega l'absència
  const { data: absencia } = await supabase
    .from('absencies')
    .select('id, docent_id, data, data_fi, estat')
    .eq('id', absenciaId)
    .single()

  if (!absencia) return { ok: false, error: 'Absència no trobada' }
  if (absencia.docent_id !== docentId) return { ok: false, error: 'Sense permís' }
  if (['rebutjada', 'cancel·lada'].includes(absencia.estat)) {
    return { ok: false, error: 'Aquesta absència no es pot cancel·lar' }
  }

  // Carrega substitucions associades per notificar els substituts
  const { data: substitucions } = await supabase
    .from('substitucions')
    .select(`
      id, data, substitut_id,
      substitut:substitut_id(nom, email),
      horari_setmanal:horari_setmanal_id(
        franja:franja_id(hora_inici, hora_fi),
        grup:grup_id(nom)
      )
    `)
    .eq('absencia_id', absenciaId)
    .not('substitut_id', 'is', null)

  const { data: docentInfo } = await supabase
    .from('docents')
    .select('nom')
    .eq('id', docentId)
    .single()

  // Elimina les substitucions generades
  await supabase.from('substitucions').delete().eq('absencia_id', absenciaId)

  // Marca l'absència com a cancel·lada
  const { error } = await supabase
    .from('absencies')
    .update({ estat: 'cancel·lada' })
    .eq('id', absenciaId)

  if (error) return { ok: false, error: error.message }

  // Notifica els substituts afectats
  for (const s of (substitucions ?? []) as any[]) {
    if (!s.substitut?.email) continue
    enviarNotificacioSubstitucioAnullada({
      emailSubstitut: s.substitut.email,
      nomSubstitut: s.substitut.nom,
      nomDocentAbsent: docentInfo?.nom ?? '',
      data: s.data,
      horaInici: s.horari_setmanal?.franja?.hora_inici ?? '',
      horaFi: s.horari_setmanal?.franja?.hora_fi ?? '',
      grup: s.horari_setmanal?.grup?.nom,
    }).catch(console.error)
  }

  return { ok: true }
}

/**
 * Genera les substitucions per a una absència aprovada.
 * Suporta absències multi-dia: itera des de `data` fins a `data_fi` (dies laborables).
 * Per a cada dia i cada franja de classe del docent absent:
 *   - Codocència → assigna la parella (confirmada)
 *   - Altres → proposa substitut per ordre de prioritat (proposta_ia) o deixa pendent
 */
export async function generarSubstitucions(absenciaId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: absencia } = await supabase
    .from('absencies')
    .select('id, docent_id, data, data_fi, tot_el_dia, hora_inici, hora_fi, estat')
    .eq('id', absenciaId)
    .single()

  if (!absencia) return { ok: false, error: 'Absència no trobada' }
  if (absencia.estat !== 'aprovada') return { ok: false, error: "L'absència no està aprovada" }

  const dies = diesLaborables(absencia.data, absencia.data_fi ?? absencia.data)
  if (dies.length === 0) return { ok: true }

  // Evita duplicats: comprova quins dies ja tenen substitucions generades
  const { data: existing } = await supabase
    .from('substitucions')
    .select('data')
    .eq('absencia_id', absenciaId)

  const diesJaProcessats = new Set(existing?.map(s => s.data) ?? [])
  const diesAProcesar = dies.filter(d => !diesJaProcessats.has(d))
  if (diesAProcesar.length === 0) return { ok: true }

  // Etapa del docent absent (primera etapa)
  const { data: etapes } = await supabase
    .from('docent_etapes')
    .select('etapa_id')
    .eq('docent_id', absencia.docent_id)
  const etapaId = etapes?.[0]?.etapa_id ?? null

  const { data: docentAbsent } = await supabase
    .from('docents')
    .select('nom')
    .eq('id', absencia.docent_id)
    .single()

  let totalCreades = 0
  const substitutIdsNotificats = new Set<string>()

  for (const data of diesAProcesar) {
    const diaNum = diaSetmana(data)

    const { data: horari } = await supabase
      .from('horari_setmanal')
      .select(`
        id, tipus, tipus_parella, parella_docent_id, materia, aula,
        franja:franja_id(id, hora_inici, hora_fi),
        grup:grup_id(nom)
      `)
      .eq('docent_id', absencia.docent_id)
      .eq('dia_setmana', diaNum)

    if (!horari || horari.length === 0) continue

    const frangesAfectades = horari.filter((h: any) => {
      if (absencia.tot_el_dia) return true
      if (!absencia.hora_inici || !absencia.hora_fi) return true
      const franjaInici = h.franja?.hora_inici ?? '00:00'
      const franjaFi = h.franja?.hora_fi ?? '23:59'
      return franjaInici < absencia.hora_fi && franjaFi > absencia.hora_inici
    })

    const substitucionsACrear: any[] = []

    for (const h of frangesAfectades as any[]) {
      if (['guardia', 'reunio', 'esbarjo', 'disponible'].includes(h.tipus)) continue

      if (h.tipus_parella === 'codocencia') {
        substitucionsACrear.push({
          absencia_id: absenciaId,
          horari_setmanal_id: h.id,
          data,
          substitut_id: h.parella_docent_id,
          estat: 'confirmada',
          proposat_per_ia: false,
          motiu_proposta_ia: 'Codocència: cobert per la parella docent',
        })
        continue
      }

      let substitutId: string | null = null
      let motiuProposta: string | null = null

      if (etapaId && h.franja?.id) {
        const proposta = await proposaSubstitut(supabase, h.franja.id, diaNum, etapaId, absencia.docent_id)
        substitutId = proposta.substitutId
        motiuProposta = proposta.motiu
      }

      substitucionsACrear.push({
        absencia_id: absenciaId,
        horari_setmanal_id: h.id,
        data,
        substitut_id: substitutId,
        estat: substitutId ? 'proposta_ia' : 'pendent',
        proposat_per_ia: !!substitutId,
        motiu_proposta_ia: motiuProposta,
      })
    }

    if (substitucionsACrear.length > 0) {
      const { error } = await supabase.from('substitucions').insert(substitucionsACrear)
      if (error) return { ok: false, error: error.message }
      totalCreades += substitucionsACrear.length

      // Notifica els substituts proposats/confirmats
      for (const s of substitucionsACrear) {
        if (!s.substitut_id || substitutIdsNotificats.has(`${s.substitut_id}-${data}`)) continue
        substitutIdsNotificats.add(`${s.substitut_id}-${data}`)

        const { data: substitut } = await supabase
          .from('docents')
          .select('nom, email')
          .eq('id', s.substitut_id)
          .single()

        const horariEntry = (horari as any[]).find(h => h.id === s.horari_setmanal_id)

        if (substitut?.email) {
          enviarNotificacioSubstitut({
            emailSubstitut: substitut.email,
            nomSubstitut: substitut.nom,
            nomDocentAbsent: docentAbsent?.nom ?? '',
            data,
            horaInici: horariEntry?.franja?.hora_inici ?? '',
            horaFi: horariEntry?.franja?.hora_fi ?? '',
            grup: horariEntry?.grup?.nom,
            materia: horariEntry?.materia ?? undefined,
            aula: horariEntry?.aula ?? undefined,
          }).catch(console.error)
        }
      }
    }
  }

  // Notifica els coordinadors de l'etapa (si s'han generat substitucions automàticament)
  if (totalCreades > 0 && etapaId) {
    const { data: coordinadors } = await supabase
      .from('docent_rols')
      .select('docent:docent_id(nom, email)')
      .in('rol', ['coordinacio_etapa', 'director', 'sotsdirector'])
      .or(`etapa_id.eq.${etapaId},rol.in.(director,sotsdirector)`)

    for (const c of (coordinadors ?? []) as any[]) {
      if (c.docent?.email) {
        enviarNotificacioCoordinador({
          emailCoordinador: c.docent.email,
          nomCoordinador: c.docent.nom,
          nomDocentAbsent: docentAbsent?.nom ?? '',
          dataInici: absencia.data,
          dataFi: absencia.data_fi ?? absencia.data,
          numSubstitucions: totalCreades,
        }).catch(console.error)
      }
    }
  }

  return { ok: true }
}

/**
 * Crea una nova absència i, si s'aprova automàticament, genera les substitucions.
 */
export async function crearAbsencia(params: {
  docentId: string
  data: string
  dataFi?: string
  motiu: 'medic' | 'dia_personal' | 'formacio'
  totElDia: boolean
  horaInici?: string
  horaFi?: string
  observacions?: string
}): Promise<{ ok: boolean; absenciaId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticat' }

  const { data: docent } = await supabase
    .from('docents')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!docent || docent.id !== params.docentId) {
    return { ok: false, error: 'Sense permís' }
  }

  // Si hi ha data_fi, forcem tot_el_dia = true
  const totElDia = params.dataFi && params.dataFi !== params.data ? true : params.totElDia

  // Comprova que no hi ha absències que es solapin amb les dates indicades
  const novaDataFi = params.dataFi ?? params.data
  const { data: absenciesExistents } = await supabase
    .from('absencies')
    .select('id, data, data_fi')
    .eq('docent_id', params.docentId)
    .not('estat', 'in', '("rebutjada","cancel·lada")')

  const seSolapa = absenciesExistents?.some(a => {
    const existentFi = a.data_fi ?? a.data
    return a.data <= novaDataFi && existentFi >= params.data
  })

  if (seSolapa) {
    return { ok: false, error: 'Ja tens una absència registrada que es solapa amb les dates indicades.' }
  }

  const estat = params.motiu === 'dia_personal' ? 'pendent' : 'aprovada'

  const { data: docentInfo } = await supabase
    .from('docents')
    .select('nom, email')
    .eq('id', params.docentId)
    .single()

  const { data: absencia, error } = await supabase
    .from('absencies')
    .insert({
      docent_id: params.docentId,
      data: params.data,
      data_fi: params.dataFi && params.dataFi !== params.data ? params.dataFi : null,
      motiu: params.motiu,
      tot_el_dia: totElDia,
      hora_inici: totElDia ? null : (params.horaInici ?? null),
      hora_fi: totElDia ? null : (params.horaFi ?? null),
      observacions: params.observacions ?? null,
      estat,
    })
    .select('id')
    .single()

  if (error || !absencia) return { ok: false, error: error?.message ?? 'Error desconegut' }

  if (estat === 'aprovada') {
    const gen = await generarSubstitucions(absencia.id)
    if (!gen.ok) console.error('Error generant substitucions:', gen.error)
  } else if (estat === 'pendent' && docentInfo) {
    const { data: capsPersonal } = await supabase
      .from('docent_rols')
      .select('docent:docent_id(nom, email)')
      .eq('rol', 'cap_personal')

    for (const cp of (capsPersonal ?? []) as any[]) {
      if (cp.docent?.email) {
        enviarNotificacioAprovacioPendent({
          emailGestor: cp.docent.email,
          nomGestor: cp.docent.nom,
          nomDocent: docentInfo.nom,
          data: params.data,
          motiu: params.motiu,
        }).catch(console.error)
      }
    }
  }

  return { ok: true, absenciaId: absencia.id }
}

/**
 * Aprova o rebutja una absència. Si s'aprova, genera les substitucions.
 */
export async function actualitzarEstatAbsencia(
  absenciaId: string,
  nouEstat: 'aprovada' | 'rebutjada',
  docentGestorId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: absencia } = await supabase
    .from('absencies')
    .select('data, data_fi, motiu, docent:docent_id(nom, email)')
    .eq('id', absenciaId)
    .single()

  const { data: gestor } = await supabase
    .from('docents')
    .select('nom')
    .eq('id', docentGestorId)
    .single()

  const { error } = await supabase
    .from('absencies')
    .update({
      estat: nouEstat,
      aprovat_per: docentGestorId,
      data_aprovacio: new Date().toISOString(),
    })
    .eq('id', absenciaId)

  if (error) return { ok: false, error: error.message }

  const docentInfo = (absencia as any)?.docent
  if (docentInfo?.email && absencia && gestor) {
    enviarNotificacioRessolucioAbsencia({
      emailDocent: docentInfo.email,
      nomDocent: docentInfo.nom,
      data: absencia.data,
      estat: nouEstat,
      nomGestor: gestor.nom,
    }).catch(console.error)
  }

  if (nouEstat === 'aprovada') {
    const gen = await generarSubstitucions(absenciaId)
    if (!gen.ok) console.error('Error generant substitucions:', gen.error)
  }

  return { ok: true }
}
