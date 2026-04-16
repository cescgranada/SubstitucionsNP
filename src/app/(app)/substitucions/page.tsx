import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AgendaDia from './AgendaDia'

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

  const esGestor = rols?.some(r =>
    ['cap_personal', 'director', 'sotsdirector', 'coordinacio_etapa'].includes(r.rol)
  )

  const avui = new Date().toISOString().split('T')[0]
  // Per a l'agenda: carrega les properes 2 setmanes + la setmana anterior
  const dataAgendaInici = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const dataAgendaFi = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

  // Substitucions on soc el substitut
  const { data: comsubs } = await supabase
    .from('substitucions')
    .select(`
      id, data, estat, feina_substitut,
      horari_setmanal:horari_setmanal_id(
        tipus, materia,
        franja:franja_id(hora_inici, hora_fi),
        grup:grup_id(nom)
      ),
      absencia:absencia_id(
        docent:docent_id(nom)
      )
    `)
    .eq('substitut_id', docent.id)
    .order('data', { ascending: false })
    .limit(20)

  // Totes les substitucions per a l'agenda (gestors) — rang de dates ampli
  const { data: agenda } = esGestor
    ? await supabase
        .from('substitucions')
        .select(`
          id, data, estat,
          substitut:substitut_id(nom),
          horari_setmanal:horari_setmanal_id(
            tipus, materia,
            franja:franja_id(hora_inici, hora_fi),
            grup:grup_id(nom)
          ),
          absencia:absencia_id(
            docent:docent_id(nom)
          )
        `)
        .gte('data', dataAgendaInici)
        .lte('data', dataAgendaFi)
        .order('data')
        .order('created_at')
    : { data: null }

  // Substitucions pendents de confirmar (gestors) — resum compacte
  const { data: pendents } = esGestor
    ? await supabase
        .from('substitucions')
        .select(`
          id, data, estat,
          substitut:substitut_id(nom),
          horari_setmanal:horari_setmanal_id(
            tipus, materia,
            franja:franja_id(hora_inici, hora_fi),
            grup:grup_id(nom)
          ),
          absencia:absencia_id(
            docent:docent_id(nom)
          )
        `)
        .in('estat', ['pendent', 'proposta_ia'])
        .gte('data', avui)
        .order('data', { ascending: true })
        .limit(10)
    : { data: null }

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

      {/* Gestió: pendents de confirmar */}
      {esGestor && pendents && pendents.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Per confirmar ({pendents.length})
          </h2>
          <div className="space-y-2">
            {pendents.map((s: any) => (
              <Link
                key={s.id}
                href={`/substitucions/${s.id}`}
                className="card flex items-start justify-between gap-3 hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {s.absencia?.docent?.nom}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(s.data).toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' · '}{s.horari_setmanal?.franja?.hora_inici?.slice(0, 5)}–{s.horari_setmanal?.franja?.hora_fi?.slice(0, 5)}
                    {s.horari_setmanal?.grup?.nom && ` · ${s.horari_setmanal.grup.nom}`}
                  </p>
                  {s.substitut && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-accent)' }}>
                      Proposat: {s.substitut.nom}
                    </p>
                  )}
                </div>
                <span className={`badge badge-${s.estat} flex-shrink-0`}>
                  {s.estat === 'pendent' ? 'Pendent' : 'Proposta'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Les meves substitucions (com a substitut) */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Com a substitut/a
        </h2>
        {comsubs && comsubs.length > 0 ? (
          <div className="space-y-2">
            {comsubs.map((s: any) => {
              const esFutura = s.data >= avui
              return (
                <Link
                  key={s.id}
                  href={`/substitucions/${s.id}`}
                  className="card flex items-start justify-between gap-3 hover:shadow-md transition-shadow"
                  style={{ textDecoration: 'none', opacity: esFutura ? 1 : 0.7 }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {new Date(s.data).toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {s.horari_setmanal?.franja?.hora_inici?.slice(0, 5)}–{s.horari_setmanal?.franja?.hora_fi?.slice(0, 5)}
                      {s.absencia?.docent?.nom && ` · Supleix ${s.absencia.docent.nom}`}
                    </p>
                    {s.horari_setmanal?.grup?.nom && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {s.horari_setmanal.grup.nom}
                        {s.horari_setmanal.materia && ` · ${s.horari_setmanal.materia}`}
                      </p>
                    )}
                    {s.feina_substitut && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--color-text-secondary)' }}>
                        &ldquo;{s.feina_substitut}&rdquo;
                      </p>
                    )}
                  </div>
                  <span className={`badge badge-${s.estat} flex-shrink-0`}>
                    {s.estat === 'pendent' ? 'Pendent' : s.estat === 'proposta_ia' ? 'Proposta' : 'Confirmada'}
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-sm">No tens substitucions registrades.</p>
          </div>
        )}
      </section>
    </div>
  )
}
