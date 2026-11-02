import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * Docents que, en una data i un tram horari, no poden substituir ningú:
 * perquè acompanyen una sortida aprovada o perquè ja cobreixen una altra
 * substitució. Retorna docentId -> motiu per mostrar-lo a la fitxa.
 */
export async function docentsOcupats(
  supabase: Supabase,
  params: { data: string; horaInici: string; horaFi: string; excloureSubstitucioIds?: string[] }
): Promise<Map<string, string>> {
  const { data, horaInici, horaFi } = params
  const ocupats = new Map<string, string>()

  // Sortides aprovades que se solapen amb el tram (sense hora = tot el dia)
  const { data: sortides } = await supabase
    .from('sortides')
    .select('descripcio, hora_inici, hora_fi, sortida_acompanyants(docent_id)')
    .eq('data', data)
    .eq('estat', 'aprovada')

  for (const s of (sortides ?? []) as any[]) {
    const inici = s.hora_inici ?? '00:00:00'
    const fi = s.hora_fi ?? '23:59:59'
    if (inici < horaFi && fi > horaInici) {
      for (const a of s.sortida_acompanyants ?? []) {
        ocupats.set(a.docent_id, `De sortida: ${s.descripcio}`)
      }
    }
  }

  // Substitucions ja assignades o proposades en aquest tram
  const { data: subs } = await supabase
    .from('substitucions')
    .select(`
      id, substitut_id,
      horari_setmanal:horari_setmanal_id(docent:docent_id(nom), franja:franja_id(hora_inici, hora_fi)),
      absencia:absencia_id(docent:docent_id(nom))
    `)
    .eq('data', data)
    .in('estat', ['confirmada', 'proposta_ia'])
    .not('substitut_id', 'is', null)

  const exclosos = new Set(params.excloureSubstitucioIds ?? [])
  for (const s of (subs ?? []) as any[]) {
    if (exclosos.has(s.id)) continue
    const f = s.horari_setmanal?.franja
    if (f && f.hora_inici < horaFi && f.hora_fi > horaInici && !ocupats.has(s.substitut_id)) {
      const absent = s.absencia?.docent?.nom ?? s.horari_setmanal?.docent?.nom
      ocupats.set(s.substitut_id, absent ? `Substitueix ${absent}` : 'Ja fa una altra substitució')
    }
  }

  return ocupats
}
