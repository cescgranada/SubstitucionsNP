import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SortidaDetall from './SortidaDetall'

export default async function SortidaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase
    .from('docents')
    .select('id')
    .eq('email', user!.email!)
    .single()

  if (!docent) return notFound()

  const { data: sortida } = await supabase
    .from('sortides')
    .select(`
      *,
      proposador:proposada_per(id, nom),
      aprovador:aprovada_per(nom),
      sortida_grups(id, grup:grup_id(id, nom, codi)),
      sortida_acompanyants(id, docent:docent_id(id, nom))
    `)
    .eq('id', id)
    .single()

  if (!sortida) return notFound()

  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docent.id)

  const esGestor = rols?.some(r =>
    ['director', 'sotsdirector', 'coordinacio_etapa'].includes(r.rol)
  )

  const esProposador = sortida.proposador?.id === docent.id

  return (
    <SortidaDetall
      sortida={sortida}
      docentActualId={docent.id}
      esGestor={!!esGestor}
      esProposador={esProposador}
    />
  )
}
