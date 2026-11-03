import type { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * Docents que, en una data i un tram horari, no poden substituir ningú:
 * perquè acompanyen una sortida aprovada, perquè ja cobreixen una altra
 * substitució o perquè són absents aquell dia. Retorna docentId -> motiu per mostrar-lo a la fitxa.
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
  // Funció SECURITY DEFINER: un docent que comunica la seva absència no veu,
  // per RLS, les substitucions dels companys, però n'ha de saber l'ocupació.
  const { data: subs } = await supabase.rpc('substitucions_assignades_dia', { p_data: data })

  const exclosos = new Set(params.excloureSubstitucioIds ?? [])
  for (const s of (subs ?? []) as {
    id: string; substitut_id: string; hora_inici: string; hora_fi: string; absent_nom: string | null
  }[]) {
    if (exclosos.has(s.id)) continue
    if (s.hora_inici < horaFi && s.hora_fi > horaInici && !ocupats.has(s.substitut_id)) {
      ocupats.set(s.substitut_id, s.absent_nom ? `Substitueix ${s.absent_nom}` : 'Ja fa una altra substitució')
    }
  }

  // Docents que aquell dia són absents (aprovada o pendent) en el tram.
  // Per RLS un docent només veu les seves absències, així que es llegeix amb el
  // client de servei. Aquest codi només corre al servidor i el resultat no surt
  // d'aquí: només serveix per excloure candidats, mai es retorna la llista d'absents.
  try {
    const { data: absents } = await createAdminClient()
      .from('absencies')
      .select('docent_id, tot_el_dia, hora_inici, hora_fi')
      .in('estat', ['pendent', 'aprovada'])
      .lte('data', data)
      .or(`data_fi.gte.${data},and(data_fi.is.null,data.eq.${data})`)
    for (const a of absents ?? []) {
      const inici = a.tot_el_dia || !a.hora_inici || !a.hora_fi ? '00:00:00' : a.hora_inici
      const fi = a.tot_el_dia || !a.hora_inici || !a.hora_fi ? '23:59:59' : a.hora_fi
      if (inici < horaFi && fi > horaInici && !ocupats.has(a.docent_id)) {
        ocupats.set(a.docent_id, 'Absent aquest dia')
      }
    }
  } catch (e) {
    console.error('No s\'han pogut llegir els docents absents:', e)
  }

  return ocupats
}
