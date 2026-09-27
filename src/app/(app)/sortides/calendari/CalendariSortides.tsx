'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'

const DIES_SETMANA = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']
const NOMS_MESOS = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre',
]

interface Props {
  any: number
  mes: number
  sortides: any[]
  mesAnteriorParam: string
  mesSeguentParam: string
  mesActualParam: string
}

export default function CalendariSortides({ any, mes, sortides, mesAnteriorParam, mesSeguentParam }: Props) {
  const router = useRouter()
  const [diaSeleccionat, setDiaSeleccionat] = useState<string | null>(null)

  const avui = new Date().toISOString().split('T')[0]

  const sortidesPerDia = new Map<string, any[]>()
  for (const s of sortides) {
    if (!sortidesPerDia.has(s.data)) sortidesPerDia.set(s.data, [])
    sortidesPerDia.get(s.data)!.push(s)
  }

  const primerDia = new Date(any, mes - 1, 1)
  const offsetDilluns = (primerDia.getDay() + 6) % 7
  const totalDies = new Date(any, mes, 0).getDate()

  const celles: (number | null)[] = [
    ...Array(offsetDilluns).fill(null),
    ...Array.from({ length: totalDies }, (_, i) => i + 1),
  ]
  while (celles.length % 7 !== 0) celles.push(null)

  const anarA = (mesParam: string) => router.push(`/sortides/calendari?mes=${mesParam}`)

  const dataStr = (dia: number) => `${any}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

  const sortidesDelDiaSeleccionat = diaSeleccionat ? sortidesPerDia.get(diaSeleccionat) ?? [] : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/sortides" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            ← Sortides
          </Link>
          <h1 className="text-xl font-semibold mt-1 capitalize" style={{ color: 'var(--color-primary)' }}>
            {NOMS_MESOS[mes - 1].toLowerCase()} {any}
          </h1>
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

      {/* Capçalera dies de la setmana */}
      <div className="grid grid-cols-7 gap-1.5 text-xs font-semibold uppercase tracking-wide text-center" style={{ color: 'var(--color-text-secondary)' }}>
        {DIES_SETMANA.map(d => <div key={d}>{d}</div>)}
      </div>

      {/* Graella del mes */}
      <div className="grid grid-cols-7 gap-1.5">
        {celles.map((dia, i) => {
          if (dia === null) return <div key={i} />
          const data = dataStr(dia)
          const sortidesDia = sortidesPerDia.get(data) ?? []
          const esAvui = data === avui
          const capDia = 2

          return (
            <button
              key={i}
              onClick={() => sortidesDia.length > 0 && setDiaSeleccionat(data)}
              className="rounded-lg p-1.5 text-left flex flex-col"
              style={{
                minHeight: '64px',
                backgroundColor: esAvui ? 'var(--color-primary-light)' : 'white',
                border: `1px solid ${esAvui ? 'var(--color-primary)' : 'var(--color-border)'}`,
                cursor: sortidesDia.length > 0 ? 'pointer' : 'default',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: esAvui ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
              >
                {dia}
              </span>
              <div className="mt-1 space-y-0.5">
                {sortidesDia.slice(0, capDia).map(s => (
                  <span
                    key={s.id}
                    className="block text-[11px] leading-tight px-1 py-0.5 rounded truncate"
                    style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}
                  >
                    {s.descripcio}
                  </span>
                ))}
                {sortidesDia.length > capDia && (
                  <span className="block text-[11px] leading-tight px-1" style={{ color: 'var(--color-text-secondary)' }}>
                    +{sortidesDia.length - capDia} més
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {sortides.length === 0 && (
        <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">Cap sortida aprovada aquest mes.</p>
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
          <div className="space-y-4">
            {sortidesDelDiaSeleccionat.map(s => (
              <div key={s.id} className="pb-4 border-b last:border-b-0 last:pb-0" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{s.descripcio}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {s.hora_inici?.slice(0, 5)} – {s.hora_fi?.slice(0, 5)}
                  {s.proposador?.nom && ` · Proposada per ${s.proposador.nom}`}
                </p>
                {s.sortida_grups?.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Grups: {s.sortida_grups.map((sg: any) => sg.grup?.nom).filter(Boolean).join(', ')}
                  </p>
                )}
                {s.sortida_acompanyants?.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Acompanyants: {s.sortida_acompanyants.map((sa: any) => sa.docent?.nom).filter(Boolean).join(', ')}
                  </p>
                )}
                {s.observacions && (
                  <p className="text-xs mt-2 italic" style={{ color: 'var(--color-text-secondary)' }}>
                    {s.observacions}
                  </p>
                )}
                <Link
                  href={`/sortides/${s.id}`}
                  className="text-xs font-medium mt-2 inline-block"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Veure fitxa completa →
                </Link>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
