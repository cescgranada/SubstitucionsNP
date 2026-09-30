'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { proposarSortida } from '@/lib/actions/sortides'
import { useToast } from '@/components/ui/Toast'
import type { Transport } from '@/lib/types'

interface Grup {
  id: string
  codi: string
  nom: string
  etapa: { nom: string } | null
}

const OPCIONS_TRANSPORT: { valor: Transport; etiqueta: string }[] = [
  { valor: 'peu', etiqueta: 'A peu' },
  { valor: 'autocar', etiqueta: 'Autocar' },
  { valor: 'transport_public', etiqueta: 'Transport públic' },
]

/**
 * Comprova que la data límit de pagament té sentit respecte a la data de la
 * sortida. Retorna un missatge d'error, o cadena buida si tot és correcte.
 *
 * TODO(usuari): quina relació ha de complir la data límit de pagament amb
 * avui i amb la data de la sortida? Per exemple: no pot ser anterior a avui,
 * i/o no pot ser posterior al dia de la sortida (pagar després de fer-la no
 * té sentit). Tria la regla que encaixi amb com funcioneu a l'escola.
 */
function validarDataLimitPagament(dataLimit: string, dataSortida: string): string {
  return ''
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
  const [necessitaDinar, setNecessitaDinar] = useState(false)
  const [transport, setTransport] = useState<Transport | ''>('')
  const [requereixPagament, setRequereixPagament] = useState(false)
  const [dataLimitPagament, setDataLimitPagament] = useState('')
  const [estatEnviament, setEstatEnviament] = useState<'inactiu' | 'enviant' | 'enviat'>('inactiu')
  const loading = estatEnviament !== 'inactiu'
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
    if (!transport) { setError('Cal seleccionar el transport.'); return }
    if (requereixPagament) {
      if (!dataLimitPagament) { setError('Cal indicar la data límit de pagament.'); return }
      const errorData = validarDataLimitPagament(dataLimitPagament, data)
      if (errorData) { setError(errorData); return }
    }

    enviantRef.current = true
    setEstatEnviament('enviant')

    try {
      const result = await proposarSortida({
        docentId,
        data,
        horaInici,
        horaFi,
        descripcio,
        observacions,
        grupsIds: grupsSeleccionats,
        necessitaDinar,
        transport: transport || null,
        requereixPagament,
        dataLimitPagament: requereixPagament ? dataLimitPagament : undefined,
      })

      if (!result.ok) {
        setError(result.error ?? 'Error en proposar la sortida.')
        setEstatEnviament('inactiu')
        enviantRef.current = false
        return
      }

      // La sortida ja s'ha desat correctament a la base de dades en
      // aquest punt: ho confirmem al botó abans de navegar, perquè si la
      // navegació mateixa trigués o fallés, mai sembli que no s'ha fet res.
      setEstatEnviament('enviat')
      showToast('Sortida proposada correctament.')
      router.push(`/sortides/${result.sortidaId}`)
      router.refresh()
    } catch (err: unknown) {
      console.error(err)
      const missatge = err instanceof Error ? err.message : String(err)
      setError("S'ha produït un error inesperat: " + missatge)
      setEstatEnviament('inactiu')
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

      {/* Dinar */}
      <div>
        <button
          type="button"
          onClick={() => setNecessitaDinar(!necessitaDinar)}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: necessitaDinar ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
        >
          <span
            className="w-8 h-4 rounded-full transition-colors flex-shrink-0 relative"
            style={{ backgroundColor: necessitaDinar ? 'var(--color-primary)' : 'var(--color-border)' }}
          >
            <span
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
              style={{ transform: necessitaDinar ? 'translateX(18px)' : 'translateX(2px)' }}
            />
          </span>
          Cal dinar
        </button>
      </div>

      {/* Transport */}
      <div>
        <label>Transport</label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {OPCIONS_TRANSPORT.map((opcio) => (
            <button
              key={opcio.valor}
              type="button"
              onClick={() => setTransport(opcio.valor)}
              className="py-2.5 px-2 rounded-lg text-sm font-medium border transition-colors"
              style={{
                borderColor: transport === opcio.valor ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: transport === opcio.valor ? 'var(--color-primary-light)' : 'white',
                color: transport === opcio.valor ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {opcio.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {/* Pagament */}
      <div>
        <button
          type="button"
          onClick={() => setRequereixPagament(!requereixPagament)}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: requereixPagament ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
        >
          <span
            className="w-8 h-4 rounded-full transition-colors flex-shrink-0 relative"
            style={{ backgroundColor: requereixPagament ? 'var(--color-primary)' : 'var(--color-border)' }}
          >
            <span
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
              style={{ transform: requereixPagament ? 'translateX(18px)' : 'translateX(2px)' }}
            />
          </span>
          Cal fer un pagament
        </button>

        {requereixPagament && (
          <div className="mt-3">
            <label htmlFor="data-limit-pagament">Data límit de pagament</label>
            <input
              id="data-limit-pagament"
              type="date"
              value={dataLimitPagament}
              onChange={(e) => setDataLimitPagament(e.target.value)}
              required={requereixPagament}
            />
          </div>
        )}
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
          style={{
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: estatEnviament === 'enviat' ? 'var(--color-success)' : undefined,
          }}
        >
          {estatEnviament === 'enviant' && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {estatEnviament === 'enviat' && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
          {estatEnviament === 'enviant' ? 'Enviant...' : estatEnviament === 'enviat' ? 'Enviat!' : 'Proposar sortida'}
        </button>
      </div>
    </form>
  )
}
