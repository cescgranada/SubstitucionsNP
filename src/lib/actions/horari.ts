'use server'

import { createClient } from '@/lib/supabase/server'
import { esEquipDirectiu } from '@/lib/roles'
import { franjesDocent } from '@/lib/horari'
import { revalidatePath } from 'next/cache'

type Supabase = Awaited<ReturnType<typeof createClient>>

const TIPUS = ['classe', 'guardia', 'permanencia', 'reunio', 'esbarjo', 'hnl', 'disponible']

export type ActivitatHorari = {
  docentId: string
  dia: number
  horaInici: string
  horaFi: string
  tipus: string
  grupId: string | null
  materia: string
  aula: string
  parellaId: string | null
  tipusParella: string | null
}

/** L'actor es dedueix de la sessió: només l'equip directiu toca els horaris. */
async function comprovaGestor(supabase: Supabase): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return 'Sessió no vàlida'
  const { data: docent } = await supabase.from('docents').select('id').eq('email', user.email).single()
  if (!docent) return 'Sessió no vàlida'
  const { data: rols } = await supabase.from('docent_rols').select('rol').eq('docent_id', docent.id)
  return esEquipDirectiu(rols) ? null : "Sense permís per canviar horaris"
}

/** Franges (de 30 min o les de l'etapa) que cobreix un tram, o un error si no quadra amb cap franja. */
async function frangesDelTram(supabase: Supabase, docentId: string, inici: string, fi: string) {
  const totes = await franjesDocent(supabase, docentId)
  const dins = totes.filter(f => f.hora_inici.slice(0, 5) >= inici.slice(0, 5) && f.hora_fi.slice(0, 5) <= fi.slice(0, 5))
  if (dins.length === 0) return { error: 'Aquest tram no coincideix amb cap franja horària' as const }
  if (dins[0].hora_inici.slice(0, 5) !== inici.slice(0, 5) || dins[dins.length - 1].hora_fi.slice(0, 5) !== fi.slice(0, 5)) {
    return { error: "L'hora d'inici o de fi no coincideix amb les franges horàries" as const }
  }
  return { franges: dins }
}

/**
 * Afegeix o canvia una activitat a l'horari d'un docent per a tot un tram
 * (p. ex. dimarts de 9:00 a 10:30). Les franges que ja existien es canvien
 * en lloc d'esborrar-les, perquè les substitucions ja generades hi apunten.
 */
export async function desarActivitat(p: ActivitatHorari): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const noPermis = await comprovaGestor(supabase)
  if (noPermis) return { ok: false, error: noPermis }

  if (!Number.isInteger(p.dia) || p.dia < 1 || p.dia > 5) return { ok: false, error: 'Dia no vàlid' }
  if (!TIPUS.includes(p.tipus)) return { ok: false, error: "Tipus d'activitat no vàlid" }
  if (p.horaInici >= p.horaFi) return { ok: false, error: "L'hora de fi ha de ser posterior a la d'inici" }
  if (p.parellaId && p.parellaId === p.docentId) return { ok: false, error: 'La parella no pot ser el mateix docent' }
  if (p.parellaId && !p.tipusParella) return { ok: false, error: 'Indica si és codocència o desdoblament' }
  if (p.tipusParella && !['codocencia', 'desdoblament'].includes(p.tipusParella)) {
    return { ok: false, error: 'Tipus de parella no vàlid' }
  }

  const tram = await frangesDelTram(supabase, p.docentId, p.horaInici, p.horaFi)
  if ('error' in tram) return { ok: false, error: tram.error }

  const valors = {
    tipus: p.tipus,
    grup_id: p.tipus === 'classe' ? p.grupId || null : null,
    materia: p.materia.trim() || null,
    aula: p.aula.trim() || null,
    parella_docent_id: p.parellaId || null,
    tipus_parella: p.parellaId ? p.tipusParella : null,
  }

  const { data: existents } = await supabase
    .from('horari_setmanal')
    .select('id, franja_id')
    .eq('docent_id', p.docentId)
    .eq('dia_setmana', p.dia)
    .in('franja_id', tram.franges.map(f => f.id))
  const perFranja = new Map<string, string>()
  for (const e of existents ?? []) if (!perFranja.has(e.franja_id)) perFranja.set(e.franja_id, e.id)

  for (const f of tram.franges) {
    const id = perFranja.get(f.id)
    const { error } = id
      ? await supabase.from('horari_setmanal').update(valors).eq('id', id)
      : await supabase.from('horari_setmanal').insert({ docent_id: p.docentId, dia_setmana: p.dia, franja_id: f.id, ...valors })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/horari')
  return { ok: true }
}

/**
 * Buida un tram de l'horari. Les files que ja tenen substitucions o feina
 * deixada no es poden esborrar (en perdrien l'historial): passen a "Lliure".
 */
export async function esborrarActivitat(p: {
  docentId: string
  dia: number
  horaInici: string
  horaFi: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const noPermis = await comprovaGestor(supabase)
  if (noPermis) return { ok: false, error: noPermis }

  const tram = await frangesDelTram(supabase, p.docentId, p.horaInici, p.horaFi)
  if ('error' in tram) return { ok: false, error: tram.error }

  const { data: files } = await supabase
    .from('horari_setmanal')
    .select('id')
    .eq('docent_id', p.docentId)
    .eq('dia_setmana', p.dia)
    .in('franja_id', tram.franges.map(f => f.id))
  const ids = (files ?? []).map(f => f.id)
  if (ids.length === 0) return { ok: true }

  const [{ data: ambSubs }, { data: ambFeina }] = await Promise.all([
    supabase.from('substitucions').select('horari_setmanal_id').in('horari_setmanal_id', ids),
    supabase.from('absencia_feines').select('horari_setmanal_id').in('horari_setmanal_id', ids),
  ])
  const referenciades = new Set([
    ...(ambSubs ?? []).map(s => s.horari_setmanal_id),
    ...(ambFeina ?? []).map(s => s.horari_setmanal_id),
  ])

  const aEsborrar = ids.filter(id => !referenciades.has(id))
  const aLliure = ids.filter(id => referenciades.has(id))

  if (aEsborrar.length > 0) {
    const { error } = await supabase.from('horari_setmanal').delete().in('id', aEsborrar)
    if (error) return { ok: false, error: error.message }
  }
  if (aLliure.length > 0) {
    const { error } = await supabase
      .from('horari_setmanal')
      .update({ tipus: 'disponible', grup_id: null, materia: null, aula: null, parella_docent_id: null, tipus_parella: null })
      .in('id', aLliure)
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/horari')
  return { ok: true }
}
