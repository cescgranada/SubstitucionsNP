'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { proposarSortida } from '@/lib/actions/sortides'
import { useToast } from '@/components/ui/Toast'

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
  const { showToast } = useToast()

  const [descripcio, setDescripcio] = useState('')
  const [data, setData] = useState('')
  const [horaInici, setHoraInici] = useState('09:00')
  const [horaFi, setHoraFi] = useState('14:00')
  const [grupsSeleccionats, setGrupsSeleccionats] = useState<string[]>([])
  const [observacions, setObservacions] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Guarda addicional a `loading`: evita un doble enviament si l'usuari fa
  // doble clic abans que React torni a renderitzar el botó com a disabled.
  const enviantRef = useRef(false)

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
    if (enviantRef.current) return
    setError('')

    if (!descripcio.trim()) { setError('Cal una descripció.'); return }
    if (!data) { setError('Cal seleccionar una data.'); return }
    if (grupsSeleccionats.length === 0) { setError('Selecciona almenys un grup.'); return }
    if (horaInici >= horaFi) { setError('L\'hora de fi ha de ser posterior a la d\'inici.'); return }

    enviantRef.current = true
    setLoading(true)

    try {
      const result = await proposarSortida({
        docentId,
        data,
        horaInici,
        horaFi,
        descripcio,
        observacions,
        grupsIds: grupsSeleccionats,
      })

      if (!result.ok) {
        setError(result.error ?? 'Error en proposar la sortida.')
        setLoading(false)
        enviantRef.current = false
        return
      }

      showToast('Sortida proposada correctament.')
      router.push(`/sortides/${result.sortidaId}`)
      router.refresh()
    } catch (err: unknown) {
      console.error(err)
      const missatge = err instanceof Error ? err.message : String(err)
      setError("S'ha produït un error inesperat: " + missatge)
      setLoading(false)
      enviantRef.current = false
    }
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
        <a
          href="/sortides"
          className="btn-secondary flex-1 text-center"
          style={loading ? { pointerEvents: 'none', opacity: 0.6 } : undefined}
        >
          Cancel·lar
        </a>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? 'Enviant...' : 'Proposar sortida'}
        </button>
      </div>
    </form>
  )
}
