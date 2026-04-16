import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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

  // Substitucions on soc el substitut (properes i passades)
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

  // Totes les substitucions pendents (si és gestor)
  const { data: totes } = esGestor
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
    : { data: null }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
        Substitucions
      </h1>

      {/* Gestió: pendents de confirmar */}
      {esGestor && totes && totes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Per confirmar ({totes.length})
          </h2>
          <div className="space-y-2">
            {totes.map((s: any) => (
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
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-info)' }}>
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
