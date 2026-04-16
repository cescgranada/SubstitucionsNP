'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Grup {
  id: string
  codi: string
  nom: string
  etapa: { nom: string } | null
}

interface Props {
  docentId: string
  grups: Grup[]
}

export default function NovaSortidaForm({ docentId, grups }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [descripcio, setDescripcio] = useState('')
  const [data, setData] = useState('')
  const [horaInici, setHoraInici] = useState('09:00')
  const [horaFi, setHoraFi] = useState('14:00')
  const [grupsSeleccionats, setGrupsSeleccionats] = useState<string[]>([])
  const [observacions, setObservacions] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleGrup = (id: string) => {
    setGrupsSeleccionats(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  // Agrupa per etapa
  const grupsPErEtapa: Record<string, Grup[]> = {}
  for (const g of grups) {
    const etapa = g.etapa?.nom ?? 'Altres'
    if (!grupsPErEtapa[etapa]) grupsPErEtapa[etapa] = []
    grupsPErEtapa[etapa].push(g)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!descripcio.trim()) { setError('Cal una descripció.'); return }
    if (!data) { setError('Cal seleccionar una data.'); return }
    if (grupsSeleccionats.length === 0) { setError('Selecciona almenys un grup.'); return }
    if (horaInici >= horaFi) { setError('L\'hora de fi ha de ser posterior a la d\'inici.'); return }

    setLoading(true)

    const { data: sortida, error: errSortida } = await supabase
      .from('sortides')
      .insert({
        proposada_per: docentId,
        data,
        hora_inici: horaInici,
        hora_fi: horaFi,
        descripcio: descripcio.trim(),
        observacions: observacions.trim() || null,
        estat: 'proposta',
      })
      .select('id')
      .single()

    if (errSortida || !sortida) {
      setError('Error en desar la sortida.')
      setLoading(false)
      return
    }

    // Associa grups
    const { error: errGrups } = await supabase
      .from('sortida_grups')
      .insert(grupsSeleccionats.map(grupId => ({
        sortida_id: sortida.id,
        grup_id: grupId,
      })))

    if (errGrups) {
      setError('Sortida creada però error en associar grups.')
      setLoading(false)
      return
    }

    router.push(`/sortides/${sortida.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      {/* Descripció */}
      <div>
        <label htmlFor="descripcio">Descripció de la sortida</label>
        <input
          id="descripcio"
          type="text"
          value={descripcio}
          onChange={(e) => setDescripcio(e.target.value)}
          placeholder="p.ex. Visita al Museu de Ciències Naturals"
          required
        />
      </div>

      {/* Data */}
      <div>
        <label htmlFor="data">Data</label>
        <input
          id="data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          required
        />
      </div>

      {/* Horari */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="hora-inici">Hora de sortida</label>
          <input
            id="hora-inici"
            type="time"
            value={horaInici}
            onChange={(e) => setHoraInici(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="hora-fi">Hora de tornada</label>
          <input
            id="hora-fi"
            type="time"
            value={horaFi}
            onChange={(e) => setHoraFi(e.target.value)}
          />
        </div>
      </div>

      {/* Grups */}
      <div>
        <label>Grups participants</label>
        <div className="mt-2 space-y-3">
          {Object.entries(grupsPErEtapa).map(([etapa, gs]) => (
            <div key={etapa}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                {etapa}
              </p>
              <div className="flex flex-wrap gap-2">
                {gs.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGrup(g.id)}
                    className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
                    style={{
                      borderColor: grupsSeleccionats.includes(g.id) ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: grupsSeleccionats.includes(g.id) ? 'var(--color-primary-light)' : 'white',
                      color: grupsSeleccionats.includes(g.id) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      fontWeight: grupsSeleccionats.includes(g.id) ? 600 : 400,
                    }}
                  >
                    {g.codi}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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
          placeholder="Informació addicional per a la coordinació..."
          style={{ minHeight: 'auto', resize: 'none' }}
        />
      </div>

      <div
        className="rounded-lg px-3 py-2.5 text-xs"
        style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}
      >
        La sortida quedarà pendent d&apos;aprovació per la coordinació o direcció.
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <a href="/sortides" className="btn-secondary flex-1 text-center">
          Cancel·lar
        </a>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Enviant...' : 'Proposar sortida'}
        </button>
      </div>
    </form>
  )
}
