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
