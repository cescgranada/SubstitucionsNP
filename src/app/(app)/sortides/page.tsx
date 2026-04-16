import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function SortidesPage() {
  const supabase = await createClient()

  const avui = new Date().toISOString().split('T')[0]

  const { data: sortides } = await supabase
    .from('sortides')
    .select(`
      id, data, hora_inici, hora_fi, descripcio, estat,
      proposada_per_docent:proposada_per(nom),
      sortida_grups(grup:grup_id(nom))
    `)
    .order('data', { ascending: true })
    .limit(30)

  const properes = sortides?.filter(s => s.data >= avui) ?? []
  const passades = sortides?.filter(s => s.data < avui) ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
        Sortides escolars
      </h1>

      {properes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Properes
          </h2>
          <div className="space-y-2">
            {properes.map((s: any) => (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {s.descripcio}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {new Date(s.data).toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}{s.hora_inici?.slice(0, 5)}–{s.hora_fi?.slice(0, 5)}
                    </p>
                    {s.sortida_grups?.length > 0 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {s.sortida_grups.map((sg: any) => sg.grup?.nom).filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className={`badge badge-${s.estat} flex-shrink-0`}>
                    {s.estat === 'proposta' ? 'Proposta' : s.estat === 'aprovada' ? 'Aprovada' : 'Rebutjada'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {passades.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Passades
          </h2>
          <div className="space-y-2">
            {passades.slice(0, 5).map((s: any) => (
              <div key={s.id} className="card" style={{ opacity: 0.7 }}>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {s.descripcio}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {new Date(s.data).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {sortides?.length === 0 && (
        <div className="card text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">No hi ha sortides registrades.</p>
        </div>
      )}
    </div>
  )
}
