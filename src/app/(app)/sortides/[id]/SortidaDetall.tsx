'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualitzarEstatSortida, eliminarSortida, marcarGestioSortida, desarAcompanyants } from '@/lib/actions/sortides'

interface Props {
  sortida: any
  docentActualId: string
  esGestor: boolean
  esProposador: boolean
  esPas: boolean
  docentsCandidats: { id: string; nom: string }[]
}

const TEXT_TRANSPORT: Record<string, string> = {
  peu: 'A peu',
  autocar: 'Autocar',
  transport_public: 'Transport públic',
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleDateString('ca-ES', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function SortidaDetall({ sortida, docentActualId, esGestor, esProposador, esPas, docentsCandidats }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmantEliminar, setConfirmantEliminar] = useState(false)

  const acompanyantsActuals = ((sortida.sortida_acompanyants as any[]) ?? [])
    .map((sa: any) => sa.docent?.id)
    .filter(Boolean)
  const [acompanyantsSeleccionats, setAcompanyantsSeleccionats] = useState<string[]>(acompanyantsActuals)
  const [desantAcompanyants, setDesantAcompanyants] = useState(false)

  const potTriarAcompanyants = esGestor && sortida.estat === 'proposta'

  const toggleAcompanyant = (id: string) => {
    setAcompanyantsSeleccionats(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  const handleDesarAcompanyants = async () => {
    setDesantAcompanyants(true)
    setErrorMsg('')
    const result = await desarAcompanyants({
      sortidaId: sortida.id,
      docentIds: acompanyantsSeleccionats,
      docentActualId,
    })
    if (!result.ok) {
      setErrorMsg(result.error ?? 'Error inesperat')
    }
    setDesantAcompanyants(false)
    router.refresh()
  }

  const calTransport = !!sortida.transport && sortida.transport !== 'peu'
  const teAlgunaGestio = sortida.necessita_dinar || calTransport || sortida.requereix_pagament

  const handleToggleGestio = async (camp: 'dinar' | 'transport' | 'pagament', valorActual: boolean) => {
    setLoading(`gestio-${camp}`)
    await marcarGestioSortida({ sortidaId: sortida.id, camp, valor: !valorActual, docentActualId })
    setLoading(null)
    router.refresh()
  }

  const estaEliminada = sortida.estat === 'eliminada'

  // DOCENT: només la pròpia proposta i mentre estigui en estat 'proposta'. EQUIP_DIRECTIU: sempre.
  const potEliminar = !estaEliminada &&
    (esGestor || (esProposador && sortida.estat === 'proposta'))

  const handleDecisio = async (nouEstat: 'aprovada' | 'rebutjada') => {
    setLoading(nouEstat)
    setErrorMsg('')
    const result = await actualitzarEstatSortida(sortida.id, nouEstat, docentActualId)
    if (!result.ok) {
      setErrorMsg(result.error ?? 'Error inesperat')
      setLoading(null)
      return
    }
    router.refresh()
    setLoading(null)
  }

  const handleEliminar = async () => {
    setLoading('eliminar')
    setErrorMsg('')
    const result = await eliminarSortida(sortida.id, docentActualId)
    if (!result.ok) {
      setErrorMsg(result.error ?? 'Error inesperat')
      setLoading(null)
      setConfirmantEliminar(false)
      return
    }
    router.refresh()
    setLoading(null)
    setConfirmantEliminar(false)
  }

  const grupsNoms = (sortida.sortida_grups ?? [])
    .map((sg: any) => sg.grup?.nom)
    .filter(Boolean)
    .join(', ')

  const acompanyants = (sortida.sortida_acompanyants ?? [])
    .map((sa: any) => sa.docent?.nom)
    .filter(Boolean)

  const dataFormatada = new Date(sortida.data + 'T12:00:00').toLocaleDateString('ca-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const estatBadge = sortida.estat === 'proposta' ? 'pendent' : sortida.estat

  const TEXT_ESTAT: Record<string, string> = {
    proposta: 'Proposta',
    aprovada: 'Aprovada',
    rebutjada: 'Rebutjada',
    eliminada: 'Eliminada',
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <a href="/sortides" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          ← Sortides
        </a>
      </div>

      {/* Capçalera */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--color-primary)' }}>
              {sortida.descripcio}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Proposada per {sortida.proposador?.nom}
            </p>
          </div>
          <span className={`badge badge-${estatBadge} flex-shrink-0`}>
            {TEXT_ESTAT[sortida.estat] ?? sortida.estat}
          </span>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt style={{ color: 'var(--color-text-secondary)' }}>Data</dt>
            <dd className="font-medium text-right">{dataFormatada}</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: 'var(--color-text-secondary)' }}>Horari</dt>
            <dd className="font-medium">
              {sortida.hora_inici?.slice(0, 5)} – {sortida.hora_fi?.slice(0, 5)}
            </dd>
          </div>
          {grupsNoms && (
            <div className="flex justify-between gap-4">
              <dt style={{ color: 'var(--color-text-secondary)' }}>Grups</dt>
              <dd className="font-medium text-right">{grupsNoms}</dd>
            </div>
          )}
          {sortida.transport && (
            <div className="flex justify-between">
              <dt style={{ color: 'var(--color-text-secondary)' }}>Transport</dt>
              <dd className="font-medium">{TEXT_TRANSPORT[sortida.transport] ?? sortida.transport}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt style={{ color: 'var(--color-text-secondary)' }}>Dinar</dt>
            <dd className="font-medium">{sortida.necessita_dinar ? 'Sí' : 'No'}</dd>
          </div>
          {sortida.requereix_pagament && (
            <div className="flex justify-between">
              <dt style={{ color: 'var(--color-text-secondary)' }}>Pagament</dt>
              <dd className="font-medium text-right">
                Cal pagar
                {sortida.data_limit_pagament && (
                  <span className="block text-xs" style={{ color: 'var(--color-warning)' }}>
                    Data límit: {new Date(sortida.data_limit_pagament + 'T12:00:00').toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </dd>
            </div>
          )}
          {sortida.aprovador?.nom && (
            <div className="flex justify-between">
              <dt style={{ color: 'var(--color-text-secondary)' }}>
                {sortida.estat === 'aprovada' ? 'Aprovada per' : 'Rebutjada per'}
              </dt>
              <dd className="font-medium">{sortida.aprovador.nom}</dd>
            </div>
          )}
          {estaEliminada && sortida.eliminador?.nom && (
            <div className="flex justify-between">
              <dt style={{ color: 'var(--color-text-secondary)' }}>Eliminada per</dt>
              <dd className="font-medium text-right">
                {sortida.eliminador.nom}
                {sortida.eliminada_at && (
                  <span className="block text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatDataHora(sortida.eliminada_at)}
                  </span>
                )}
              </dd>
            </div>
          )}
          {sortida.observacions && (
            <div>
              <dt className="mb-1" style={{ color: 'var(--color-text-secondary)' }}>Observacions</dt>
              <dd
                className="text-sm rounded-lg p-3"
                style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-text)' }}
              >
                {sortida.observacions}
              </dd>
            </div>
          )}
        </dl>

        {errorMsg && (
          <div
            className="mt-3 rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
          >
            {errorMsg}
          </div>
        )}

        {/* Botons d'aprovació */}
        {esGestor && sortida.estat === 'proposta' && (
          <div className="flex gap-3 mt-5 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => handleDecisio('rebutjada')}
              disabled={!!loading}
              className="btn-secondary flex-1"
              style={{ backgroundColor: 'transparent', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
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
        )}

        {/* Botó eliminar */}
        {potEliminar && !confirmantEliminar && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => setConfirmantEliminar(true)}
              className="text-sm font-medium"
              style={{ color: 'var(--color-danger)' }}
            >
              Eliminar aquesta sortida
            </button>
          </div>
        )}

        {/* Confirmació eliminació */}
        {confirmantEliminar && (
          <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Aquesta sortida quedarà marcada com a eliminada (amb el teu nom i la data) i deixarà
              de comptar, però quedarà consultable a l&apos;historial.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmantEliminar(false)}
                disabled={!!loading}
                className="btn-secondary flex-1 text-sm"
                style={{ padding: '8px 16px', minHeight: '36px' }}
              >
                Enrere
              </button>
              <button
                onClick={handleEliminar}
                disabled={!!loading}
                className="flex-1 text-sm rounded-lg font-medium"
                style={{
                  padding: '8px 16px',
                  minHeight: '36px',
                  backgroundColor: 'var(--color-danger)',
                  color: 'white',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading === 'eliminar' ? 'Eliminant...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Gestió logística (PAS) — només un cop aprovada */}
      {sortida.estat === 'aprovada' && teAlgunaGestio && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Gestió logística
          </h2>
          <div className="space-y-2">
            {sortida.necessita_dinar && (
              <GestioItem
                etiqueta="Dinar demanat"
                fet={sortida.dinar_demanat}
                per={sortida.dinar_demanat_per?.nom}
                at={sortida.dinar_demanat_at}
                editable={esPas}
                loading={loading === 'gestio-dinar'}
                onToggle={() => handleToggleGestio('dinar', sortida.dinar_demanat)}
              />
            )}
            {calTransport && (
              <GestioItem
                etiqueta="Transport demanat"
                fet={sortida.transport_demanat}
                per={sortida.transport_demanat_per?.nom}
                at={sortida.transport_demanat_at}
                editable={esPas}
                loading={loading === 'gestio-transport'}
                onToggle={() => handleToggleGestio('transport', sortida.transport_demanat)}
              />
            )}
            {sortida.requereix_pagament && (
              <GestioItem
                etiqueta="Pagament realitzat"
                fet={sortida.pagament_fet}
                per={sortida.pagament_fet_per?.nom}
                at={sortida.pagament_fet_at}
                editable={esPas}
                loading={loading === 'gestio-pagament'}
                onToggle={() => handleToggleGestio('pagament', sortida.pagament_fet)}
              />
            )}
          </div>
        </div>
      )}

      {/* Acompanyants: selector (equip directiu, mentre és proposta) */}
      {potTriarAcompanyants ? (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Acompanyants
          </h2>
          {docentsCandidats.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {docentsCandidats.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleAcompanyant(d.id)}
                    className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
                    style={{
                      borderColor: acompanyantsSeleccionats.includes(d.id) ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: acompanyantsSeleccionats.includes(d.id) ? 'var(--color-primary-light)' : 'white',
                      color: acompanyantsSeleccionats.includes(d.id) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      fontWeight: acompanyantsSeleccionats.includes(d.id) ? 600 : 400,
                    }}
                  >
                    {d.nom}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleDesarAcompanyants}
                disabled={desantAcompanyants}
                className="btn-secondary text-sm px-4 py-2"
                style={{ minHeight: '36px', cursor: desantAcompanyants ? 'not-allowed' : 'pointer' }}
              >
                {desantAcompanyants ? 'Desant...' : 'Desar acompanyants'}
              </button>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              No hi ha docents a les etapes d&apos;aquesta sortida.
            </p>
          )}
        </div>
      ) : acompanyants.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Acompanyants
          </h2>
          <div className="space-y-1">
            {acompanyants.map((nom: string, i: number) => (
              <p key={i} className="text-sm" style={{ color: 'var(--color-text)' }}>{nom}</p>
            ))}
          </div>
        </div>
      )}

      {/* Efecte cascada */}
      {sortida.estat === 'aprovada' && (
        <div
          className="card text-sm"
          style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}
        >
          Els docents que tenien classes amb els grups participants queden alliberats i seran prioritaris per a substitucions aquell dia.
        </div>
      )}
    </div>
  )
}

function GestioItem({
  etiqueta, fet, per, at, editable, loading, onToggle,
}: {
  etiqueta: string
  fet: boolean
  per?: string
  at?: string
  editable: boolean
  loading: boolean
  onToggle: () => void
}) {
  const contingut = (
    <div className="min-w-0">
      <p className="text-sm font-medium" style={{ color: fet ? '#166534' : 'var(--color-text)' }}>
        {etiqueta}
      </p>
      {fet && per && (
        <p className="text-xs mt-0.5" style={{ color: '#166534' }}>
          Fet per {per}{at && ` · ${new Date(at).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}`}
        </p>
      )}
      {!fet && !editable && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>Pendent</p>
      )}
    </div>
  )

  const icona = (
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
  )

  if (!editable) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5" style={{ backgroundColor: fet ? '#DCFCE7' : 'var(--color-secondary-light)' }}>
        {contingut}
        {icona}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
      style={{ backgroundColor: fet ? '#DCFCE7' : 'var(--color-secondary-light)', cursor: loading ? 'not-allowed' : 'pointer' }}
    >
      {contingut}
      {icona}
    </button>
  )
}
