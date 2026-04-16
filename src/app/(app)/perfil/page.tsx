import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const NOMS_ROL: Record<string, string> = {
  docent: 'Docent',
  coordinacio_etapa: 'Coordinació d\'etapa',
  cap_personal: 'Cap de personal',
  director: 'Director/a',
  sotsdirector: 'Sotsdirector/a',
}

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: docent } = await supabase
    .from('docents')
    .select('id, nom, email, actiu, created_at')
    .eq('email', user.email!)
    .single()

  if (!docent) redirect('/login?error=no_docent')

  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol, nom_carrec, etapa:etapa_id(nom)')
    .eq('docent_id', docent.id)

  const { data: etapes } = await supabase
    .from('docent_etapes')
    .select('etapa:etapa_id(nom)')
    .eq('docent_id', docent.id)

  // Resum personal
  const { count: totalSubs } = await supabase
    .from('substitucions')
    .select('*', { count: 'exact', head: true })
    .eq('substitut_id', docent.id)
    .eq('estat', 'confirmada')

  const { count: totalAbsencies } = await supabase
    .from('absencies')
    .select('*', { count: 'exact', head: true })
    .eq('docent_id', docent.id)
    .eq('estat', 'aprovada')

  const inicials = docent.nom.split(' ').map((n: string) => n[0]).slice(0, 2).join('')

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
        Perfil
      </h1>

      {/* Targeta principal */}
      <div className="card">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            {inicials}
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              {docent.nom}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {docent.email}
            </p>
          </div>
        </div>

        {/* Rols */}
        {rols && rols.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Rols
            </p>
            <div className="flex flex-wrap gap-2">
              {rols
                .filter(r => r.rol !== 'docent')
                .map((r: any, i: number) => (
                  <span key={i} className="badge" style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}>
                    {r.nom_carrec ?? NOMS_ROL[r.rol]}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Etapes */}
        {etapes && etapes.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Etapes
            </p>
            <div className="flex flex-wrap gap-2">
              {etapes.map((e: any, i: number) => (
                <span key={i} className="badge" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                  {e.etapa?.nom}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resum estadístic */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
            {totalSubs ?? 0}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Substitucions fetes
          </p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold" style={{ color: 'var(--color-secondary)' }}>
            {totalAbsencies ?? 0}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Dies d&apos;absència
          </p>
        </div>
      </div>

      {/* Botó de tancar sessió */}
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="btn-secondary w-full"
          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
        >
          Tancar sessió
        </button>
      </form>
    </div>
  )
}
