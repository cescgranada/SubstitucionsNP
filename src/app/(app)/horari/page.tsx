import { createClient } from '@/lib/supabase/server'
import { esEquipDirectiu } from '@/lib/roles'
import Link from 'next/link'
import SelectorDocent from './SelectorDocent'
import EditorHorari, { type ValorsEditor } from './EditorHorari'
import { franjesDocent } from '@/lib/horari'

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

interface EntradaHorari {
  id: string
  dia_setmana: number
  tipus: string
  materia: string | null
  aula: string | null
  tipus_parella: string | null
  franja: { hora_inici: string; hora_fi: string } | null
  grup: { nom: string } | null
  grup_id: string | null
  parella_docent_id: string | null
  parella_docent: { nom: string } | null
}

/** En mode edició cada casella és un enllaç; si no, es mostra tal qual. */
function Cela({ href, children }: { href: string | null; children: React.ReactNode }) {
  return href ? <Link href={href} className="block">{children}</Link> : <>{children}</>
}

export default async function HorariPage({
  searchParams,
}: {
  searchParams: Promise<{ docent?: string; edita?: string; dia?: string; inici?: string }>
}) {
  const { docent: docentParam, edita: editaParam, dia: diaParam, inici: iniciParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase
    .from('docents')
    .select('id, nom')
    .eq('email', user!.email!)
    .single()

  if (!docent) return null

  // L'equip directiu pot consultar l'horari de qualsevol docent; per defecte veu el seu.
  const { data: rols } = await supabase.from('docent_rols').select('rol').eq('docent_id', docent.id)
  const esGestor = esEquipDirectiu(rols)

  // Les dades de l'horari són visibles per a tothom (fitxa de Personal): qualsevol
  // docent pot arribar-hi per enllaç, però el desplegable és de l'equip directiu.
  const [{ data: tots }, { data: rolsPas }] = await Promise.all([
    supabase.from('docents').select('id, nom').eq('actiu', true).order('nom'),
    supabase.from('docent_rols').select('docent_id').eq('rol', 'pas'),
  ])
  const idsPas = new Set((rolsPas ?? []).map((r: any) => r.docent_id))
  const docentsLlista: { id: string; nom: string }[] = (tots ?? []).filter((d: any) => !idsPas.has(d.id))
  const triat = docentsLlista.find(d => d.id === docentParam)
  const docentVist: { id: string; nom: string } = triat ?? docent
  const veigAltre = docentVist.id !== docent.id

  const { data: horariRaw } = await supabase
    .from('horari_setmanal')
    .select(`
      id, dia_setmana, tipus, materia, aula, tipus_parella, grup_id, parella_docent_id,
      franja:franja_id(hora_inici, hora_fi, ordre),
      grup:grup_id(nom),
      parella_docent:parella_docent_id(nom)
    `)
    .eq('docent_id', docentVist.id)
    .order('dia_setmana')

  const horari = (horariRaw ?? []).map((h: any) => ({
    ...h,
    franja: Array.isArray(h.franja) ? h.franja[0] ?? null : h.franja,
    grup: Array.isArray(h.grup) ? h.grup[0] ?? null : h.grup,
    parella_docent: Array.isArray(h.parella_docent) ? h.parella_docent[0] ?? null : h.parella_docent,
  })) as EntradaHorari[]

  // Edició d'horaris: només l'equip directiu
  const edita = esGestor && editaParam === '1'

  if (horari.length === 0 && !edita) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
          {veigAltre ? `Horari de ${docentVist.nom}` : 'El meu horari'}
        </h1>
        {esGestor && <SelectorDocent docents={docentsLlista} seleccionat={docentVist.id} propiId={docent.id} />}
        <div className="card text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">No s&apos;ha trobat l&apos;horari. Contacta amb l&apos;administrador.</p>
        </div>
      </div>
    )
  }

  // Files de la graella: totes les franges horàries diferents que apareixen
  // a l'horari d'aquest docent (per si dona classe a etapes amb graelles
  // horàries diferents), ordenades per hora d'inici.
  const franjaPerClau = new Map<string, { hora_inici: string; hora_fi: string }>()
  for (const h of horari) {
    if (!h.franja) continue
    const clau = `${h.franja.hora_inici}-${h.franja.hora_fi}`
    if (!franjaPerClau.has(clau)) franjaPerClau.set(clau, h.franja)
  }
  // En mode edició es mostren totes les franges del docent, també les buides,
  // per poder-hi afegir activitat.
  const frangesEdicio = edita ? await franjesDocent(supabase, docentVist.id) : []
  if (edita) {
    franjaPerClau.clear()
    for (const f of frangesEdicio) franjaPerClau.set(`${f.hora_inici}-${f.hora_fi}`, f)
  }
  const files = Array.from(franjaPerClau.entries())
    .sort(([, a], [, b]) => a.hora_inici.localeCompare(b.hora_inici))

  // Índex [claudeFranja][diaSetmana] -> entrada (normalment només n'hi ha una)
  const graella = new Map<string, Map<number, EntradaHorari>>()
  for (const h of horari) {
    if (!h.franja || h.dia_setmana < 1 || h.dia_setmana > 5) continue
    const clau = `${h.franja.hora_inici}-${h.franja.hora_fi}`
    if (!graella.has(clau)) graella.set(clau, new Map())
    graella.get(clau)!.set(h.dia_setmana, h)
  }

  // Edició: enllaç de cada casella i valors inicials de l'editor (el tram
  // sencer de franges seguides amb la mateixa activitat)
  const hrefCela = (dia: number, franja: { hora_inici: string }) =>
    `/horari?docent=${docentVist.id}&edita=1&dia=${dia}&inici=${franja.hora_inici.slice(0, 5)}`
  const assinatura = (h: EntradaHorari | undefined) =>
    h ? [h.tipus, h.grup_id, h.materia, h.aula, h.parella_docent_id, h.tipus_parella].join('|') : ''

  let inicial: ValorsEditor | null = null
  let grups: { id: string; nom: string }[] = []
  if (edita && diaParam && iniciParam) {
    const dia = Number(diaParam)
    const ordenades = files.map(([clau, f]) => ({ clau, f }))
    const idx = ordenades.findIndex(o => o.f.hora_inici.slice(0, 5) === iniciParam)
    if (idx >= 0 && dia >= 1 && dia <= 5) {
      const entrada = (i: number) => graella.get(ordenades[i].clau)?.get(dia)
      const base = entrada(idx)
      let a = idx
      let b = idx
      if (base) {
        while (a > 0 && assinatura(entrada(a - 1)) === assinatura(base)) a--
        while (b < ordenades.length - 1 && assinatura(entrada(b + 1)) === assinatura(base)) b++
      }
      inicial = {
        dia,
        horaInici: ordenades[a].f.hora_inici.slice(0, 5),
        horaFi: ordenades[b].f.hora_fi.slice(0, 5),
        tipus: base?.tipus ?? 'classe',
        grupId: base?.grup_id ?? '',
        materia: base?.materia ?? '',
        aula: base?.aula ?? '',
        parellaId: base?.parella_docent_id ?? '',
        tipusParella: base?.tipus_parella ?? '',
        existeix: !!base,
      }
      const { data: gr } = await supabase.from('grups').select('id, nom').order('nom')
      grups = (gr ?? []) as { id: string; nom: string }[]
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
          {veigAltre ? `Horari de ${docentVist.nom}` : 'El meu horari'}
        </h1>
        {esGestor && (
          <Link
            href={edita ? `/horari?docent=${docentVist.id}` : `/horari?docent=${docentVist.id}&edita=1`}
            className="text-sm font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            {edita ? "Acabar d'editar" : 'Editar horari'}
          </Link>
        )}
      </div>

      {esGestor && <SelectorDocent docents={docentsLlista} seleccionat={docentVist.id} propiId={docent.id} />}

      {edita && !inicial && (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Toca una casella per afegir o canviar-hi l&apos;activitat.
        </p>
      )}
      {edita && inicial && (
        <EditorHorari
          key={`${inicial.dia}-${inicial.horaInici}`}
          docentId={docentVist.id}
          docentNom={docentVist.nom}
          franges={files.map(([, f]) => f)}
          grups={grups}
          docents={docentsLlista.filter(d => d.id !== docentVist.id)}
          inicial={inicial}
        />
      )}

      {/* Vista mòbil: un dia per secció, amb totes les franges (buides en blanc) */}
      <div className="lg:hidden space-y-4">
        {DIES.map((nomDia, i) => {
          const diaNum = i + 1
          return (
            <section key={diaNum}>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {nomDia}
              </h2>
              <div className="space-y-1.5">
                {files.map(([clau, franja]) => {
                  const h = graella.get(clau)?.get(diaNum)
                  if (!h) {
                    return (
                      <Cela key={clau} href={edita ? hrefCela(diaNum, franja) : null}>
                        <div
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 border-l-4"
                          style={{ backgroundColor: 'white', borderColor: 'var(--color-border)' }}
                        >
                          <div className="text-xs font-mono w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                            {franja.hora_inici.slice(0, 5)}–{franja.hora_fi.slice(0, 5)}
                          </div>
                          {edita && <span className="text-xs" style={{ color: 'var(--color-accent)' }}>+ Afegir</span>}
                        </div>
                      </Cela>
                    )
                  }
                  const colors = COLORS_TIPUS[h.tipus] ?? COLORS_TIPUS.disponible
                  return (
                    <Cela key={clau} href={edita ? hrefCela(diaNum, franja) : null}>
                    <div
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 border-l-4"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                      <div className="text-xs font-mono w-20 flex-shrink-0 pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {franja.hora_inici.slice(0, 5)}–{franja.hora_fi.slice(0, 5)}
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
                    </Cela>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* Vista desktop: graella real Dilluns–Divendres × hores */}
      <div className="hidden lg:block overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px', minWidth: '800px' }}>
          <thead>
            <tr>
              <th style={{ width: '90px' }}></th>
              {DIES.map(nomDia => (
                <th
                  key={nomDia}
                  className="text-sm py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    fontFamily: 'var(--font-display)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {nomDia}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {files.map(([clau, franja]) => (
              <tr key={clau}>
                <td className="text-xs font-mono text-right pr-2 align-middle" style={{ color: 'var(--color-text-secondary)' }}>
                  {franja.hora_inici.slice(0, 5)}<br />{franja.hora_fi.slice(0, 5)}
                </td>
                {DIES.map((_, i) => {
                  const diaNum = i + 1
                  const h = graella.get(clau)?.get(diaNum)
                  if (!h) {
                    // Franja buida: casella en blanc.
                    return (
                      <td
                        key={diaNum}
                        className="rounded-lg"
                        style={{ backgroundColor: 'white', border: '1px solid var(--color-border)', height: '64px' }}
                      >
                        {edita && (
                          <Link href={hrefCela(diaNum, franja)} className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--color-accent)' }}>
                            +
                          </Link>
                        )}
                      </td>
                    )
                  }
                  const colors = COLORS_TIPUS[h.tipus] ?? COLORS_TIPUS.disponible
                  return (
                    <td
                      key={diaNum}
                      className="rounded-lg p-2 border-l-4 text-xs align-top"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                      <Cela href={edita ? hrefCela(diaNum, franja) : null}>
                        <div className="font-medium" style={{ color: colors.text }}>
                          {NOMS_TIPUS[h.tipus]}
                        </div>
                        {h.grup?.nom && <div style={{ color: colors.text, opacity: 0.8 }}>{h.grup.nom}</div>}
                        {h.materia && <div style={{ color: colors.text, opacity: 0.7 }}>{h.materia}</div>}
                        {h.parella_docent?.nom && (
                          <div style={{ color: colors.text, opacity: 0.6 }}>
                            amb {h.parella_docent.nom.split(' ')[0]}
                          </div>
                        )}
                      </Cela>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
