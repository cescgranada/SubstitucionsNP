'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearAbsencia } from '@/lib/actions/generar-substitucions'

interface Props {
  docentId: string
  docentNom: string
}

export default function NovaAbsenciaForm({ docentId }: Props) {
  const router = useRouter()

  const [data, setData] = useState('')
  const [motiu, setMotiu] = useState<'medic' | 'dia_personal' | 'formacio'>('medic')
  const [totElDia, setTotElDia] = useState(true)
  const [horaInici, setHoraInici] = useState('')
  const [horaFi, setHoraFi] = useState('')
  const [observacions, setObservacions] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!data) {
      setError('Cal seleccionar una data.')
      setLoading(false)
      return
    }
    if (!totElDia && (!horaInici || !horaFi)) {
      setError('Cal indicar la franja horària.')
      setLoading(false)
      return
    }

    const result = await crearAbsencia({
      docentId,
      data,
      motiu,
      totElDia,
      horaInici: totElDia ? undefined : horaInici,
      horaFi: totElDia ? undefined : horaFi,
      observacions: observacions || undefined,
    })

    if (!result.ok) {
      setError(result.error ?? 'Error en desar l\'absència. Torna-ho a provar.')
      setLoading(false)
      return
    }

    // Redirigeix al detall per veure les substitucions generades
    router.push(result.absenciaId ? `/absencies/${result.absenciaId}` : '/absencies')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      {/* Data */}
      <div>
        <label htmlFor="data">Data de l&apos;absència</label>
        <input
          id="data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          required
        />
      </div>

      {/* Motiu */}
      <div>
        <label>Motiu</label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {(['medic', 'dia_personal', 'formacio'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotiu(m)}
              className="py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors"
              style={{
                borderColor: motiu === m ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: motiu === m ? 'var(--color-primary-light)' : 'white',
                color: motiu === m ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {m === 'medic' ? 'Mèdic' : m === 'dia_personal' ? 'Dia personal' : 'Formació'}
            </button>
          ))}
        </div>
        {motiu === 'dia_personal' && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-warning)' }}>
            Els dies personals requereixen aprovació del cap de personal.
          </p>
        )}
        {(motiu === 'medic' || motiu === 'formacio') && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-success)' }}>
            S&apos;aprovarà automàticament i es generaran les substitucions.
          </p>
        )}
      </div>

      {/* Tot el dia / franja */}
      <div>
        <label>Durada</label>
        <div className="flex gap-3 mt-1">
          <button
            type="button"
            onClick={() => setTotElDia(true)}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors"
            style={{
              borderColor: totElDia ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: totElDia ? 'var(--color-primary-light)' : 'white',
              color: totElDia ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}
          >
            Tot el dia
          </button>
          <button
            type="button"
            onClick={() => setTotElDia(false)}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors"
            style={{
              borderColor: !totElDia ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: !totElDia ? 'var(--color-primary-light)' : 'white',
              color: !totElDia ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}
          >
            Franja horària
          </button>
        </div>
      </div>

      {!totElDia && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="hora-inici">Hora d&apos;inici</label>
            <input
              id="hora-inici"
              type="time"
              value={horaInici}
              onChange={(e) => setHoraInici(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="hora-fi">Hora de fi</label>
            <input
              id="hora-fi"
              type="time"
              value={horaFi}
              onChange={(e) => setHoraFi(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Observacions */}
      <div>
        <label htmlFor="observacions">
          Observacions{' '}
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(opcional)</span>
        </label>
        <textarea
          id="observacions"
          rows={3}
          value={observacions}
          onChange={(e) => setObservacions(e.target.value)}
          placeholder="Afegeix qualsevol informació rellevant..."
          style={{ minHeight: 'auto', resize: 'none' }}
        />
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <a href="/absencies" className="btn-secondary flex-1 text-center">
          Cancel·lar
        </a>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Enviant...' : 'Comunicar absència'}
        </button>
      </div>
    </form>
  )
}
