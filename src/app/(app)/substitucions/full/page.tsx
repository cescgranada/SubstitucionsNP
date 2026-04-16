import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FullSubstitucions from './FullSubstitucions'

export default async function FullSubstitucionsPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>
}) {
  const { data: dataParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase
    .from('docents')
    .select('id')
    .eq('email', user!.email!)
    .single()

  if (!docent) redirect('/login')

  // Comprova que és gestor
  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docent.id)

  const esGestor = rols?.some(r =>
    ['cap_personal', 'director', 'sotsdirector', 'coordinacio_etapa'].includes(r.rol)
  )

  if (!esGestor) redirect('/substitucions')

  const avui = new Date().toISOString().split('T')[0]
  const data = dataParam ?? avui

  const { data: substitucions } = await supabase
    .from('substitucions')
    .select(`
      id, estat, feina_substitut,
      substitut:substitut_id(nom),
      confirmador:confirmat_per(nom),
      horari_setmanal:horari_setmanal_id(
        tipus, materia, aula,
        franja:franja_id(hora_inici, hora_fi, ordre),
        grup:grup_id(nom),
        etapa:franja_id(etapa:etapa_id(nom))
      ),
      absencia:absencia_id(
        motiu,
        docent:docent_id(nom)
      )
    `)
    .eq('data', data)
    .order('created_at')

  // Ordena per hora d'inici
  const subsOrdenades = (substitucions ?? []).sort((a: any, b: any) => {
    const ha = a.horari_setmanal?.franja?.hora_inici ?? ''
    const hb = b.horari_setmanal?.franja?.hora_inici ?? ''
    return ha.localeCompare(hb)
  })

  return (
    <FullSubstitucions
      data={data}
      substitucions={subsOrdenades}
      avui={avui}
    />
  )
}
