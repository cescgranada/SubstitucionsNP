import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

/** El curs va d'1 de setembre a 31 d'agost: el comptador de cobertures torna a zero cada setembre. */
export function iniciCurs(data: string): string {
  const any = Number(data.slice(0, 4))
  const mes = Number(data.slice(5, 7))
  return `${mes >= 9 ? any : any - 1}-09-01`
}

export function fiCurs(data: string): string {
  return `${Number(iniciCurs(data).slice(0, 4)) + 1}-08-31`
}

/**
 * Dies laborables (dl–dv) d'un interval en què no hi ha classe segons el
 * calendari escolar (festius, vacances, dies no lectius, fora de curs).
 * Retorna data -> descripció.
 */
export async function diesNoLectius(
  supabase: Supabase,
  from: string,
  to: string
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('calendari_escolar')
    .select('data, descripcio')
    .gte('data', from)
    .lte('data', to)
  return new Map((data ?? []).map(d => [d.data as string, (d.descripcio as string | null) ?? 'Dia sense classe']))
}

/** Dies laborables (dl–dv) entre dues dates, en format YYYY-MM-DD. */
export function diesLaborables(from: string, to: string): string[] {
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
 * Dies laborables d'un interval en què hi ha classe: treu els festius, les
 * vacances i els dies no lectius del calendari escolar.
 */
export async function diesLectius(supabase: Supabase, from: string, to: string): Promise<string[]> {
  const laborables = diesLaborables(from, to)
  if (laborables.length === 0) return laborables
  const noLectius = await diesNoLectius(supabase, laborables[0], laborables[laborables.length - 1])
  return laborables.filter(d => !noLectius.has(d))
}

/**
 * Franges de 30 min que ha cobert cada docent en el curs de `data`
 * (confirmades o proposades, sense la codocència). docentId -> franges.
 */
export async function coberturesCurs(supabase: Supabase, data: string): Promise<Map<string, number>> {
  const { data: files } = await supabase.rpc('cobertures_curs', {
    p_inici: iniciCurs(data),
    p_fi: fiCurs(data),
  })
  return new Map(
    ((files ?? []) as { docent_id: string; franges: number }[]).map(f => [f.docent_id, Number(f.franges)])
  )
}
