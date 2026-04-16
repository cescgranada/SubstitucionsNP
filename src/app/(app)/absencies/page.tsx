import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const MOTIUS: Record<string, string> = {
  medic: 'Mèdic',
  dia_personal: 'Dia personal',
  formacio: 'Formació',
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

export default async function AbsenciesPage() {
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

  const esGestor = rols?.some(r =>
    ['cap_personal', 'director', 'sotsdirector', 'coordinacio_etapa'].includes(r.rol)
  )

  // Absències pròpies
  const { data: absenciesPropia } = await supabase
    .from('absencies')
    .select('id, data, data_fi, motiu, estat, tot_el_dia, hora_inici, hora_fi')
    .eq('docent_id', docent.id)
    .order('data', { ascending: false })
    .limit(20)

  // Absències a gestionar (si és gestor)
  const { data: absenciesGestio } = esGestor
    ? await supabase
        .from('absencies')
        .select('id, data, data_fi, motiu, estat, docent:docent_id(nom)')
        .eq('estat', 'pendent')
        .order('data', { ascending: true })
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

      {/* Absències pròpies */}
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
                <span className={`badge ${a.estat === 'cancel·lada' ? 'badge-cancel-lada' : `badge-${a.estat}`}`}>
                  {a.estat === 'pendent' ? 'Pendent' : a.estat === 'aprovada' ? 'Aprovada' : a.estat === 'cancel·lada' ? 'Cancel·lada' : 'Rebutjada'}
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
    </div>
  )
}
