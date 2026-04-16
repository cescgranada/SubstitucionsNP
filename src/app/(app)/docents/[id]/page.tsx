import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const DIES = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

const COLORS_TIPUS: Record<string, { bg: string; text: string; border: string }> = {
  classe:      { bg: '#EDF5FA', text: '#1B3A4B', border: '#7FB5D5' },
  guardia:     { bg: '#FFF3E0', text: '#7B4F00', border: '#F5A623' },
  permanencia: { bg: '#DCFCE7', text: '#166534', border: '#27AE60' },
  reunio:      { bg: '#F3E8FF', text: '#5B21B6', border: '#A78BFA' },
  esbarjo:     { bg: '#FEF9C3', text: '#713F12', border: '#EAB308' },
  hnl:         { bg: '#F1F5F9', text: '#475569', border: '#94A3B8' },
  disponible:  { bg: '#F8FAFB', text: '#5A7D8A', border: '#D8E3E8' },
}

const NOMS_TIPUS: Record<string, string> = {
  classe: 'Classe',
  guardia: 'Guàrdia',
  permanencia: 'Permanència',
  reunio: 'Reunió',
  esbarjo: 'Esbarjo',
  hnl: 'HNL',
  disponible: 'Lliure',
}

const MOTIUS: Record<string, string> = {
  medic: 'Mèdic',
  dia_personal: 'Dia personal',
  formacio: 'Formació',
}

const NOMS_ROL: Record<string, string> = {
  director: 'Director/a',
  sotsdirector: 'Sotsdirector/a',
  cap_personal: 'Cap de personal',
  coordinacio_etapa: 'Coordinació d\'etapa',
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

  // Horari setmanal
  const { data: horari } = await supabase
    .from('horari_setmanal')
    .select(`
      id, dia_setmana, tipus, materia, aula, tipus_parella,
      franja:franja_id(hora_inici, hora_fi),
      grup:grup_id(nom),
      parella_docent:parella_docent_id(nom)
    `)
    .eq('docent_id', id)
    .order('dia_setmana')

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

  // Agrupa horari per dia
  const perDia: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
  for (const h of horari ?? []) {
    if (h.dia_setmana >= 1 && h.dia_setmana <= 5) {
      perDia[h.dia_setmana].push(h)
    }
  }
  for (const dia of Object.keys(perDia)) {
    perDia[Number(dia)].sort((a: any, b: any) =>
      (a.franja?.hora_inici ?? '').localeCompare(b.franja?.hora_inici ?? '')
    )
  }

  const rols = (docent.docent_rols as any[]) ?? []
  const etapes = (docent.docent_etapes as any[]) ?? []
  const rolPrincipal = rols.filter(r => r.rol !== 'docent')[0]
  const inicials = docent.nom.split(' ').map((n: string) => n[0]).slice(0, 2).join('')

  // Classifica absències
  const absenciesFutures = (absencies ?? []).filter(a => a.data > avui && !['rebutjada', 'cancel·lada'].includes(a.estat))
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
  }
  const ESTAT_BADGE: Record<string, string> = {
    pendent: 'badge-pendent',
    aprovada: 'badge-aprovada',
    rebutjada: 'badge-rebutjada',
    'cancel·lada': 'badge-cancel-lada',
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/docents" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          ← Docents
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

      {/* Horari setmanal */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Horari setmanal
        </h2>

        {!horari || horari.length === 0 ? (
          <div className="card text-center py-6" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-sm">No s&apos;ha trobat l&apos;horari.</p>
          </div>
        ) : (
          <>
            {/* Vista mòbil */}
            <div className="lg:hidden space-y-3">
              {DIES.map((nomDia, i) => {
                const diaNum = i + 1
                const franges = perDia[diaNum]
                if (franges.length === 0) return null
                return (
                  <section key={diaNum}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {nomDia}
                    </p>
                    <div className="space-y-1.5">
                      {franges.map((h: any) => {
                        const colors = COLORS_TIPUS[h.tipus] ?? COLORS_TIPUS.disponible
                        return (
                          <div
                            key={h.id}
                            className="flex items-start gap-3 rounded-lg px-3 py-2 border-l-4"
                            style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                          >
                            <div className="text-xs font-mono w-20 flex-shrink-0 pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                              {h.franja?.hora_inici?.slice(0, 5)}–{h.franja?.hora_fi?.slice(0, 5)}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: colors.text }}>
                                {NOMS_TIPUS[h.tipus]}{h.grup?.nom ? ` · ${h.grup.nom}` : ''}{h.materia ? ` · ${h.materia}` : ''}
                              </p>
                              {h.parella_docent?.nom && (
                                <p className="text-xs mt-0.5" style={{ color: colors.text, opacity: 0.7 }}>
                                  {h.tipus_parella === 'codocencia' ? 'Codocència' : 'Desdoblament'} amb {h.parella_docent.nom}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>

            {/* Vista desktop: graella */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="grid grid-cols-5 gap-2 min-w-[600px]">
                {DIES.map((nomDia, i) => {
                  const diaNum = i + 1
                  const franges = perDia[diaNum]
                  return (
                    <div key={diaNum}>
                      <div
                        className="text-xs font-semibold uppercase tracking-wide text-center py-1.5 mb-2 rounded-lg"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                      >
                        {nomDia}
                      </div>
                      <div className="space-y-1.5">
                        {franges.length === 0 ? (
                          <div className="text-xs text-center py-3" style={{ color: 'var(--color-text-secondary)' }}>—</div>
                        ) : (
                          franges.map((h: any) => {
                            const colors = COLORS_TIPUS[h.tipus] ?? COLORS_TIPUS.disponible
                            return (
                              <div
                                key={h.id}
                                className="rounded-lg p-2 border-l-4 text-xs"
                                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                              >
                                <div className="font-mono text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                  {h.franja?.hora_inici?.slice(0, 5)}–{h.franja?.hora_fi?.slice(0, 5)}
                                </div>
                                <div className="font-medium" style={{ color: colors.text }}>{NOMS_TIPUS[h.tipus]}</div>
                                {h.grup?.nom && <div style={{ color: colors.text, opacity: 0.8 }}>{h.grup.nom}</div>}
                                {h.materia && <div style={{ color: colors.text, opacity: 0.7 }}>{h.materia}</div>}
                                {h.parella_docent?.nom && (
                                  <div style={{ color: colors.text, opacity: 0.6 }}>
                                    amb {h.parella_docent.nom.split(' ')[0]}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </section>

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
