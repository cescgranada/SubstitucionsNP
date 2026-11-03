import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubstitucioDetall, { type BlocInfo, type DocentOpcio } from './SubstitucioDetall'
import { esEquipDirectiu } from '@/lib/roles'
import { agruparBlocs } from '@/lib/substitucions-blocs'
import { docentsOcupats } from '@/lib/ocupacio'
import { coberturesCurs } from '@/lib/curs'
import { TIPUS_HORARI as TEXT_TIPUS } from '@/lib/etiquetes'

const TIPUS_PRIORITARIS = ['guardia', 'permanencia', 'hnl', 'disponible']

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
        docent:docent_id(nom),
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

  // Bloc al qual pertany aquesta franja: les franges seguides de la mateixa
  // matèria i grup es tracten com una sola fitxa.
  const clauOrigen = substitucio.absencia_id
    ? { col: 'absencia_id', val: substitucio.absencia_id }
    : substitucio.sortida_id ? { col: 'sortida_id', val: substitucio.sortida_id } : null

  let filesBloc: any[] = [substitucio]
  if (clauOrigen) {
    const { data: germanes } = await supabase
      .from('substitucions')
      .select(`
        id, data, estat, substitut_id, absencia_id, sortida_id, feina_substitut,
        substitut:substitut_id(id, nom),
        horari_setmanal:horari_setmanal_id(
          docent:docent_id(nom),
          tipus, materia,
          franja:franja_id(id, hora_inici, hora_fi),
          grup:grup_id(nom)
        )
      `)
      .eq(clauOrigen.col, clauOrigen.val)
      .eq('data', substitucio.data)
      .neq('estat', 'eliminada')
    const bloc = agruparBlocs((germanes ?? []) as any[]).find(b => b.ids.includes(id))
    if (bloc) filesBloc = bloc.files
  }
  filesBloc = [...filesBloc].sort((a, b) =>
    (a.horari_setmanal?.franja?.hora_inici ?? '').localeCompare(b.horari_setmanal?.franja?.hora_inici ?? '')
  )

  const bloc: BlocInfo = {
    ids: filesBloc.map(f => f.id),
    franges: filesBloc.map(f => ({
      id: f.id,
      horaInici: f.horari_setmanal?.franja?.hora_inici ?? '',
      horaFi: f.horari_setmanal?.franja?.hora_fi ?? '',
      substitutId: f.substitut_id ?? null,
    })),
    horaInici: filesBloc[0]?.horari_setmanal?.franja?.hora_inici ?? '',
    horaFi: filesBloc[filesBloc.length - 1]?.horari_setmanal?.franja?.hora_fi ?? '',
    feina: Array.from(new Set(filesBloc.map(f => f.feina_substitut).filter(Boolean))).join('\n\n'),
    substituts: Array.from(new Map(
      filesBloc.filter(f => f.substitut).map(f => [f.substitut.id, f.substitut.nom])
    ).values()) as string[],
  }

  // Docents entre els quals triar (només l'equip directiu; es pot canviar fins i tot un cop confirmada)
  let docents: DocentOpcio[] = []
  if (esGestor && substitucio.estat !== 'eliminada') {
    const diaNum = new Date(substitucio.data + 'T12:00:00').getDay()
    const absentId = substitucio.absencia?.docent?.id ?? ''

    const [{ data: tots }, { data: rolsPas }, { data: etapesAbsent }] = await Promise.all([
      supabase.from('docents').select('id, nom').eq('actiu', true).order('nom'),
      supabase.from('docent_rols').select('docent_id').eq('rol', 'pas'),
      supabase.from('docent_etapes').select('etapa_id').eq('docent_id', absentId),
    ])
    const idsPas = new Set((rolsPas ?? []).map((r: any) => r.docent_id))
    const cobertures = await coberturesCurs(supabase, substitucio.data)

    const etapaIds = (etapesAbsent ?? []).map((e: any) => e.etapa_id)
    const { data: membresEtapa } = etapaIds.length > 0
      ? await supabase.from('docent_etapes').select('docent_id').in('etapa_id', etapaIds)
      : { data: [] as any[] }
    const idsEtapa = new Set((membresEtapa ?? []).map((m: any) => m.docent_id))

    // Per cada franja del bloc: què fa cada docent i qui no pot substituir
    const horariPerFranja = new Map<string, Map<string, { tipus: string; grup?: string }>>()
    const ocupatsPerFranja = new Map<string, Map<string, string>>()
    for (const f of bloc.franges) {
      const franjaId = filesBloc.find(x => x.id === f.id)?.horari_setmanal?.franja?.id
      const mapa = new Map<string, { tipus: string; grup?: string }>()
      if (franjaId && diaNum > 0) {
        const { data: horaris } = await supabase
          .from('horari_setmanal')
          .select('docent_id, tipus, grup:grup_id(nom)')
          .eq('franja_id', franjaId)
          .eq('dia_setmana', diaNum)
        for (const h of (horaris ?? []) as any[]) mapa.set(h.docent_id, { tipus: h.tipus, grup: h.grup?.nom })
      }
      horariPerFranja.set(f.id, mapa)
      ocupatsPerFranja.set(f.id, await docentsOcupats(supabase, {
        data: substitucio.data,
        horaInici: f.horaInici,
        horaFi: f.horaFi,
        excloureSubstitucioIds: bloc.ids,
      }))
    }

    docents = (tots ?? [])
      .filter((d: any) => d.id !== absentId && !idsPas.has(d.id))
      .map((d: any) => {
        const franges: DocentOpcio['franges'] = {}
        let prioritari = idsEtapa.has(d.id)
        for (const f of bloc.franges) {
          const motiuOcupat = ocupatsPerFranja.get(f.id)?.get(d.id)
          const h = horariPerFranja.get(f.id)?.get(d.id)
          if (motiuOcupat) {
            franges[f.id] = { text: motiuOcupat, bloquejat: true, avis: false }
            prioritari = false
          } else if (h) {
            const lliure = TIPUS_PRIORITARIS.includes(h.tipus)
            franges[f.id] = {
              text: (TEXT_TIPUS[h.tipus] ?? h.tipus) + (h.grup ? ` · ${h.grup}` : ''),
              bloquejat: false,
              avis: !lliure,
            }
            if (!lliure) prioritari = false
          } else {
            franges[f.id] = { text: 'Sense horari en aquesta franja', bloquejat: false, avis: false }
            prioritari = false
          }
        }
        return { id: d.id, nom: d.nom, prioritari, cobertures: cobertures.get(d.id) ?? 0, franges }
      })
      // Primer qui n'ha cobert menys, per repartir les substitucions
      .sort((a, b) => a.cobertures - b.cobertures || a.nom.localeCompare(b.nom))
  }

  // Qui hi ha renunciat abans (només ho veu l'equip directiu)
  let rebutjos: { nom: string; motiu: string | null }[] = []
  if (esGestor) {
    const { data } = await supabase
      .from('substitucions_rebutjos')
      .select('motiu, docent:docent_id(nom)')
      .in('substitucio_id', bloc.ids)
      .order('created_at')
    const vistos = new Set<string>()
    rebutjos = ((data ?? []) as any[])
      .map(r => ({ nom: (Array.isArray(r.docent) ? r.docent[0] : r.docent)?.nom ?? '', motiu: r.motiu as string | null }))
      .filter(r => {
        const clau = `${r.nom}|${r.motiu ?? ''}`
        if (!r.nom || vistos.has(clau)) return false
        vistos.add(clau)
        return true
      })
  }

  return (
    <SubstitucioDetall
      substitucio={substitucio}
      bloc={bloc}
      rebutjos={rebutjos}
      docents={docents}
      docentActualId={docent.id}
      esGestor={!!esGestor}
      esDocentAbsent={esDocentAbsent}
    />
  )
}
