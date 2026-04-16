import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function SortidesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase
    .from('docents')
    .select('id')
    .eq('email', user!.email!)
    .single()

  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docent?.id ?? '')

  const esGestor = rols?.some(r =>
    ['director', 'sotsdirector', 'coordinacio_etapa'].includes(r.rol)
  )

  const avui = new Date().toISOString().split('T')[0]

  const { data: sortides } = await supabase
    .from('sortides')
    .select(`
      id, data, hora_inici, hora_fi, descripcio, estat,
      proposador:proposada_per(nom),
      sortida_grups(grup:grup_id(nom))
    `)
    .order('data', { ascending: false })
    .limit(40)

  const properes = (sortides ?? []).filter((s: any) => s.data >= avui)
  const passades = (sortides ?? []).filter((s: any) => s.data < avui)
  const pendentsAprovacio = properes.filter((s: any) => s.estat === 'proposta')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
          Sortides escolars
        </h1>
        <Link href="/sortides/nova" className="btn-primary text-sm px-4 py-2" style={{ minHeight: '36px' }}>
          + Nova
        </Link>
      </div>

      {/* Pendents d'aprovació (gestors) */}
      {esGestor && pendentsAprovacio.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Pendents d&apos;aprovació ({pendentsAprovacio.length})
          </h2>
          <div className="space-y-2">
            {pendentsAprovacio.map((s: any) => (
              <Link
                key={s.id}
                href={`/sortides/${s.id}`}
                className="card flex items-start justify-between gap-3 hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{s.descripcio}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(s.data).toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' · '}{s.hora_inici?.slice(0, 5)}–{s.hora_fi?.slice(0, 5)}
                    {' · '}{s.proposador?.nom}
                  </p>
                </div>
                <span className="badge badge-pendent flex-shrink-0">Proposta</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Properes */}
      {properes.filter((s: any) => s.estat !== 'proposta' || !esGestor).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Properes
          </h2>
          <div className="space-y-2">
            {properes.map((s: any) => (
              <Link
                key={s.id}
                href={`/sortides/${s.id}`}
                className="card flex items-start justify-between gap-3 hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{s.descripcio}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(s.data).toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' · '}{s.hora_inici?.slice(0, 5)}–{s.hora_fi?.slice(0, 5)}
                  </p>
                  {s.sortida_grups?.length > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {(s.sortida_grups as any[]).map((sg: any) => sg.grup?.nom).filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <span className={`badge badge-${s.estat === 'proposta' ? 'pendent' : s.estat} flex-shrink-0`}>
                  {s.estat === 'proposta' ? 'Proposta' : s.estat === 'aprovada' ? 'Aprovada' : 'Rebutjada'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Passades */}
      {passades.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Passades
          </h2>
          <div className="space-y-2">
            {passades.slice(0, 8).map((s: any) => (
              <Link
                key={s.id}
                href={`/sortides/${s.id}`}
                className="card flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none', opacity: 0.65 }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{s.descripcio}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(s.data).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`badge badge-${s.estat === 'aprovada' ? 'aprovada' : 'rebutjada'} flex-shrink-0`}>
                  {s.estat === 'aprovada' ? 'Aprovada' : 'Rebutjada'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(!sortides || sortides.length === 0) && (
        <div className="card text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">No hi ha sortides registrades. Proposa&apos;n una!</p>
        </div>
      )}
    </div>
  )
}
