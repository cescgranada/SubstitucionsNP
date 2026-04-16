import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubstitucioDetall from './SubstitucioDetall'

export default async function SubstitucioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase
    .from('docents')
    .select('id')
    .eq('email', user!.email!)
    .single()

  if (!docent) return notFound()

  const { data: substitucio } = await supabase
    .from('substitucions')
    .select(`
      *,
      substitut:substitut_id(id, nom, email),
      confirmador:confirmat_per(nom),
      horari_setmanal:horari_setmanal_id(
        tipus, materia, aula, tipus_parella,
        franja:franja_id(id, hora_inici, hora_fi),
        grup:grup_id(nom),
        parella_docent:parella_docent_id(nom)
      ),
      absencia:absencia_id(
        data, motiu, tot_el_dia,
        docent:docent_id(id, nom)
      )
    `)
    .eq('id', id)
    .single()

  if (!substitucio) return notFound()

  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docent.id)

  const esGestor = rols?.some(r =>
    ['cap_personal', 'director', 'sotsdirector', 'coordinacio_etapa'].includes(r.rol)
  )

  const esDocentAbsent = substitucio.absencia?.docent?.id === docent.id

  // Candidats per a la substitució (si és gestor i no confirmada)
  let candidats: any[] = []
  if (esGestor && substitucio.estat !== 'confirmada') {
    const franjaId = substitucio.horari_setmanal?.franja?.id
    const dataSubst = substitucio.data
    const diaJS = new Date(dataSubst + 'T12:00:00').getDay()
    const diaNum = diaJS === 0 ? 0 : diaJS

    if (franjaId && diaNum > 0) {
      // Etapa del docent absent
      const { data: etapes } = await supabase
        .from('docent_etapes')
        .select('etapa_id')
        .eq('docent_id', substitucio.absencia?.docent?.id ?? '')

      const etapaId = etapes?.[0]?.etapa_id

      if (etapaId) {
        // Docents de l'etapa
        const { data: docentEtapa } = await supabase
          .from('docent_etapes')
          .select('docent_id')
          .eq('etapa_id', etapaId)
          .neq('docent_id', substitucio.absencia?.docent?.id ?? '')

        const docentIds = docentEtapa?.map(d => d.docent_id) ?? []

        if (docentIds.length > 0) {
          const { data: candidatsList } = await supabase
            .from('horari_setmanal')
            .select('docent_id, tipus, docent:docent_id(id, nom)')
            .eq('franja_id', franjaId)
            .eq('dia_setmana', diaNum)
            .in('tipus', ['guardia', 'permanencia', 'hnl', 'disponible'])
            .in('docent_id', docentIds)

          candidats = candidatsList ?? []
        }
      }
    }
  }

  return (
    <SubstitucioDetall
      substitucio={substitucio}
      candidats={candidats}
      docentActualId={docent.id}
      esGestor={!!esGestor}
      esDocentAbsent={esDocentAbsent}
    />
  )
}
