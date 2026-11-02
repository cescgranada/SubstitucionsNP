import { agruparBlocs, textHoraBloc, nomAbsent } from '@/lib/substitucions-blocs'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { esEquipDirectiu } from '@/lib/roles'
import { ESTAT_ABSENCIA, ESTAT_SUBSTITUCIO, MOTIUS } from '@/lib/etiquetes'

function BadgeEstat({ estat }: { estat: string }) {
  return <span className={`badge badge-${estat}`}>{ESTAT_SUBSTITUCIO[estat] ?? ESTAT_ABSENCIA[estat] ?? estat}</span>
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: docent } = await supabase
    .from('docents')
    .select('id, nom')
    .eq('email', user.email!)
    .single()

  if (!docent) return null

  // Substitucions properes (com a substitut)
  const avui = new Date().toISOString().split('T')[0]
  const { data: substitucionsProximes } = await supabase
    .from('substitucions')
    .select(`
      id, data, estat, feina_substitut, absencia_id, sortida_id, substitut_id,
      horari_setmanal:horari_setmanal_id (
        docent:docent_id(nom),
        tipus, materia, aula,
        franja:franja_id ( hora_inici, hora_fi ),
        grup:grup_id ( nom )
      ),
      absencia:absencia_id (
        docent:docent_id ( nom )
      )
    `)
    .eq('substitut_id', docent.id)
    .neq('estat', 'eliminada')
    .gte('data', avui)
    .order('data', { ascending: true })
    .limit(3)

  // Absències pendents d'aprovar (si és cap de personal / director)
  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docent.id)

  const esGestor = esEquipDirectiu(rols)

  const { data: absenciesPendents } = esGestor
    ? await supabase
        .from('absencies')
        .select('id, data, motiu, docent:docent_id(nom)')
        .eq('estat', 'pendent')
        .order('data', { ascending: true })
        .limit(5)
    : { data: null }

  // Substitucions pendents de confirmar (si és gestor): només per comptar blocs
  const { data: subsPendents } = esGestor
    ? await supabase
        .from('substitucions')
        .select(`
          id, data, estat, absencia_id, sortida_id, substitut_id,
          horari_setmanal:horari_setmanal_id (
            tipus, materia,
            franja:franja_id ( hora_inici, hora_fi ),
            grup:grup_id ( nom )
          )
        `)
        .in('estat', ['pendent', 'proposta_ia'])
        .gte('data', avui)
    : { data: null }

  const blocsProximes = agruparBlocs((substitucionsProximes ?? []) as any[])
  const blocsPendents = agruparBlocs((subsPendents ?? []) as any[])

  const nomCurt = docent.nom.split(' ')[0]

  return (
    <div className="space-y-6">
      {/* Salutació */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-primary)' }}>
          Bon dia, {nomCurt}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {new Date().toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Accions ràpides */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/sortides/nova"
          className="card flex flex-col items-center justify-center gap-2 py-4 px-1 text-center hover:shadow-md transition-shadow"
          style={{ textDecoration: 'none' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Comunicar sortida
          </span>
        </Link>

        <Link
          href="/absencies/nova"
          className="card flex flex-col items-center justify-center gap-2 py-4 px-1 text-center hover:shadow-md transition-shadow"
          style={{ textDecoration: 'none' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-secondary-light)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--color-secondary)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Comunicar absència
          </span>
        </Link>

      </div>

      {/* Substitucions properes com a substitut */}
      {blocsProximes.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Les meves properes substitucions
          </h2>
          <div className="space-y-2">
            {blocsProximes.map((b) => {
              const s: any = b.primera
              return (
              <div key={s.id} className="card flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {new Date(s.data).toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {textHoraBloc(b)}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {[s.horari_setmanal?.materia, s.horari_setmanal?.grup?.nom].filter(Boolean).join(' · ') || '—'}
                    {nomAbsent(s) && ` · Supleix ${nomAbsent(s)}`}
                  </p>
                  {s.feina_substitut && (
                    <p className="text-xs mt-1 italic" style={{ color: 'var(--color-text-secondary)' }}>
                      &ldquo;{s.feina_substitut}&rdquo;
                    </p>
                  )}
                </div>
                <BadgeEstat estat={s.estat} />
              </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Pendent d'aprovació (gestors) */}
      {esGestor && absenciesPendents && absenciesPendents.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Absències pendents d&apos;aprovar
          </h2>
          <div className="space-y-2">
            {absenciesPendents.map((a: any) => (
              <Link key={a.id} href={`/absencies/${a.id}`} className="card flex items-center justify-between gap-3 hover:shadow-md transition-shadow" style={{ textDecoration: 'none' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {a.docent?.nom}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(a.data).toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'short' })} · {MOTIUS[a.motiu] ?? a.motiu}
                  </p>
                </div>
                <BadgeEstat estat="pendent" />
              </Link>
            ))}
          </div>
          <Link
            href="/absencies"
            className="text-sm font-medium mt-3 block"
            style={{ color: 'var(--color-accent)' }}
          >
            Veure totes →
          </Link>
        </section>
      )}

      {/* Substitucions pendents de confirmar (gestors): resum, el detall és a Substitucions */}
      {esGestor && blocsPendents.length > 0 && (
        <Link
          href="/substitucions"
          className="card flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
          style={{ textDecoration: 'none' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {blocsPendents.length === 1 ? '1 substitució' : `${blocsPendents.length} substitucions`} per confirmar
          </p>
          <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>Veure →</span>
        </Link>
      )}

      {/* Estat buit */}
      {(!substitucionsProximes || substitucionsProximes.length === 0) &&
       (!subsPendents || subsPendents.length === 0) &&
       (!absenciesPendents || absenciesPendents.length === 0) && (
        <div
          className="card text-center py-10"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm">Tot al dia! No tens substitucions ni gestions pendents.</p>
        </div>
      )}
    </div>
  )
}
