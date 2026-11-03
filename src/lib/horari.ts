import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type FranjaDocent = { id: string; hora_inici: string; hora_fi: string }

/** Clau d'una franja per hores, perquè franges d'etapes diferents amb les mateixes hores es tractin igual. */
export const clauFranja = (inici: string, fi: string) => `${inici.slice(0, 5)}-${fi.slice(0, 5)}`

/**
 * Franges en què es pot posar activitat a l'horari d'un docent: les de les
 * seves etapes i, a més, les que ja fa servir (per si dona classe en una
 * altra etapa). Una per cada tram d'hores, ordenades per hora d'inici.
 */
export async function franjesDocent(supabase: Supabase, docentId: string): Promise<FranjaDocent[]> {
  const [{ data: etapes }, { data: usades }] = await Promise.all([
    supabase.from('docent_etapes').select('etapa_id').eq('docent_id', docentId),
    supabase.from('horari_setmanal').select('franja:franja_id(id, hora_inici, hora_fi)').eq('docent_id', docentId),
  ])
  const etapaIds = (etapes ?? []).map(e => e.etapa_id)
  const { data: pròpies } = etapaIds.length > 0
    ? await supabase.from('franges_horaries').select('id, hora_inici, hora_fi').in('etapa_id', etapaIds)
    : { data: [] as FranjaDocent[] }

  const perClau = new Map<string, FranjaDocent>()
  for (const f of (pròpies ?? []) as FranjaDocent[]) perClau.set(clauFranja(f.hora_inici, f.hora_fi), f)
  for (const u of (usades ?? []) as any[]) {
    const f = Array.isArray(u.franja) ? u.franja[0] : u.franja
    if (f && !perClau.has(clauFranja(f.hora_inici, f.hora_fi))) perClau.set(clauFranja(f.hora_inici, f.hora_fi), f)
  }
  return Array.from(perClau.values()).sort((a, b) => a.hora_inici.localeCompare(b.hora_inici))
}
