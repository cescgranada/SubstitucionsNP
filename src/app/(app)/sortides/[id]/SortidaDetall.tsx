'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualitzarEstatSortida, eliminarSortida } from '@/lib/actions/sortides'

interface Props {
  sortida: any
  docentActualId: string
  esGestor: boolean
  esProposador: boolean
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleDateString('ca-ES', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function SortidaDetall({ sortida, docentActualId, esGestor, esProposador }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmantEliminar, setConfirmantEliminar] = useState(false)

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

      {/* Acompanyants */}
      {acompanyants.length > 0 && (
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
