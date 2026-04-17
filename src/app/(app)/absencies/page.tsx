import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const MOTIUS: Record<string, string> = {
  medic: 'Mèdic',
  dia_personal: 'Dia personal',
  formacio: 'Formació',
}

const BADGE_ESTAT: Record<string, string> = {
  pendent: 'badge-pendent',
  aprovada: 'badge-aprovada',
  rebutjada: 'badge-rebutjada',
  'cancel·lada': 'badge-cancel-lada',
}

const TEXT_ESTAT: Record<string, string> = {
  pendent: 'Pendent',
  aprovada: 'Aprovada',
  rebutjada: 'Rebutjada',
  'cancel·lada': 'Cancel·lada',
}

function formatData(data: string, dataFi: string | null): string {
  const opcions = { day: 'numeric', month: 'long' } as const
  const opcionsFull = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const
  const inici = new Date(data + 'T12:00:00').toLocaleDateString('ca-ES', opcions)
  if (!dataFi || dataFi === data) {
    return new Date(data + 'T12:00:00').toLocaleDateString('ca-ES', opcionsFull)
  }
  const fi = new Date(dataFi + 'T12:00:00').toLocaleDateString('ca-ES', opcions)
  return `Del ${inici} al ${fi}`
}

export default async function AbsenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ filtreDocent?: string; filtreEstat?: string }>
}) {
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
    .select('rol, etapa_id')
    .eq('docent_id', docent.id)

  // Pot veure pendents: cap_personal, director, sotsdirector, coordinació
  const esGestor = rols?.some(r =>
    ['cap_personal', 'director', 'sotsdirector', 'coordinacio_etapa'].includes(r.rol)
  )

  // Pot veure historial complet del claustre: cap_personal, director, sotsdirector
  const esHistorialGestor = rols?.some(r =>
    ['cap_personal', 'director', 'sotsdirector'].includes(r.rol)
  )

  const params = await searchParams
  const filtreDocentId = params.filtreDocent ?? ''
  const filtreEstat = params.filtreEstat ?? ''

  // Absències pròpies (tothom les veu sempre)
  const { data: absenciesPropia } = await supabase
    .from('absencies')
    .select('id, data, data_fi, motiu, estat, tot_el_dia, hora_inici, hora_fi')
    .eq('docent_id', docent.id)
    .order('data', { ascending: false })
    .limit(20)

  // Absències pendents d'aprovar (gestors)
  const { data: absenciesGestio } = esGestor
    ? await supabase
        .from('absencies')
        .select('id, data, data_fi, motiu, estat, docent:docent_id(nom)')
        .eq('estat', 'pendent')
        .neq('docent_id', docent.id) // Les pròpies ja es veuen a la secció personal
        .order('data', { ascending: true })
    : { data: null }

  // Historial complet del claustre (cap_personal, director, sotsdirector)
  let historialQuery = supabase
    .from('absencies')
    .select('id, data, data_fi, motiu, estat, docent:docent_id(id, nom)')
    .order('data', { ascending: false })
    .limit(60)

  if (filtreDocentId) historialQuery = historialQuery.eq('docent_id', filtreDocentId)
  if (filtreEstat) historialQuery = historialQuery.eq('estat', filtreEstat)

  const { data: historialClaustre } = esHistorialGestor
    ? await historialQuery
    : { data: null }

  // Llista de docents per al filtre (només si és historial gestor)
  const { data: totsDocents } = esHistorialGestor
    ? await supabase
        .from('docents')
        .select('id, nom')
        .order('nom')
    : { data: null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
          Absències
        </h1>
        <Link href="/absencies/nova" className="btn-primary text-sm px-4 py-2" style={{ minHeight: '36px' }}>
          + Nova
        </Link>
      </div>

      {/* Pendents de gestió */}
      {esGestor && absenciesGestio && absenciesGestio.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Pendents d&apos;aprovar ({absenciesGestio.length})
          </h2>
          <div className="space-y-2">
            {absenciesGestio.map((a: any) => (
              <Link
                key={a.id}
                href={`/absencies/${a.id}`}
                className="card flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{a.docent?.nom}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatData(a.data, a.data_fi)} · {MOTIUS[a.motiu]}
                  </p>
                </div>
                <span className="badge badge-pendent">Pendent</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Absències pròpies — visible per a tothom, inclosos gestors */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Les meves absències
        </h2>
        {absenciesPropia && absenciesPropia.length > 0 ? (
          <div className="space-y-2">
            {absenciesPropia.map((a: any) => (
              <Link
                key={a.id}
                href={`/absencies/${a.id}`}
                className="card flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {formatData(a.data, a.data_fi)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {MOTIUS[a.motiu]}
                    {!a.tot_el_dia && a.hora_inici && ` · ${a.hora_inici.slice(0, 5)}–${a.hora_fi?.slice(0, 5)}`}
                  </p>
                </div>
                <span className={`badge ${BADGE_ESTAT[a.estat] ?? 'badge-pendent'}`}>
                  {TEXT_ESTAT[a.estat] ?? a.estat}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-sm">No has registrat cap absència encara.</p>
          </div>
        )}
      </section>

      {/* Historial complet del claustre — cap_personal, director, sotsdirector */}
      {esHistorialGestor && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Historial del claustre
          </h2>

          {/* Filtres (formulari GET sense JS) */}
          <form method="GET" className="flex gap-2 mb-4 flex-wrap">
            <select
              name="filtreDocent"
              defaultValue={filtreDocentId}
              className="text-sm rounded-lg border px-3 py-2 flex-1 min-w-0"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">Tots els docents</option>
              {(totsDocents ?? []).map((d: any) => (
                <option key={d.id} value={d.id}>{d.nom}</option>
              ))}
            </select>
            <select
              name="filtreEstat"
              defaultValue={filtreEstat}
              className="text-sm rounded-lg border px-3 py-2"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">Tots els estats</option>
              <option value="pendent">Pendent</option>
              <option value="aprovada">Aprovada</option>
              <option value="rebutjada">Rebutjada</option>
              <option value="cancel·lada">Cancel·lada</option>
            </select>
            <button
              type="submit"
              className="btn-secondary text-sm px-4"
              style={{ minHeight: '38px' }}
            >
              Filtrar
            </button>
            {(filtreDocentId || filtreEstat) && (
              <a
                href="/absencies"
                className="text-sm flex items-center px-3"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Netejar
              </a>
            )}
          </form>

          {historialClaustre && historialClaustre.length > 0 ? (
            <div className="space-y-2">
              {historialClaustre.map((a: any) => (
                <Link
                  key={a.id}
                  href={`/absencies/${a.id}`}
                  className="card flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
                  style={{ textDecoration: 'none' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {a.docent?.nom}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatData(a.data, a.data_fi)} · {MOTIUS[a.motiu] ?? a.motiu}
                    </p>
                  </div>
                  <span className={`badge ${BADGE_ESTAT[a.estat] ?? 'badge-pendent'} flex-shrink-0`}>
                    {TEXT_ESTAT[a.estat] ?? a.estat}
                  </span>
                </Link>
              ))}
              {historialClaustre.length === 60 && (
                <p className="text-xs text-center pt-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Mostrant les 60 més recents. Utilitza els filtres per cercar registres concrets.
                </p>
              )}
            </div>
          ) : (
            <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
              <p className="text-sm">Cap absència trobada amb els filtres seleccionats.</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
