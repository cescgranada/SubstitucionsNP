import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SortidaDetall from './SortidaDetall'
import { esEquipDirectiu, esPas } from '@/lib/roles'

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
      eliminador:eliminada_per(nom),
      dinar_demanat_per:dinar_demanat_per(nom),
      transport_demanat_per:transport_demanat_per(nom),
      pagament_fet_per:pagament_fet_per(nom),
      sortida_grups(id, grup:grup_id(id, nom, codi, etapa_id)),
      sortida_acompanyants(id, docent:docent_id(id, nom))
    `)
    .eq('id', id)
    .single()

  if (!sortida) return notFound()

  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docent.id)

  const esGestor = esEquipDirectiu(rols)
  const esUsuariPas = esPas(rols)

  const esProposador = sortida.proposador?.id === docent.id

  // Docents candidats a acompanyant: qualsevol de les etapes implicades
  // a la sortida (nomes cal carregar-los si encara es pot decidir).
  const docentsCandidats: { id: string; nom: string }[] = []
  if (esGestor && sortida.estat === 'proposta') {
    const etapaIds = Array.from(new Set(
      ((sortida.sortida_grups as any[]) ?? [])
        .map((sg: any) => sg.grup?.etapa_id)
        .filter(Boolean)
    ))

    if (etapaIds.length > 0) {
      const { data: docentEtapes } = await supabase
        .from('docent_etapes')
        .select('docent:docent_id(id, nom)')
        .in('etapa_id', etapaIds)

      const vistos = new Set<string>()
      for (const de of (docentEtapes ?? []) as any[]) {
        if (de.docent?.id && !vistos.has(de.docent.id)) {
          vistos.add(de.docent.id)
          docentsCandidats.push({ id: de.docent.id, nom: de.docent.nom })
        }
      }
      docentsCandidats.sort((a, b) => a.nom.localeCompare(b.nom))
    }
  }

  return (
    <SortidaDetall
      sortida={sortida}
      docentActualId={docent.id}
      esGestor={!!esGestor}
      esProposador={esProposador}
      esPas={esUsuariPas}
      docentsCandidats={docentsCandidats}
    />
  )
}
