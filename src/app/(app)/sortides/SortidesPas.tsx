'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { marcarGestioSortida } from '@/lib/actions/sortides'

const TEXT_TRANSPORT: Record<string, string> = {
  peu: 'A peu',
  autocar: 'Autocar',
  transport_public: 'Transport públic',
}

interface Props {
  sortides: any[]
  docentActualId: string
}

function teGestioPendent(s: any): boolean {
  return (s.necessita_dinar && !s.dinar_demanat) ||
    (!!s.transport && !s.transport_demanat && s.transport !== 'peu') ||
    (s.requereix_pagament && !s.pagament_fet)
}

export default function SortidesPas({ sortides, docentActualId }: Props) {
  const pendents = sortides.filter(teGestioPendent)
  const gestionades = sortides.filter(s => !teGestioPendent(s))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
        Sortides — gestió
      </h1>

      {pendents.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-warning)' }}>
            Pendents de gestionar ({pendents.length})
          </h2>
          <div className="space-y-3">
            {pendents.map(s => (
              <SortidaGestioCard key={s.id} sortida={s} docentActualId={docentActualId} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Gestionades ({gestionades.length})
        </h2>
        {gestionades.length > 0 ? (
          <div className="space-y-3">
            {gestionades.map(s => (
              <SortidaGestioCard key={s.id} sortida={s} docentActualId={docentActualId} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-sm">Cap sortida gestionada encara.</p>
          </div>
        )}
      </section>

      {sortides.length === 0 && (
        <div className="card text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">No hi ha cap sortida aprovada.</p>
        </div>
      )}
    </div>
  )
}

function SortidaGestioCard({ sortida: s, docentActualId }: { sortida: any; docentActualId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleToggle = async (camp: 'dinar' | 'transport' | 'pagament', valorActual: boolean) => {
    setLoading(camp)
    await marcarGestioSortida({
      sortidaId: s.id,
      camp,
      valor: !valorActual,
      docentActualId,
    })
    setLoading(null)
    router.refresh()
  }

  const grupsNoms = (s.sortida_grups ?? []).map((sg: any) => sg.grup?.nom).filter(Boolean).join(', ')
  const calTransport = !!s.transport && s.transport !== 'peu'

  return (
    <div className="card space-y-3">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{s.descripcio}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(s.data + 'T12:00:00').toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}{s.hora_inici?.slice(0, 5)}–{s.hora_fi?.slice(0, 5)}
          {grupsNoms && ` · ${grupsNoms}`}
        </p>
      </div>

      {!s.necessita_dinar && !calTransport && !s.requereix_pagament && (
        <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>
          No requereix cap gestió (ni dinar, ni transport, ni pagament).
        </p>
      )}

      <div className="space-y-2">
        {s.necessita_dinar && (
          <GestioToggle
            etiqueta="Dinar demanat"
            fet={s.dinar_demanat}
            per={s.dinar_demanat_per?.nom}
            at={s.dinar_demanat_at}
            loading={loading === 'dinar'}
            onToggle={() => handleToggle('dinar', s.dinar_demanat)}
          />
        )}
        {calTransport && (
          <GestioToggle
            etiqueta={`Transport demanat (${TEXT_TRANSPORT[s.transport] ?? s.transport})`}
            fet={s.transport_demanat}
            per={s.transport_demanat_per?.nom}
            at={s.transport_demanat_at}
            loading={loading === 'transport'}
            onToggle={() => handleToggle('transport', s.transport_demanat)}
          />
        )}
        {s.requereix_pagament && (
          <GestioToggle
            etiqueta="Pagament realitzat"
            detall={s.data_limit_pagament ? `Data límit: ${new Date(s.data_limit_pagament + 'T12:00:00').toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' })}` : undefined}
            fet={s.pagament_fet}
            per={s.pagament_fet_per?.nom}
            at={s.pagament_fet_at}
            loading={loading === 'pagament'}
            onToggle={() => handleToggle('pagament', s.pagament_fet)}
          />
        )}
      </div>
    </div>
  )
}

function GestioToggle({
  etiqueta, detall, fet, per, at, loading, onToggle,
}: {
  etiqueta: string
  detall?: string
  fet: boolean
  per?: string
  at?: string
  loading: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
      style={{
        backgroundColor: fet ? '#DCFCE7' : 'var(--color-secondary-light)',
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: fet ? '#166534' : 'var(--color-text)' }}>
          {etiqueta}
        </p>
        {detall && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>{detall}</p>
        )}
        {fet && per && (
          <p className="text-xs mt-0.5" style={{ color: '#166534' }}>
            Fet per {per}{at && ` · ${new Date(at).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}`}
          </p>
        )}
      </div>
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2"
        style={{
          backgroundColor: fet ? '#27AE60' : 'white',
          borderColor: fet ? '#27AE60' : 'var(--color-border)',
        }}
      >
        {fet && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </span>
    </button>
  )
}
