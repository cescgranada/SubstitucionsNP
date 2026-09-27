'use client'

import { useState } from 'react'
import Link from 'next/link'

const TEXT_ESTAT: Record<string, string> = {
  pendent: 'Pendent',
  proposta_ia: 'Proposta',
  confirmada: 'Confirmada',
  no_cal: 'No cal',
}

interface Props {
  comsubs: any[]
  generades: any[]
  avui: string
}

/**
 * "Full de substitucions" personal, en dues pestanyes independents:
 * les que haig de fer (com a substitut/a) i les que he generat
 * (per les meves pròpies absències).
 */
export default function SubstitucionsPersonals({ comsubs, generades, avui }: Props) {
  const [tab, setTab] = useState<'fer' | 'generades'>('fer')

  return (
    <section>
      <div className="flex gap-1 mb-3 p-1 rounded-lg" style={{ backgroundColor: 'var(--color-primary-light)', width: 'fit-content' }}>
        <button
          onClick={() => setTab('fer')}
          className="text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
          style={{
            backgroundColor: tab === 'fer' ? 'white' : 'transparent',
            color: tab === 'fer' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          }}
        >
          Que haig de fer{comsubs.length > 0 ? ` (${comsubs.length})` : ''}
        </button>
        <button
          onClick={() => setTab('generades')}
          className="text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
          style={{
            backgroundColor: tab === 'generades' ? 'white' : 'transparent',
            color: tab === 'generades' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          }}
        >
          Que he generat{generades.length > 0 ? ` (${generades.length})` : ''}
        </button>
      </div>

      {tab === 'fer' ? (
        comsubs.length > 0 ? (
          <div className="space-y-2">
            {comsubs.map((s: any) => {
              const esFutura = s.data >= avui
              return (
                <Link
                  key={s.id}
                  href={`/substitucions/${s.id}`}
                  className="card flex items-start justify-between gap-3 hover:shadow-md transition-shadow"
                  style={{ textDecoration: 'none', opacity: esFutura ? 1 : 0.7 }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {new Date(s.data).toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {s.horari_setmanal?.franja?.hora_inici?.slice(0, 5)}–{s.horari_setmanal?.franja?.hora_fi?.slice(0, 5)}
                      {s.absencia?.docent?.nom && ` · Supleix ${s.absencia.docent.nom}`}
                    </p>
                    {s.horari_setmanal?.grup?.nom && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {s.horari_setmanal.grup.nom}
                        {s.horari_setmanal.materia && ` · ${s.horari_setmanal.materia}`}
                      </p>
                    )}
                    {s.feina_substitut && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--color-text-secondary)' }}>
                        &ldquo;{s.feina_substitut}&rdquo;
                      </p>
                    )}
                  </div>
                  <span className={`badge badge-${s.estat} flex-shrink-0`}>
                    {TEXT_ESTAT[s.estat] ?? s.estat}
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-sm">No tens cap substitució per fer.</p>
          </div>
        )
      ) : generades.length > 0 ? (
        <div className="space-y-2">
          {generades.map((s: any) => {
            const esFutura = s.data >= avui
            return (
              <Link
                key={s.id}
                href={`/substitucions/${s.id}`}
                className="card flex items-start justify-between gap-3 hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none', opacity: esFutura ? 1 : 0.7 }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {new Date(s.data).toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {s.horari_setmanal?.franja?.hora_inici?.slice(0, 5)}–{s.horari_setmanal?.franja?.hora_fi?.slice(0, 5)}
                    {s.horari_setmanal?.grup?.nom && ` · ${s.horari_setmanal.grup.nom}`}
                  </p>
                  {s.substitut?.nom ? (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-accent)' }}>
                      Cobreix: {s.substitut.nom}
                    </p>
                  ) : s.estat === 'no_cal' ? (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      No calia substitut
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>
                      Sense substitut assignat
                    </p>
                  )}
                </div>
                <span className={`badge badge-${s.estat} flex-shrink-0`}>
                  {TEXT_ESTAT[s.estat] ?? s.estat}
                </span>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">Les teves absències no han generat cap substitució.</p>
        </div>
      )}
    </section>
  )
}
