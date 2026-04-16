'use client'

import { useState } from 'react'
import Link from 'next/link'

const TIPUS_HORARI: Record<string, string> = {
  classe: 'Classe',
  guardia: 'Guàrdia',
  permanencia: 'Permanència',
  reunio: 'Reunió',
  esbarjo: 'Esbarjo',
  hnl: 'HNL',
  disponible: 'Disponible',
}

interface Substitucio {
  id: string
  estat: string
  data: string
  horari_setmanal: {
    tipus: string
    materia: string | null
    franja: { hora_inici: string; hora_fi: string } | null
    grup: { nom: string } | null
  } | null
  absencia: { docent: { nom: string } | null } | null
  substitut: { nom: string } | null
}

interface Props {
  substitucions: Substitucio[]
  dataSeleccionada: string
}

export default function AgendaDia({ substitucions, dataSeleccionada }: Props) {
  const [data, setData] = useState(dataSeleccionada)

  const filtrades = substitucions.filter(s => s.data === data)

  const pendents = filtrades.filter(s => s.estat !== 'confirmada')
  const confirmades = filtrades.filter(s => s.estat === 'confirmada')

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          Agenda del dia
        </h2>
        <input
          type="date"
          value={data}
          onChange={e => setData(e.target.value)}
          className="text-sm rounded-lg border px-2 py-1"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
            backgroundColor: 'white',
            minHeight: 'auto',
          }}
        />
      </div>

      {filtrades.length === 0 ? (
        <div className="card text-center py-6" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">Cap substitució per a aquest dia.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendents.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-warning)' }}>
                Per confirmar ({pendents.length})
              </p>
              <div className="space-y-2">
                {pendents.map(s => <SubstitucioAgendaItem key={s.id} s={s} />)}
              </div>
            </div>
          )}
          {confirmades.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-success)' }}>
                Confirmades ({confirmades.length})
              </p>
              <div className="space-y-2">
                {confirmades.map(s => <SubstitucioAgendaItem key={s.id} s={s} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function SubstitucioAgendaItem({ s }: { s: Substitucio }) {
  const hora = s.horari_setmanal?.franja
    ? `${s.horari_setmanal.franja.hora_inici.slice(0, 5)}–${s.horari_setmanal.franja.hora_fi.slice(0, 5)}`
    : '—'

  return (
    <Link
      href={`/substitucions/${s.id}`}
      className="card flex items-start justify-between gap-3 hover:shadow-md transition-shadow"
      style={{ textDecoration: 'none' }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--color-primary)' }}>
            {hora}
          </span>
          {s.horari_setmanal?.grup?.nom && (
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {s.horari_setmanal.grup.nom}
            </span>
          )}
          {s.horari_setmanal?.materia && (
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {s.horari_setmanal.materia}
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          Absent: {s.absencia?.docent?.nom ?? '—'}
        </p>
        {s.substitut ? (
          <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--color-success)' }}>
            Substitut/a: {s.substitut.nom}
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
    </Link>
  )
}
