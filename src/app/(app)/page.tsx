import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function BadgeEstat({ estat }: { estat: string }) {
  return (
    <span className={`badge badge-${estat}`}>
      {estat === 'pendent' && 'Pendent'}
      {estat === 'aprovada' && 'Aprovada'}
      {estat === 'confirmada' && 'Confirmada'}
      {estat === 'proposta_ia' && 'Proposta IA'}
      {estat === 'rebutjada' && 'Rebutjada'}
    </span>
  )
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase
    .from('docents')
    .select('id, nom')
    .eq('email', user!.email!)
    .single()

  if (!docent) return null

  // Substitucions properes (com a substitut)
  const avui = new Date().toISOString().split('T')[0]
  const { data: substitucionsProximes } = await supabase
    .from('substitucions')
    .select(`
      id, data, estat, feina_substitut,
      horari_setmanal:horari_setmanal_id (
        tipus, materia, aula,
        franja:franja_id ( hora_inici, hora_fi ),
        grup:grup_id ( nom )
      ),
      absencia:absencia_id (
        docent:docent_id ( nom )
      )
    `)
    .eq('substitut_id', docent.id)
    .gte('data', avui)
    .order('data', { ascending: true })
    .limit(3)

  // Absències pendents d'aprovar (si és cap de personal / director)
  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docent.id)

  const esGestor = rols?.some(r =>
    ['cap_personal', 'director', 'sotsdirector', 'coordinacio_etapa'].includes(r.rol)
  )

  const { data: absenciesPendents } = esGestor
    ? await supabase
        .from('absencies')
        .select('id, data, motiu, docent:docent_id(nom)')
        .eq('estat', 'pendent')
        .order('data', { ascending: true })
        .limit(5)
    : { data: null }

  // Substitucions pendents de confirmar (si és gestor)
  const { data: subsPendents } = esGestor
    ? await supabase
        .from('substitucions')
        .select(`
          id, data, estat,
          horari_setmanal:horari_setmanal_id (
            materia,
            franja:franja_id ( hora_inici, hora_fi ),
            grup:grup_id ( nom )
          ),
          absencia:absencia_id (
            docent:docent_id ( nom )
          )
        `)
        .in('estat', ['pendent', 'proposta_ia'])
        .gte('data', avui)
        .order('data', { ascending: true })
        .limit(5)
    : { data: null }

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
          href="/absencies/nova"
          className="card flex flex-col items-center justify-center gap-2 py-5 text-center hover:shadow-md transition-shadow"
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

        <Link
          href="/substitucions"
          className="card flex flex-col items-center justify-center gap-2 py-5 text-center hover:shadow-md transition-shadow"
          style={{ textDecoration: 'none' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-accent-light)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Les meves subst.
          </span>
        </Link>
      </div>

      {/* Substitucions properes com a substitut */}
      {substitucionsProximes && substitucionsProximes.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Les meves properes substitucions
          </h2>
          <div className="space-y-2">
            {substitucionsProximes.map((s: any) => (
              <div key={s.id} className="card flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {new Date(s.data).toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {s.horari_setmanal?.franja?.hora_inici?.slice(0, 5)}–{s.horari_setmanal?.franja?.hora_fi?.slice(0, 5)}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {s.absencia?.docent?.nom} · {s.horari_setmanal?.grup?.nom ?? s.horari_setmanal?.materia ?? '—'}
                  </p>
                  {s.feina_substitut && (
                    <p className="text-xs mt-1 italic" style={{ color: 'var(--color-text-secondary)' }}>
                      &ldquo;{s.feina_substitut}&rdquo;
                    </p>
                  )}
                </div>
                <BadgeEstat estat={s.estat} />
              </div>
            ))}
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
                    {new Date(a.data).toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'short' })} · {a.motiu === 'dia_personal' ? 'Dia personal' : a.motiu === 'medic' ? 'Mèdic' : 'Formació'}
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

      {/* Substitucions pendents de confirmar (gestors) */}
      {esGestor && subsPendents && subsPendents.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Substitucions per confirmar
          </h2>
          <div className="space-y-2">
            {subsPendents.map((s: any) => (
              <Link key={s.id} href={`/substitucions/${s.id}`} className="card flex items-start justify-between gap-3 hover:shadow-md transition-shadow" style={{ textDecoration: 'none' }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {s.absencia?.docent?.nom}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(s.data).toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · {s.horari_setmanal?.franja?.hora_inici?.slice(0, 5)}–{s.horari_setmanal?.franja?.hora_fi?.slice(0, 5)} · {s.horari_setmanal?.grup?.nom ?? s.horari_setmanal?.materia}
                  </p>
                </div>
                <BadgeEstat estat={s.estat} />
              </Link>
            ))}
          </div>
          <Link
            href="/substitucions"
            className="text-sm font-medium mt-3 block"
            style={{ color: 'var(--color-accent)' }}
          >
            Veure totes →
          </Link>
        </section>
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
