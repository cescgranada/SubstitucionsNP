import { createClient } from '@/lib/supabase/server'
import CalendariSortides from './CalendariSortides'

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

export default async function CalendariSortidesPage({
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

  const { data: sortides } = await supabase
    .from('sortides')
    .select(`
      id, data, hora_inici, hora_fi, descripcio, observacions,
      proposador:proposada_per(nom),
      sortida_grups(grup:grup_id(nom)),
      sortida_acompanyants(docent:docent_id(nom))
    `)
    .eq('estat', 'aprovada')
    .gte('data', dataInici)
    .lte('data', dataFi)
    .order('data')

  const mesAnterior = mes === 1 ? `${any - 1}-12` : `${any}-${String(mes - 1).padStart(2, '0')}`
  const mesSeguent = mes === 12 ? `${any + 1}-01` : `${any}-${String(mes + 1).padStart(2, '0')}`
  const mesActualParam = `${any}-${String(mes).padStart(2, '0')}`

  return (
    <CalendariSortides
      any={any}
      mes={mes}
      sortides={sortides ?? []}
      mesAnteriorParam={mesAnterior}
      mesSeguentParam={mesSeguent}
      mesActualParam={mesActualParam}
    />
  )
}
