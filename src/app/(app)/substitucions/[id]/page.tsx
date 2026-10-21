import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubstitucioDetall from './SubstitucioDetall'
import { esEquipDirectiu } from '@/lib/roles'

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
      eliminador:eliminada_per(nom),
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

  const esGestor = esEquipDirectiu(rols)

  const esDocentAbsent = substitucio.absencia?.docent?.id === docent.id

  // Candidats per a la substitució (si és gestor i no confirmada)
  let candidats: any[] = []
  if (esGestor && ['pendent', 'proposta_ia'].includes(substitucio.estat)) {
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

  // Resta de docents (per si falta gent): tothom qui no és candidat prioritari,
  // amb el que fa en aquesta franja perquè l'equip directiu decideixi amb criteri.
  let altres: { id: string; nom: string; ocupacio: string; ocupat: boolean }[] = []
  if (esGestor && ['pendent', 'proposta_ia'].includes(substitucio.estat)) {
    const franjaId = substitucio.horari_setmanal?.franja?.id
    const diaNum = new Date(substitucio.data + 'T12:00:00').getDay()
    const absentId = substitucio.absencia?.docent?.id ?? ''

    const [{ data: tots }, { data: rolsPas }] = await Promise.all([
      supabase.from('docents').select('id, nom').eq('actiu', true).order('nom'),
      supabase.from('docent_rols').select('docent_id').eq('rol', 'pas'),
    ])
    const idsPas = new Set((rolsPas ?? []).map((r: any) => r.docent_id))
    const idsCandidats = new Set(candidats.map((c: any) => c.docent_id))

    const horariPerDocent = new Map<string, { tipus: string; grup?: string }>()
    const ocupatsPerSubstitucio = new Set<string>()
    if (franjaId && diaNum > 0) {
      const { data: horaris } = await supabase
        .from('horari_setmanal')
        .select('docent_id, tipus, grup:grup_id(nom)')
        .eq('franja_id', franjaId)
        .eq('dia_setmana', diaNum)
      for (const h of (horaris ?? []) as any[]) {
        horariPerDocent.set(h.docent_id, { tipus: h.tipus, grup: h.grup?.nom })
      }

      const { data: subsMateixaFranja } = await supabase
        .from('substitucions')
        .select('id, substitut_id, horari_setmanal:horari_setmanal_id(franja_id)')
        .eq('data', substitucio.data)
        .eq('estat', 'confirmada')
      for (const s of (subsMateixaFranja ?? []) as any[]) {
        if (s.id !== substitucio.id && s.substitut_id && s.horari_setmanal?.franja_id === franjaId) {
          ocupatsPerSubstitucio.add(s.substitut_id)
        }
      }
    }

    const TEXT: Record<string, string> = {
      classe: 'Té classe', guardia: 'Guàrdia', permanencia: 'Permanència', reunio: 'Reunió',
      esbarjo: 'Esbarjo', hnl: 'Hora no lectiva', disponible: 'Disponible',
    }
    altres = (tots ?? [])
      .filter((d: any) => d.id !== absentId && !idsPas.has(d.id) && !idsCandidats.has(d.id))
      .map((d: any) => {
        const h = horariPerDocent.get(d.id)
        const jaSubstitueix = ocupatsPerSubstitucio.has(d.id)
        let ocupacio = h ? (TEXT[h.tipus] ?? h.tipus) + (h.grup ? ` · ${h.grup}` : '') : 'Sense horari en aquesta franja'
        if (jaSubstitueix) ocupacio = 'Ja substitueix en aquesta franja'
        return { id: d.id, nom: d.nom, ocupacio, ocupat: jaSubstitueix || h?.tipus === 'classe' || h?.tipus === 'reunio' }
      })
  }

  return (
    <SubstitucioDetall
      substitucio={substitucio}
      altres={altres}
      candidats={candidats}
      docentActualId={docent.id}
      esGestor={!!esGestor}
      esDocentAbsent={esDocentAbsent}
    />
  )
}
