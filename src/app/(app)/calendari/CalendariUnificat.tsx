'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'

const DIES_SETMANA = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']
const NOMS_MESOS = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre',
]
const MOTIUS: Record<string, string> = {
  medic: 'Mèdic',
  dia_personal: 'Dia personal',
  formacio: 'Formació',
}

interface Props {
  any: number
  mes: number
  etapes: { id: string; codi: string; nom: string }[]
  docentEtapes: { docent_id: string; etapa: any }[]
  grups: { id: string; etapa_id: string }[]
  absencies: any[]
  sortides: any[]
  substitucions: any[]
  mesAnteriorParam: string
  mesSeguentParam: string
}

function diesEntre(dataIni: string, dataFi: string): string[] {
  const dies: string[] = []
  const curr = new Date(dataIni + 'T12:00:00')
  const fi = new Date(dataFi + 'T12:00:00')
  while (curr <= fi) {
    dies.push(curr.toISOString().split('T')[0])
    curr.setDate(curr.getDate() + 1)
  }
  return dies
}

export default function CalendariUnificat({
  any, mes, etapes, docentEtapes, grups, absencies, sortides, substitucions,
  mesAnteriorParam, mesSeguentParam,
}: Props) {
  const router = useRouter()
  const [etapaFiltre, setEtapaFiltre] = useState<string>('totes')
  const [diaSeleccionat, setDiaSeleccionat] = useState<string | null>(null)

  const avui = new Date().toISOString().split('T')[0]
  const dataInici = `${any}-${String(mes).padStart(2, '0')}-01`
  const darreraDia = new Date(any, mes, 0).getDate()
  const dataFiMes = `${any}-${String(mes).padStart(2, '0')}-${String(darreraDia).padStart(2, '0')}`

  // Mapes docent -> codis d'etapa, i grup -> codi d'etapa
  const etapaCodiPerId = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of etapes) m.set(e.id, e.codi)
    return m
  }, [etapes])

  const etapesPerDocent = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const de of docentEtapes) {
      const codi = Array.isArray(de.etapa) ? de.etapa[0]?.codi : de.etapa?.codi
      if (!codi) continue
      if (!m.has(de.docent_id)) m.set(de.docent_id, [])
      m.get(de.docent_id)!.push(codi)
    }
    return m
  }, [docentEtapes])

  const etapaPerGrup = useMemo(() => {
    const m = new Map<string, string>()
    for (const g of grups) {
      const codi = etapaCodiPerId.get(g.etapa_id)
      if (codi) m.set(g.id, codi)
    }
    return m
  }, [grups, etapaCodiPerId])

  const coincideixFiltre = (codisEtapa: string[]) =>
    etapaFiltre === 'totes' || codisEtapa.includes(etapaFiltre)

  // --- Absències expandides dia a dia (clipades al mes visible) ---
  const absenciesPerDia = useMemo(() => {
    const m = new Map<string, any[]>()
    for (const a of absencies) {
      const codisEtapa = etapesPerDocent.get(a.docent?.id) ?? []
      if (!coincideixFiltre(codisEtapa)) continue
      const inici = a.data < dataInici ? dataInici : a.data
      const fiReal = a.data_fi ?? a.data
      const fi = fiReal > dataFiMes ? dataFiMes : fiReal
      for (const dia of diesEntre(inici, fi)) {
        if (!m.has(dia)) m.set(dia, [])
        m.get(dia)!.push(a)
      }
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absencies, etapesPerDocent, etapaFiltre, dataInici, dataFiMes])

  // --- Sortides (ja són d'un sol dia) ---
  const sortidesPerDia = useMemo(() => {
    const m = new Map<string, any[]>()
    for (const s of sortides) {
      const codisEtapa = Array.from(new Set(
        (s.sortida_grups ?? []).map((sg: any) => etapaPerGrup.get(sg.grup_id)).filter(Boolean)
      )) as string[]
      if (!coincideixFiltre(codisEtapa)) continue
      if (!m.has(s.data)) m.set(s.data, [])
      m.get(s.data)!.push(s)
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortides, etapaPerGrup, etapaFiltre])

  // --- Substitucions (filtrades per etapa del docent afectat) ---
  const substitucionsPerDia = useMemo(() => {
    const m = new Map<string, any[]>()
    for (const s of substitucions) {
      const docentAfectatId = s.absencia?.docent_id ?? s.horari_setmanal?.docent_id
      const codisEtapa = etapesPerDocent.get(docentAfectatId) ?? []
      if (!coincideixFiltre(codisEtapa)) continue
      if (!m.has(s.data)) m.set(s.data, [])
      m.get(s.data)!.push(s)
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [substitucions, etapesPerDocent, etapaFiltre])

  const primerDia = new Date(any, mes - 1, 1)
  const offsetDilluns = (primerDia.getDay() + 6) % 7
  const totalDies = darreraDia

  const celles: (number | null)[] = [
    ...Array(offsetDilluns).fill(null),
    ...Array.from({ length: totalDies }, (_, i) => i + 1),
  ]
  while (celles.length % 7 !== 0) celles.push(null)

  const anarA = (mesParam: string) => router.push(`/calendari?mes=${mesParam}`)
  const dataStr = (dia: number) => `${any}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

  const absDelDia = diaSeleccionat ? absenciesPerDia.get(diaSeleccionat) ?? [] : []
  const sortDelDia = diaSeleccionat ? sortidesPerDia.get(diaSeleccionat) ?? [] : []
  const subsDelDia = diaSeleccionat ? substitucionsPerDia.get(diaSeleccionat) ?? [] : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
            Calendari
          </h1>
          <p className="text-sm mt-1 capitalize" style={{ color: 'var(--color-text-secondary)' }}>
            {NOMS_MESOS[mes - 1].toLowerCase()} {any}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => anarA(mesAnteriorParam)}
            aria-label="Mes anterior"
            className="w-9 h-9 flex items-center justify-center rounded-lg border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => anarA(mesSeguentParam)}
            aria-label="Mes següent"
            className="w-9 h-9 flex items-center justify-center rounded-lg border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filtre per etapa */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setEtapaFiltre('totes')}
          className="text-sm font-medium px-3 py-1.5 rounded-full transition-colors"
          style={{
            backgroundColor: etapaFiltre === 'totes' ? 'var(--color-primary)' : 'var(--color-primary-light)',
            color: etapaFiltre === 'totes' ? 'white' : 'var(--color-primary)',
          }}
        >
          Totes les etapes
        </button>
        {etapes.map(e => (
          <button
            key={e.id}
            onClick={() => setEtapaFiltre(e.codi)}
            className="text-sm font-medium px-3 py-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: etapaFiltre === e.codi ? 'var(--color-primary)' : 'var(--color-primary-light)',
              color: etapaFiltre === e.codi ? 'white' : 'var(--color-primary)',
            }}
          >
            {e.codi}
          </button>
        ))}
      </div>

      {/* Llegenda */}
      <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'var(--color-secondary)' }} />
          Absència
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'var(--color-accent)' }} />
          Sortida
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'var(--color-warning)' }} />
          Substitucions
        </span>
      </div>

      {/* Capçalera dies de la setmana */}
      <div className="grid grid-cols-7 gap-1.5 text-xs font-semibold uppercase tracking-wide text-center" style={{ color: 'var(--color-text-secondary)' }}>
        {DIES_SETMANA.map(d => <div key={d}>{d}</div>)}
      </div>

      {/* Graella del mes */}
      <div className="grid grid-cols-7 gap-1.5">
        {celles.map((dia, i) => {
          if (dia === null) return <div key={i} />
          const data = dataStr(dia)
          const absDia = absenciesPerDia.get(data) ?? []
          const sortDia = sortidesPerDia.get(data) ?? []
          const subsDia = substitucionsPerDia.get(data) ?? []
          const subsPendents = subsDia.filter((s: any) => s.estat === 'pendent' || s.estat === 'proposta_ia').length
          const esAvui = data === avui
          const teContingut = absDia.length + sortDia.length + subsDia.length > 0
          const capItems = 2

          return (
            <button
              key={i}
              onClick={() => teContingut && setDiaSeleccionat(data)}
              className="rounded-lg p-1.5 text-left flex flex-col"
              style={{
                minHeight: '76px',
                backgroundColor: esAvui ? 'var(--color-primary-light)' : 'white',
                border: `1px solid ${esAvui ? 'var(--color-primary)' : 'var(--color-border)'}`,
                cursor: teContingut ? 'pointer' : 'default',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: esAvui ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
              >
                {dia}
              </span>
              <div className="mt-1 space-y-0.5 flex-1">
                {absDia.slice(0, capItems).map((a: any, idx: number) => (
                  <span
                    key={`a${a.id}-${idx}`}
                    className="block text-[11px] leading-tight px-1 py-0.5 rounded truncate"
                    style={{ backgroundColor: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}
                  >
                    {a.docent?.nom?.split(' ')[0]}
                  </span>
                ))}
                {sortDia.slice(0, Math.max(0, capItems - absDia.length)).map((s: any) => (
                  <span
                    key={s.id}
                    className="block text-[11px] leading-tight px-1 py-0.5 rounded truncate"
                    style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}
                  >
                    {s.descripcio}
                  </span>
                ))}
                {(absDia.length + sortDia.length) > capItems && (
                  <span className="block text-[11px] leading-tight px-1" style={{ color: 'var(--color-text-secondary)' }}>
                    +{absDia.length + sortDia.length - capItems} més
                  </span>
                )}
              </div>
              {subsDia.length > 0 && (
                <span
                  className="block text-[10px] font-medium mt-1 px-1"
                  style={{ color: subsPendents > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}
                >
                  {subsDia.length} subst.{subsPendents > 0 ? ` · ${subsPendents} pend.` : ''}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {absencies.length === 0 && sortides.length === 0 && substitucions.length === 0 && (
        <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">Cap fet registrat aquest mes.</p>
        </div>
      )}

      {/* Modal amb el detall del dia seleccionat */}
      {diaSeleccionat && (
        <Modal
          title={new Date(diaSeleccionat + 'T12:00:00').toLocaleDateString('ca-ES', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
          onClose={() => setDiaSeleccionat(null)}
        >
          <div className="space-y-5">
            {absDelDia.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-secondary)' }}>
                  Absències ({absDelDia.length})
                </h3>
                <div className="space-y-2">
                  {absDelDia.map((a: any, idx: number) => (
                    <Link
                      key={`${a.id}-${idx}`}
                      href={`/absencies/${a.id}`}
                      className="block text-sm rounded-lg px-3 py-2"
                      style={{ backgroundColor: 'var(--color-secondary-light)', textDecoration: 'none', color: 'var(--color-text)' }}
                    >
                      <span className="font-medium">{a.docent?.nom}</span>
                      <span style={{ color: 'var(--color-text-secondary)' }}> · {MOTIUS[a.motiu] ?? a.motiu}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {sortDelDia.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-primary)' }}>
                  Sortides ({sortDelDia.length})
                </h3>
                <div className="space-y-2">
                  {sortDelDia.map((s: any) => (
                    <div key={s.id} className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--color-accent-light)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{s.descripcio}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {s.hora_inici?.slice(0, 5)} – {s.hora_fi?.slice(0, 5)}
                        {s.proposador?.nom && ` · ${s.proposador.nom}`}
                      </p>
                      {s.sortida_grups?.length > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {s.sortida_grups.map((sg: any) => sg.grup?.nom).filter(Boolean).join(', ')}
                        </p>
                      )}
                      <Link
                        href={`/sortides/${s.id}`}
                        className="text-xs font-medium mt-1.5 inline-block"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        Veure fitxa completa →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subsDelDia.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-warning)' }}>
                  Substitucions ({subsDelDia.length})
                </h3>
                <div className="space-y-2">
                  {subsDelDia.map((s: any) => (
                    <Link
                      key={s.id}
                      href={`/substitucions/${s.id}`}
                      className="block text-sm rounded-lg px-3 py-2"
                      style={{ backgroundColor: '#FFF3E0', textDecoration: 'none', color: 'var(--color-text)' }}
                    >
                      <span className="font-medium">
                        {s.absencia?.docent?.nom ?? 'Sortida'}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {' · '}{s.horari_setmanal?.franja?.hora_inici?.slice(0, 5)}–{s.horari_setmanal?.franja?.hora_fi?.slice(0, 5)}
                        {s.horari_setmanal?.grup?.nom && ` · ${s.horari_setmanal.grup.nom}`}
                      </span>
                      <br />
                      <span className="text-xs" style={{ color: s.substitut?.nom ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        {s.substitut?.nom
                          ? (s.estat === 'confirmada' ? `Substitut/a: ${s.substitut.nom}` : `Proposat/da: ${s.substitut.nom}`)
                          : s.estat === 'no_cal' ? 'No calia substitut' : 'Sense substitut assignat'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
