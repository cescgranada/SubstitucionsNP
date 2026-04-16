import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AbsenciaDetall from './AbsenciaDetall'

export default async function AbsenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase
    .from('docents')
    .select('id')
    .eq('email', user!.email!)
    .single()

  if (!docent) return notFound()

  const { data: absencia } = await supabase
    .from('absencies')
    .select(`
      *,
      docent:docent_id(id, nom, email),
      aprovador:aprovat_per(nom)
    `)
    .eq('id', id)
    .single()

  if (!absencia) return notFound()

  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docent.id)

  const esGestor = rols?.some(r =>
    ['cap_personal', 'director', 'sotsdirector'].includes(r.rol)
  )

  // Substitucions generades per aquesta absència
  const { data: substitucions } = await supabase
    .from('substitucions')
    .select(`
      id, data, estat, feina_substitut, motiu_proposta_ia,
      substitut:substitut_id(nom),
      horari_setmanal:horari_setmanal_id(
        tipus, materia,
        franja:franja_id(hora_inici, hora_fi),
        grup:grup_id(nom)
      )
    `)
    .eq('absencia_id', id)
    .order('data')
    .order('created_at')

  return (
    <AbsenciaDetall
      absencia={absencia}
      substitucions={substitucions ?? []}
      docentActualId={docent.id}
      esGestor={!!esGestor}
    />
  )
}
