import { createClient } from '@/lib/supabase/server'

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

export default async function HorariPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase
    .from('docents')
    .select('id, nom')
    .eq('email', user!.email!)
    .single()

  if (!docent) return null

  const { data: horari } = await supabase
    .from('horari_setmanal')
    .select(`
      id, dia_setmana, tipus, materia, aula, tipus_parella,
      franja:franja_id(hora_inici, hora_fi, ordre),
      grup:grup_id(nom),
      parella_docent:parella_docent_id(nom)
    `)
    .eq('docent_id', docent.id)
    .order('dia_setmana')

  // Agrupa per dia
  const perDia: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
  for (const h of (horari ?? [])) {
    if (h.dia_setmana >= 1 && h.dia_setmana <= 5) {
      perDia[h.dia_setmana].push(h)
    }
  }

  // Ordena cada dia per hora d'inici
  for (const dia of Object.keys(perDia)) {
    perDia[Number(dia)].sort((a: any, b: any) =>
      (a.franja?.hora_inici ?? '').localeCompare(b.franja?.hora_inici ?? '')
    )
  }

  if (!horari || horari.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>El meu horari</h1>
        <div className="card text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">No s&apos;ha trobat l&apos;horari. Contacta amb l&apos;administrador.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
        El meu horari
      </h1>

      {/* Vista mòbil: un dia per secció */}
      <div className="lg:hidden space-y-4">
        {DIES.map((nomDia, i) => {
          const diaNum = i + 1
          const franges = perDia[diaNum]
          if (franges.length === 0) return null
          return (
            <section key={diaNum}>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {nomDia}
              </h2>
              <div className="space-y-1.5">
                {franges.map((h: any) => {
                  const colors = COLORS_TIPUS[h.tipus] ?? COLORS_TIPUS.disponible
                  return (
                    <div
                      key={h.id}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 border-l-4"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                      <div className="text-xs font-mono w-20 flex-shrink-0 pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {h.franja?.hora_inici?.slice(0, 5)}–{h.franja?.hora_fi?.slice(0, 5)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: colors.text }}>
                          {NOMS_TIPUS[h.tipus]}{h.grup?.nom ? ` · ${h.grup.nom}` : ''}{h.materia ? ` · ${h.materia}` : ''}
                        </p>
                        {h.parella_docent?.nom && (
                          <p className="text-xs mt-0.5" style={{ color: colors.text, opacity: 0.7 }}>
                            {h.tipus_parella === 'codocencia' ? 'Codocència' : 'Desdoblament'} amb {h.parella_docent.nom}
                          </p>
                        )}
                        {h.aula && (
                          <p className="text-xs mt-0.5" style={{ color: colors.text, opacity: 0.7 }}>
                            {h.aula}
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

      {/* Vista desktop: taula setmanal */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="grid grid-cols-5 gap-3 min-w-[700px]">
          {DIES.map((nomDia, i) => {
            const diaNum = i + 1
            const franges = perDia[diaNum]
            return (
              <div key={diaNum}>
                <div
                  className="text-xs font-semibold uppercase tracking-wide text-center py-2 mb-2 rounded-lg"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                >
                  {nomDia}
                </div>
                <div className="space-y-1.5">
                  {franges.length === 0 ? (
                    <div className="text-xs text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                      Sense franges
                    </div>
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
                          <div className="font-medium" style={{ color: colors.text }}>
                            {NOMS_TIPUS[h.tipus]}
                          </div>
                          {h.grup?.nom && (
                            <div style={{ color: colors.text, opacity: 0.8 }}>{h.grup.nom}</div>
                          )}
                          {h.materia && (
                            <div style={{ color: colors.text, opacity: 0.7 }}>{h.materia}</div>
                          )}
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

      {/* Llegenda */}
      <div className="flex flex-wrap gap-2 pt-2">
        {Object.entries(COLORS_TIPUS)
          .filter(([k]) => k !== 'disponible')
          .map(([tipus, colors]) => (
          <span
            key={tipus}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border-l-2"
            style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
          >
            {NOMS_TIPUS[tipus]}
          </span>
        ))}
      </div>
    </div>
  )
}
