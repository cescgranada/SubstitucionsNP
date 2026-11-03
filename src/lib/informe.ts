import type { createClient } from '@/lib/supabase/server'
import { agruparBlocs, nomAbsent } from '@/lib/substitucions-blocs'
import { diesLaborables, diesNoLectius } from '@/lib/curs'
import { MOTIUS, ESTAT_SUBSTITUCIO } from '@/lib/etiquetes'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type FilaInforme = {
  id: string
  nom: string
  /** Dies lectius d'absència aprovada (una absència parcial compta com un dia) */
  diesAbsencia: number
  /** Classes (blocs) que han generat substitució */
  generades: number
  noCal: number
  /** Classes (blocs) cobertes com a substitut, confirmades */
  realitzades: number
  /** Hores cobertes (cada franja són 30 minuts) */
  hores: number
}

const MIDA_PAGINA = 1000

/** PostgREST talla a 1000 files: llegeix totes les pàgines d'una consulta. */
async function totes<T>(consulta: (des: number, fins: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const resultat: T[] = []
  for (let des = 0; ; des += MIDA_PAGINA) {
    const { data, error } = await consulta(des, des + MIDA_PAGINA - 1)
    if (error) throw new Error(error.message)
    resultat.push(...(data ?? []))
    if (!data || data.length < MIDA_PAGINA) break
  }
  return resultat
}

const SELECT_SUBS = `
  id, data, estat, substitut_id, absencia_id, sortida_id,
  substitut:substitut_id(nom),
  sortida:sortida_id(descripcio),
  horari_setmanal:horari_setmanal_id(
    docent:docent_id(nom), tipus, materia, tipus_parella,
    grup:grup_id(nom), franja:franja_id(hora_inici, hora_fi)
  ),
  absencia:absencia_id(docent_id, motiu, docent:docent_id(nom))
`

function llegirSubstitucions(supabase: Supabase, des: string, fins: string) {
  return totes<any>((a, b) =>
    supabase
      .from('substitucions')
      .select(SELECT_SUBS)
      .gte('data', des)
      .lte('data', fins)
      .neq('estat', 'eliminada')
      .order('id')
      .range(a, b)
  )
}

/** Resum per docent. Les sortides escolars no hi compten, com al dashboard. */
export async function informeResum(supabase: Supabase, des: string, fins: string): Promise<FilaInforme[]> {
  const [{ data: docents }, subs, absencies, noLectius] = await Promise.all([
    supabase.from('docents').select('id, nom').eq('actiu', true).order('nom'),
    llegirSubstitucions(supabase, des, fins),
    totes<any>((a, b) =>
      supabase
        .from('absencies')
        .select('id, docent_id, data, data_fi')
        .eq('estat', 'aprovada')
        .lte('data', fins)
        .or(`data_fi.gte.${des},and(data_fi.is.null,data.gte.${des})`)
        .order('id')
        .range(a, b)
    ),
    diesNoLectius(supabase, des, fins),
  ])

  // Dies d'absència per docent, sense comptar dos cops un dia solapat
  const diesAbs = new Map<string, Set<string>>()
  for (const a of absencies) {
    const ini = a.data > des ? a.data : des
    const fi = (a.data_fi ?? a.data) < fins ? (a.data_fi ?? a.data) : fins
    if (ini > fi) continue
    const set = diesAbs.get(a.docent_id) ?? new Set<string>()
    for (const d of diesLaborables(ini, fi)) if (!noLectius.has(d)) set.add(d)
    diesAbs.set(a.docent_id, set)
  }

  const generades = new Map<string, number>()
  const noCal = new Map<string, number>()
  const realitzades = new Map<string, number>()
  const franges = new Map<string, number>()
  const suma = (m: Map<string, number>, k: string, n = 1) => m.set(k, (m.get(k) ?? 0) + n)

  const deAbsencia = subs.filter(s => s.absencia_id && !s.sortida_id)
  for (const b of agruparBlocs(deAbsencia)) {
    const s: any = b.primera
    if (s.absencia?.docent_id) {
      suma(generades, s.absencia.docent_id)
      if (s.estat === 'no_cal') suma(noCal, s.absencia.docent_id)
    }
    if (s.estat === 'confirmada' && s.substitut_id) suma(realitzades, s.substitut_id)
  }
  for (const s of deAbsencia) {
    if (s.estat === 'confirmada' && s.substitut_id && s.horari_setmanal?.tipus_parella !== 'codocencia') {
      suma(franges, s.substitut_id)
    }
  }

  return (docents ?? [])
    .map(d => ({
      id: d.id,
      nom: d.nom,
      diesAbsencia: diesAbs.get(d.id)?.size ?? 0,
      generades: generades.get(d.id) ?? 0,
      noCal: noCal.get(d.id) ?? 0,
      realitzades: realitzades.get(d.id) ?? 0,
      hores: (franges.get(d.id) ?? 0) / 2,
    }))
    .filter(f => f.diesAbsencia > 0 || f.generades > 0 || f.realitzades > 0)
    .sort((a, b) => b.generades + b.realitzades - (a.generades + a.realitzades) || a.nom.localeCompare(b.nom))
}

/** Detall: una fila per classe (bloc), incloent-hi les sortides, per al CSV. */
export async function informeDetall(supabase: Supabase, des: string, fins: string): Promise<string[][]> {
  const subs = await llegirSubstitucions(supabase, des, fins)
  const capcalera = ['Data', 'Inici', 'Fi', 'Grup', 'Matèria', 'Absent', 'Origen', 'Motiu', 'Substitut', 'Estat']
  const files = agruparBlocs(subs).map(b => {
    const s: any = b.primera
    const h = s.horari_setmanal
    const substituts = Array.from(new Set(b.files.map((f: any) => f.substitut?.nom).filter(Boolean)))
    return [
      s.data,
      b.horaInici.slice(0, 5),
      b.horaFi.slice(0, 5),
      h?.grup?.nom ?? '',
      h?.materia ?? '',
      nomAbsent(s) ?? '',
      s.sortida_id ? `Sortida: ${s.sortida?.descripcio ?? ''}` : 'Absència',
      s.absencia?.motiu ? (MOTIUS[s.absencia.motiu] ?? s.absencia.motiu) : '',
      substituts.join(' / '),
      ESTAT_SUBSTITUCIO[s.estat] ?? s.estat,
    ]
  })
  return [capcalera, ...files]
}

/** CSV per a Excel en català: separador `;`, cometes dobles i BOM UTF-8. */
export function aCsv(files: (string | number)[][]): string {
  const cel = (v: string | number) => {
    const t = String(v)
    // Evita que Excel executi com a fórmula text que comença per = + - @
    const segur = /^[=+\-@]/.test(t) && Number.isNaN(Number(t)) ? `'${t}` : t
    return /[";\n\r]/.test(segur) ? `"${segur.replace(/"/g, '""')}"` : segur
  }
  return '﻿' + files.map(f => f.map(cel).join(';')).join('\r\n') + '\r\n'
}
