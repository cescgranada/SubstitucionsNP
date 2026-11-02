import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MOTIUS } from '@/lib/etiquetes'

const NOMS_ROL: Record<string, string> = {
  equip_directiu: 'Equip directiu',
}

export default async function DocentDetallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Dades del docent
  const { data: docent } = await supabase
    .from('docents')
    .select(`
      id, nom, email, actiu,
      docent_etapes(etapa:etapa_id(nom)),
      docent_rols(rol, nom_carrec)
    `)
    .eq('id', id)
    .eq('actiu', true)
    .single()

  if (!docent) return notFound()

  // Absències properes i recents (RLS s'aplica automàticament)
  const avui = new Date().toISOString().split('T')[0]
  const fa30dies = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const en30dies = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const { data: absencies } = await supabase
    .from('absencies')
    .select('id, data, data_fi, motiu, estat, tot_el_dia, hora_inici, hora_fi')
    .eq('docent_id', id)
    .gte('data', fa30dies)
    .lte('data', en30dies)
    .order('data', { ascending: false })
    .limit(10)

  // Stats
  const { count: totalSubs } = await supabase
    .from('substitucions')
    .select('*', { count: 'exact', head: true })
    .eq('substitut_id', id)
    .eq('estat', 'confirmada')

  const rols = (docent.docent_rols as any[]) ?? []
  const etapes = (docent.docent_etapes as any[]) ?? []
  const rolPrincipal = rols.filter(r => r.rol !== 'docent')[0]
  const inicials = docent.nom.split(' ').map((n: string) => n[0]).slice(0, 2).join('')

  // Classifica absències
  const absenciesFutures = (absencies ?? []).filter(a => a.data > avui && !['rebutjada', 'cancel·lada', 'eliminada'].includes(a.estat))
  const absenciesPassades = (absencies ?? []).filter(a => a.data <= avui)

  function formatRang(data: string, dataFi: string | null): string {
    const opcionsFull = { weekday: 'long', day: 'numeric', month: 'long' } as const
    const opcions = { day: 'numeric', month: 'long' } as const
    if (!dataFi || dataFi === data) {
      return new Date(data + 'T12:00:00').toLocaleDateString('ca-ES', opcionsFull)
    }
    const inici = new Date(data + 'T12:00:00').toLocaleDateString('ca-ES', opcions)
    const fi = new Date(dataFi + 'T12:00:00').toLocaleDateString('ca-ES', opcionsFull)
    return `Del ${inici} al ${fi}`
  }

  const ESTAT_LABEL: Record<string, string> = {
    pendent: 'Pendent',
    aprovada: 'Aprovada',
    rebutjada: 'Rebutjada',
    'cancel·lada': 'Cancel·lada',
    eliminada: 'Eliminada',
  }
  const ESTAT_BADGE: Record<string, string> = {
    pendent: 'badge-pendent',
    aprovada: 'badge-aprovada',
    rebutjada: 'badge-rebutjada',
    'cancel·lada': 'badge-cancel-lada',
    eliminada: 'badge-eliminada',
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/docents" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          ← Personal
        </Link>
      </div>

      {/* Capçalera docent */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            {inicials}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
              {docent.nom}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {docent.email}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {rolPrincipal && (
                <span className="badge" style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}>
                  {rolPrincipal.nom_carrec ?? NOMS_ROL[rolPrincipal.rol]}
                </span>
              )}
              {etapes.map((de: any, i: number) => {
                const e = Array.isArray(de.etapa) ? de.etapa[0] : de.etapa
                return e ? (
                  <span key={i} className="badge" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    {e.nom}
                  </span>
                ) : null
              })}
            </div>
          </div>
          {totalSubs !== null && totalSubs > 0 && (
            <div className="ml-auto text-right flex-shrink-0">
              <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{totalSubs}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>subs. fetes</p>
            </div>
          )}
        </div>
      </div>

      {/* Absències properes */}
      {absenciesFutures.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Properes absències
          </h2>
          <div className="space-y-2">
            {absenciesFutures.map((a: any) => (
              <Link
                key={a.id}
                href={`/absencies/${a.id}`}
                className="card flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {formatRang(a.data, a.data_fi)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {MOTIUS[a.motiu]}
                    {!a.tot_el_dia && a.hora_inici && ` · ${a.hora_inici.slice(0, 5)}–${a.hora_fi?.slice(0, 5)}`}
                  </p>
                </div>
                <span className={`badge ${ESTAT_BADGE[a.estat] ?? 'badge-pendent'}`}>
                  {ESTAT_LABEL[a.estat] ?? a.estat}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Horari: una única vista, a "El meu horari" */}
      <Link
        href={`/horari?docent=${docent.id}`}
        className="card flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
        style={{ textDecoration: 'none' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Veure l&apos;horari setmanal</span>
        <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>→</span>
      </Link>

      {/* Absències recents */}
      {absenciesPassades.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Absències recents (últims 30 dies)
          </h2>
          <div className="space-y-2">
            {absenciesPassades.map((a: any) => (
              <Link
                key={a.id}
                href={`/absencies/${a.id}`}
                className="card flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none', opacity: 0.75 }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {formatRang(a.data, a.data_fi)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {MOTIUS[a.motiu]}
                  </p>
                </div>
                <span className={`badge ${ESTAT_BADGE[a.estat] ?? 'badge-aprovada'}`}>
                  {ESTAT_LABEL[a.estat] ?? a.estat}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
