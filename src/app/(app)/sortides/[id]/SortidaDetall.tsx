'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  sortida: any
  docentActualId: string
  esGestor: boolean
  esProposador: boolean
}

export default function SortidaDetall({ sortida, docentActualId, esGestor, esProposador }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [observacions, setObservacions] = useState(sortida.observacions ?? '')

  const handleDecisio = async (nouEstat: 'aprovada' | 'rebutjada') => {
    setLoading(nouEstat)
    await supabase
      .from('sortides')
      .update({
        estat: nouEstat,
        aprovada_per: docentActualId,
        data_aprovacio: new Date().toISOString(),
      })
      .eq('id', sortida.id)
    router.refresh()
    setLoading(null)
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
          <span className={`badge badge-${sortida.estat === 'proposta' ? 'pendent' : sortida.estat} flex-shrink-0`}>
            {sortida.estat === 'proposta' ? 'Proposta' : sortida.estat === 'aprovada' ? 'Aprovada' : 'Rebutjada'}
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

        {/* Botons d'aprovació (gestors) */}
        {esGestor && sortida.estat === 'proposta' && (
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

      {/* Efecte cascada: informació si aprovada */}
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
