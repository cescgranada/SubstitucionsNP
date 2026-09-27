import { createClient } from '@/lib/supabase/server'
import CalendariUnificat from './CalendariUnificat'

function parseMes(mesParam: string | undefined): { any: number; mes: number } {
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [a, m] = mesParam.split('-').map(Number)
    return { any: a, mes: m }
  }
  const avui = new Date()
  return { any: avui.getFullYear(), mes: avui.getMonth() + 1 }
}

function toDataStr(any: number, mes: number, dia: number): string {
  return `${any}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export default async function CalendariPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes: mesParam } = await searchParams
  const { any, mes } = parseMes(mesParam)

  const darreraDia = new Date(any, mes, 0).getDate()
  const dataInici = toDataStr(any, mes, 1)
  const dataFi = toDataStr(any, mes, darreraDia)

  const supabase = await createClient()

  // Etapes (per als filtres) i el mapa docent -> etapes / grup -> etapa,
  // per poder filtrar absencies, sortides i substitucions per etapa
  // sense haver de repetir la consulta amb cada canvi de filtre (es filtra
  // al client).
  const [
    { data: etapes },
    { data: docentEtapes },
    { data: grups },
    { data: absencies },
    { data: sortides },
    { data: substitucions },
  ] = await Promise.all([
    supabase.from('etapes').select('id, codi, nom').order('codi'),
    supabase.from('docent_etapes').select('docent_id, etapa:etapa_id(codi)'),
    supabase.from('grups').select('id, etapa_id'),
    supabase
      .from('absencies')
      .select('id, data, data_fi, motiu, estat, docent:docent_id(id, nom)')
      .in('estat', ['aprovada', 'pendent'])
      .lte('data', dataFi)
      .or(`data_fi.gte.${dataInici},and(data_fi.is.null,data.gte.${dataInici})`),
    supabase
      .from('sortides')
      .select(`
        id, data, hora_inici, hora_fi, descripcio, observacions,
        proposador:proposada_per(nom),
        sortida_grups(grup_id, grup:grup_id(nom)),
        sortida_acompanyants(docent:docent_id(nom))
      `)
      .eq('estat', 'aprovada')
      .gte('data', dataInici)
      .lte('data', dataFi),
    supabase
      .from('substitucions')
      .select(`
        id, data, estat,
        substitut:substitut_id(nom),
        horari_setmanal:horari_setmanal_id(docent_id, materia, grup_id, franja:franja_id(hora_inici, hora_fi), grup:grup_id(nom)),
        absencia:absencia_id(docent_id, motiu, docent:docent_id(nom))
      `)
      .neq('estat', 'eliminada')
      .gte('data', dataInici)
      .lte('data', dataFi),
  ])

  const mesAnterior = mes === 1 ? `${any - 1}-12` : `${any}-${String(mes - 1).padStart(2, '0')}`
  const mesSeguent = mes === 12 ? `${any + 1}-01` : `${any}-${String(mes + 1).padStart(2, '0')}`

  return (
    <CalendariUnificat
      any={any}
      mes={mes}
      etapes={etapes ?? []}
      docentEtapes={docentEtapes ?? []}
      grups={grups ?? []}
      absencies={absencies ?? []}
      sortides={sortides ?? []}
      substitucions={substitucions ?? []}
      mesAnteriorParam={mesAnterior}
      mesSeguentParam={mesSeguent}
    />
  )
}
