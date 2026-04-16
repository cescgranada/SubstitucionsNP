'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualitzarEstatAbsencia } from '@/lib/actions/generar-substitucions'

const MOTIUS: Record<string, string> = {
  medic: 'Mèdic',
  dia_personal: 'Dia personal',
  formacio: 'Formació',
}

function formatData(data: string, dataFi: string | null): string {
  const opcionsFull = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const
  const opcions = { day: 'numeric', month: 'long' } as const
  if (!dataFi || dataFi === data) {
    return new Date(data + 'T12:00:00').toLocaleDateString('ca-ES', opcionsFull)
  }
  const inici = new Date(data + 'T12:00:00').toLocaleDateString('ca-ES', opcions)
  const fi = new Date(dataFi + 'T12:00:00').toLocaleDateString('ca-ES', opcionsFull)
  return `Del ${inici} al ${fi}`
}

function formatDataCurt(data: string): string {
  return new Date(data + 'T12:00:00').toLocaleDateString('ca-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

interface Props {
  absencia: any
  substitucions: any[]
  docentActualId: string
  esGestor: boolean
}

export default function AbsenciaDetall({ absencia, substitucions, docentActualId, esGestor }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const esPropietari = absencia.docent?.id === docentActualId
  const esMultiDia = absencia.data_fi && absencia.data_fi !== absencia.data

  const handleDecisio = async (nouEstat: 'aprovada' | 'rebutjada') => {
    setLoading(nouEstat)
    setError('')
    const result = await actualitzarEstatAbsencia(absencia.id, nouEstat, docentActualId)
    if (!result.ok) {
      setError(result.error ?? 'Error inesperat')
      setLoading(null)
      return
    }
    router.refresh()
    setLoading(null)
  }

  // Agrupa substitucions per data si és multi-dia
  const substitucionsPerDia = esMultiDia
    ? substitucions.reduce((acc: Record<string, any[]>, s: any) => {
        const d = s.data ?? absencia.data
        if (!acc[d]) acc[d] = []
        acc[d].push(s)
        return acc
      }, {})
    : null

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <a href="/absencies" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          ← Absències
        </a>
      </div>

      {/* Capçalera */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--color-primary)' }}>
              {esPropietari ? 'La meva absència' : absencia.docent?.nom}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {formatData(absencia.data, absencia.data_fi)}
            </p>
          </div>
          <span className={`badge badge-${absencia.estat}`}>
            {absencia.estat === 'pendent' ? 'Pendent' : absencia.estat === 'aprovada' ? 'Aprovada' : 'Rebutjada'}
          </span>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt style={{ color: 'var(--color-text-secondary)' }}>Motiu</dt>
            <dd className="font-medium">{MOTIUS[absencia.motiu]}</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: 'var(--color-text-secondary)' }}>Durada</dt>
            <dd className="font-medium">
              {esMultiDia
                ? `${Math.round((new Date(absencia.data_fi + 'T12:00:00').getTime() - new Date(absencia.data + 'T12:00:00').getTime()) / 86400000) + 1} dies naturals`
                : absencia.tot_el_dia
                  ? 'Tot el dia'
                  : `${absencia.hora_inici?.slice(0, 5)} – ${absencia.hora_fi?.slice(0, 5)}`}
            </dd>
          </div>
          {absencia.aprovador && (
            <div className="flex justify-between">
              <dt style={{ color: 'var(--color-text-secondary)' }}>
                {absencia.estat === 'aprovada' ? 'Aprovat per' : 'Rebutjat per'}
              </dt>
              <dd className="font-medium">{absencia.aprovador.nom}</dd>
            </div>
          )}
          {absencia.observacions && (
            <div>
              <dt className="mb-1" style={{ color: 'var(--color-text-secondary)' }}>Observacions</dt>
              <dd
                className="text-sm rounded-lg p-3"
                style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-text)' }}
              >
                {absencia.observacions}
              </dd>
            </div>
          )}
        </dl>

        {/* Botons d'aprovació (dia personal pendent) */}
        {esGestor && absencia.estat === 'pendent' && absencia.motiu === 'dia_personal' && (
          <>
            {error && (
              <div className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                {error}
              </div>
            )}
            <div className="flex gap-3 mt-5 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => handleDecisio('rebutjada')}
                disabled={!!loading}
                className="btn-secondary flex-1"
                style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
              >
                {loading === 'rebutjada' ? 'Rebutjant...' : 'Rebutjar'}
              </button>
              <button
                onClick={() => handleDecisio('aprovada')}
                disabled={!!loading}
                className="btn-primary flex-1"
              >
                {loading === 'aprovada' ? 'Aprovant...' : 'Aprovar'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Classes afectades — vista multi-dia agrupada per dia */}
      {esMultiDia && substitucionsPerDia && Object.keys(substitucionsPerDia).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Classes afectades ({substitucions.length})
          </h2>
          <div className="space-y-4">
            {Object.entries(substitucionsPerDia).sort().map(([dia, subs]: [string, any[]]) => (
              <div key={dia}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatDataCurt(dia)}
                </p>
                <div className="space-y-2">
                  {subs.map((s: any) => (
                    <SubstitucioItem key={s.id} s={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Classes afectades — vista d'un sol dia */}
      {!esMultiDia && substitucions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Classes afectades ({substitucions.length})
          </h2>
          <div className="space-y-2">
            {substitucions.map((s: any) => (
              <SubstitucioItem key={s.id} s={s} />
            ))}
          </div>
        </section>
      )}

      {/* Avís: absència aprovada però sense substitucions */}
      {absencia.estat === 'aprovada' && substitucions.length === 0 && (
        <div
          className="card text-sm"
          style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}
        >
          No s&apos;han generat substitucions per a aquesta absència (potser el docent no té classes en els dies afectats o és cap de setmana).
        </div>
      )}
    </div>
  )
}

function SubstitucioItem({ s }: { s: any }) {
  return (
    <a
      href={`/substitucions/${s.id}`}
      className="card flex items-start justify-between gap-3 hover:shadow-md transition-shadow block"
      style={{ textDecoration: 'none' }}
    >
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {s.horari_setmanal?.franja?.hora_inici?.slice(0, 5)}–{s.horari_setmanal?.franja?.hora_fi?.slice(0, 5)}
          {s.horari_setmanal?.grup?.nom && ` · ${s.horari_setmanal.grup.nom}`}
          {s.horari_setmanal?.materia && ` · ${s.horari_setmanal.materia}`}
        </p>
        {s.motiu_proposta_ia && (
          <p className="text-xs mt-0.5 italic" style={{ color: 'var(--color-info)' }}>
            {s.motiu_proposta_ia}
          </p>
        )}
        {s.substitut ? (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {s.estat === 'confirmada' ? 'Substitut/a: ' : 'Proposat/da: '}
            <strong>{s.substitut.nom}</strong>
          </p>
        ) : (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>
            Sense substitut assignat
          </p>
        )}
      </div>
      <span className={`badge badge-${s.estat} flex-shrink-0`}>
        {s.estat === 'pendent' ? 'Pendent' : s.estat === 'proposta_ia' ? 'Proposta' : 'Confirmada'}
      </span>
    </a>
  )
}
