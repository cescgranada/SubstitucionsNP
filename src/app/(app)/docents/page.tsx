import { createClient } from '@/lib/supabase/server'

const ROLS_LABEL: Record<string, string> = {
  director: 'Director/a',
  sotsdirector: 'Sotsdirector/a',
  cap_personal: 'Cap de personal',
  coordinacio_etapa: 'Coordinació',
  docent: 'Docent',
}

export default async function DocentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docentActual } = await supabase
    .from('docents')
    .select('id')
    .eq('email', user!.email!)
    .single()

  if (!docentActual) return null

  // Tots els docents actius
  const { data: docents } = await supabase
    .from('docents')
    .select(`
      id, nom, email,
      docent_etapes(
        etapa:etapa_id(id, codi, nom)
      ),
      docent_rols(rol, etapa_id)
    `)
    .eq('actiu', true)
    .order('nom')

  if (!docents) return null

  const avui = new Date().toISOString().split('T')[0]
  const en7dies = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  // Absències actives o properes (properes 7 dies).
  // Rango ampli al servidor; filtrem al client.
  const fa14dies = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]
  const { data: absencies } = await supabase
    .from('absencies')
    .select('docent_id, data, data_fi, motiu, estat')
    .in('estat', ['aprovada', 'pendent'])
    .gte('data', fa14dies)
    .lte('data', en7dies)

  // Absències avui per docent (data <= avui <= data_fi o data = avui si no hi ha data_fi)
  const absentAvui = new Set<string>()
  const proximaAbsencia = new Map<string, string>() // docentId -> data

  for (const a of absencies ?? []) {
    const dataFi = a.data_fi ?? a.data
    // Absent avui: el rang data–data_fi cobreix avui
    if (a.data <= avui && dataFi >= avui) {
      absentAvui.add(a.docent_id)
    } else if (a.data > avui) {
      // Propera absència en els propers 7 dies
      const existent = proximaAbsencia.get(a.docent_id)
      if (!existent || a.data < existent) {
        proximaAbsencia.set(a.docent_id, a.data)
      }
    }
  }

  // Agrupa per etapa
  const docentsPerEtapa = new Map<string, { etapaNom: string; etapaCodi: string; docents: any[] }>()
  const sensEtapa: any[] = []

  for (const d of docents) {
    const etapes = (d.docent_etapes as any[]) ?? []
    if (etapes.length === 0) {
      sensEtapa.push(d)
      continue
    }
    for (const de of etapes) {
      const etapa = Array.isArray(de.etapa) ? de.etapa[0] : de.etapa
      if (!etapa) continue
      if (!docentsPerEtapa.has(etapa.id)) {
        docentsPerEtapa.set(etapa.id, { etapaNom: etapa.nom, etapaCodi: etapa.codi, docents: [] })
      }
      docentsPerEtapa.get(etapa.id)!.docents.push(d)
    }
  }

  const etapesOrdenades = Array.from(docentsPerEtapa.entries()).sort((a, b) =>
    a[1].etapaCodi.localeCompare(b[1].etapaCodi)
  )

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
        Docents
      </h1>

      {/* Resum estat del dia */}
      {absentAvui.size > 0 && (
        <div
          className="card flex items-start gap-3"
          style={{ backgroundColor: '#FFF3E0', boxShadow: 'none' }}
        >
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#B7791F' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-medium" style={{ color: '#B7791F' }}>
              {absentAvui.size === 1 ? '1 docent absent avui' : `${absentAvui.size} docents absents avui`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#92600A' }}>
              {docents.filter(d => absentAvui.has(d.id)).map(d => d.nom.split(' ')[0]).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Llista per etapes */}
      {etapesOrdenades.map(([etapaId, { etapaNom, docents: docsEtapa }]) => (
        <section key={etapaId}>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            {etapaNom}
          </h2>
          <div className="space-y-2">
            {docsEtapa.map((d: any) => {
              const estaAbsent = absentAvui.has(d.id)
              const proxima = proximaAbsencia.get(d.id)
              const rols = (d.docent_rols as any[]) ?? []
              const rolPrincipal = rols
                .filter(r => r.rol !== 'docent')
                .sort(r => ['director', 'sotsdirector', 'cap_personal', 'coordinacio_etapa'].indexOf(r.rol))
                [0]?.rol

              return (
                <div
                  key={d.id}
                  className="card flex items-center justify-between gap-3"
                  style={{ opacity: estaAbsent ? 0.75 : 1 }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                      style={{
                        backgroundColor: estaAbsent ? '#FEE2E2' : 'var(--color-primary-light)',
                        color: estaAbsent ? '#991B1B' : 'var(--color-primary)',
                      }}
                    >
                      {d.nom.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {d.nom}
                      </p>
                      {rolPrincipal && (
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {ROLS_LABEL[rolPrincipal]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {estaAbsent ? (
                      <span className="badge badge-rebutjada text-xs">Absent avui</span>
                    ) : proxima ? (
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        Absent {new Date(proxima + 'T12:00:00').toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {sensEtapa.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Altres
          </h2>
          <div className="space-y-2">
            {sensEtapa.map((d: any) => (
              <div key={d.id} className="card flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                >
                  {d.nom.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{d.nom}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
