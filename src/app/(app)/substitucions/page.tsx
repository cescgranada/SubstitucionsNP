import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AgendaDia from './AgendaDia'
import SubstitucionsPersonals from './SubstitucionsPersonals'
import { esEquipDirectiu } from '@/lib/roles'

export default async function SubstitucionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase
    .from('docents')
    .select('id')
    .eq('email', user!.email!)
    .single()

  if (!docent) return null

  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docent.id)

  const esGestor = esEquipDirectiu(rols)

  const avui = new Date().toISOString().split('T')[0]
  // Per a l'agenda: carrega les properes 2 setmanes + la setmana anterior
  const dataAgendaInici = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const dataAgendaFi = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

  // Substitucions on soc el substitut
  const { data: comsubs } = await supabase
    .from('substitucions')
    .select(`
      id, data, estat, feina_substitut, absencia_id, sortida_id, substitut_id,
      horari_setmanal:horari_setmanal_id(
        docent:docent_id(nom),
        tipus, materia,
        franja:franja_id(hora_inici, hora_fi),
        grup:grup_id(nom)
      ),
      absencia:absencia_id(
        docent:docent_id(nom)
      )
    `)
    .eq('substitut_id', docent.id)
    .neq('estat', 'eliminada')
    .order('data', { ascending: false })
    .limit(20)

  // Totes les substitucions per a l'agenda (gestors) — rang de dates ampli
  const { data: agenda } = esGestor
    ? await supabase
        .from('substitucions')
        .select(`
          id, data, estat, absencia_id, sortida_id, substitut_id,
          substitut:substitut_id(nom),
          horari_setmanal:horari_setmanal_id(
            docent:docent_id(nom),
            tipus, materia,
            franja:franja_id(hora_inici, hora_fi),
            grup:grup_id(nom)
          ),
          absencia:absencia_id(
            docent:docent_id(nom)
          )
        `)
        .neq('estat', 'eliminada')
        .gte('data', dataAgendaInici)
        .lte('data', dataAgendaFi)
        .order('data')
        .order('created_at')
    : { data: null }

  // Substitucions que he generat (per les meves pròpies absències — les
  // sortides no compten, ja que no tenen absencia_id)
  const { data: mevesAbsencies } = await supabase
    .from('absencies')
    .select('id')
    .eq('docent_id', docent.id)

  const absenciaIds = (mevesAbsencies ?? []).map(a => a.id)

  const { data: generades } = absenciaIds.length > 0
    ? await supabase
        .from('substitucions')
        .select(`
          id, data, estat, absencia_id, sortida_id, substitut_id,
          substitut:substitut_id(nom),
          horari_setmanal:horari_setmanal_id(
            docent:docent_id(nom),
            tipus, materia,
            franja:franja_id(hora_inici, hora_fi),
            grup:grup_id(nom)
          )
        `)
        .in('absencia_id', absenciaIds)
        .neq('estat', 'eliminada')
        .order('data', { ascending: false })
        .limit(30)
    : { data: [] }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
          Substitucions
        </h1>
        {esGestor && (
          <Link
            href="/substitucions/full"
            className="text-sm font-medium flex items-center gap-1.5"
            style={{ color: 'var(--color-accent)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Full del dia
          </Link>
        )}
      </div>

      {/* Agenda interactiva (gestors) */}
      {esGestor && agenda && (
        <AgendaDia
          substitucions={agenda as any}
          dataSeleccionada={avui}
        />
      )}

      {/* Les meves substitucions, en dues pestanyes */}
      <SubstitucionsPersonals
        comsubs={comsubs ?? []}
        generades={generades ?? []}
        avui={avui}
      />
    </div>
  )
}
