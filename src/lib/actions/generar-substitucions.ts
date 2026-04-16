'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Converteix un dia de la setmana de Date.getDay() (0=diumenge) al format de la BD (1=dilluns..5=divendres)
 */
function diaSetmana(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00') // hora central per evitar problemes de timezone
  const js = d.getDay() // 0=dium, 1=dil, ..., 6=dis
  return js === 0 ? 0 : js // retorna 0 si és cap de setmana (no s'ha de processar)
}

/**
 * Proposa el millor substitut per a una franja:
 *  1. Docents de guàrdia en aquella franja i etapa
 *  2. Docents amb permanència
 *  3. Docents amb HNL
 *  4. Restricció: ha de pertànyer a l'etapa del docent absent
 *
 * (Docents alliberats per sortida es tractaran quan s'implementi el mòdul de sortides)
 */
async function proposaSubstitut(
  supabase: Awaited<ReturnType<typeof createClient>>,
  franjaId: string,
  diaNum: number,
  etapaId: string,
  docentAbsentId: string
): Promise<{ substitutId: string | null; motiu: string | null }> {
  // Docents de l'etapa (excloent l'absent)
  const { data: docentEtapa } = await supabase
    .from('docent_etapes')
    .select('docent_id')
    .eq('etapa_id', etapaId)
    .neq('docent_id', docentAbsentId)

  if (!docentEtapa || docentEtapa.length === 0) {
    return { substitutId: null, motiu: null }
  }

  const docentIdsEtapa = docentEtapa.map(d => d.docent_id)

  // Busca candidats per ordre de prioritat
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
 * Genera les substitucions per a una absència aprovada.
 * - Busca les franges del docent absent aquell dia
 * - Per a cada franja de tipus 'classe':
 *   - Si és codocència: crea la substitució però marca que no cal substitut
 *   - Si és desdoblament o sense parella: proposa substitut per ordre de prioritat
 * - Per a guàrdia/reunió/etc: no genera substitució (no cal cobrir)
 */
export async function generarSubstitucions(absenciaId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  // Carrega l'absència
  const { data: absencia } = await supabase
    .from('absencies')
    .select('id, docent_id, data, tot_el_dia, hora_inici, hora_fi, estat')
    .eq('id', absenciaId)
    .single()

  if (!absencia) return { ok: false, error: 'Absència no trobada' }
  if (absencia.estat !== 'aprovada') return { ok: false, error: 'L\'absència no està aprovada' }

  const diaNum = diaSetmana(absencia.data)
  if (diaNum === 0) return { ok: true } // cap de setmana, res a fer

  // Comprova que no s'hagin generat ja les substitucions
  const { count } = await supabase
    .from('substitucions')
    .select('*', { count: 'exact', head: true })
    .eq('absencia_id', absenciaId)

  if (count && count > 0) return { ok: true } // ja generades

  // Etapa/es del docent absent
  const { data: etapes } = await supabase
    .from('docent_etapes')
    .select('etapa_id')
    .eq('docent_id', absencia.docent_id)

  const etapaId = etapes?.[0]?.etapa_id ?? null

  // Horari del docent absent per aquell dia de la setmana
  const { data: horari } = await supabase
    .from('horari_setmanal')
    .select(`
      id, tipus, tipus_parella, parella_docent_id,
      franja:franja_id(id, hora_inici, hora_fi)
    `)
    .eq('docent_id', absencia.docent_id)
    .eq('dia_setmana', diaNum)

  if (!horari || horari.length === 0) return { ok: true } // docent sense classes aquell dia

  // Filtra les franges afectades per l'absència parcial
  const frangesAfectades = horari.filter((h: any) => {
    if (absencia.tot_el_dia) return true
    if (!absencia.hora_inici || !absencia.hora_fi) return true
    const franjaInici = h.franja?.hora_inici ?? '00:00'
    const franjaFi = h.franja?.hora_fi ?? '23:59'
    // La franja es solapa amb la franja d'absència
    return franjaInici < absencia.hora_fi && franjaFi > absencia.hora_inici
  })

  // Crea substitucions
  const substitucionsACrear = []

  for (const h of frangesAfectades as any[]) {
    // Guàrdies, reunions, esbarjos, disponible: no cal substitució
    if (['guardia', 'reunio', 'esbarjo', 'disponible'].includes(h.tipus)) continue

    // Codocència: l'altre docent cobreix, no cal substitut extern
    if (h.tipus_parella === 'codocencia') {
      substitucionsACrear.push({
        absencia_id: absenciaId,
        horari_setmanal_id: h.id,
        data: absencia.data,
        substitut_id: h.parella_docent_id, // la parella ja cobreix
        estat: 'confirmada',
        proposat_per_ia: false,
        motiu_proposta_ia: 'Codocència: cobert per la parella docent',
      })
      continue
    }

    // Proposta de substitut per ordre de prioritat
    let substitutId: string | null = null
    let motiuProposta: string | null = null

    if (etapaId && h.franja?.id) {
      const proposta = await proposaSubstitut(
        supabase,
        h.franja.id,
        diaNum,
        etapaId,
        absencia.docent_id
      )
      substitutId = proposta.substitutId
      motiuProposta = proposta.motiu
    }

    substitucionsACrear.push({
      absencia_id: absenciaId,
      horari_setmanal_id: h.id,
      data: absencia.data,
      substitut_id: substitutId,
      estat: substitutId ? 'proposta_ia' : 'pendent',
      proposat_per_ia: !!substitutId,
      motiu_proposta_ia: motiuProposta,
    })
  }

  if (substitucionsACrear.length > 0) {
    const { error } = await supabase.from('substitucions').insert(substitucionsACrear)
    if (error) return { ok: false, error: error.message }
  }

  return { ok: true }
}

/**
 * Crea una nova absència i, si s'aprova automàticament, genera les substitucions.
 */
export async function crearAbsencia(params: {
  docentId: string
  data: string
  motiu: 'medic' | 'dia_personal' | 'formacio'
  totElDia: boolean
  horaInici?: string
  horaFi?: string
  observacions?: string
}): Promise<{ ok: boolean; absenciaId?: string; error?: string }> {
  const supabase = await createClient()

  // Verifica que el docent autenticat és el mateix
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

  const estat = params.motiu === 'dia_personal' ? 'pendent' : 'aprovada'

  const { data: absencia, error } = await supabase
    .from('absencies')
    .insert({
      docent_id: params.docentId,
      data: params.data,
      motiu: params.motiu,
      tot_el_dia: params.totElDia,
      hora_inici: params.totElDia ? null : (params.horaInici ?? null),
      hora_fi: params.totElDia ? null : (params.horaFi ?? null),
      observacions: params.observacions ?? null,
      estat,
    })
    .select('id')
    .single()

  if (error || !absencia) return { ok: false, error: error?.message ?? 'Error desconegut' }

  // Si s'aprova automàticament, genera substitucions
  if (estat === 'aprovada') {
    const gen = await generarSubstitucions(absencia.id)
    if (!gen.ok) {
      // No bloquejem: l'absència s'ha creat; les substitucions es generaran manualment
      console.error('Error generant substitucions:', gen.error)
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

  const { error } = await supabase
    .from('absencies')
    .update({
      estat: nouEstat,
      aprovat_per: docentGestorId,
      data_aprovacio: new Date().toISOString(),
    })
    .eq('id', absenciaId)

  if (error) return { ok: false, error: error.message }

  if (nouEstat === 'aprovada') {
    const gen = await generarSubstitucions(absenciaId)
    if (!gen.ok) console.error('Error generant substitucions:', gen.error)
  }

  return { ok: true }
}
