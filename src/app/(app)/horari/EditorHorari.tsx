'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { desarActivitat, esborrarActivitat } from '@/lib/actions/horari'

const DIES = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

const TIPUS: { valor: string; nom: string }[] = [
  { valor: 'classe', nom: 'Classe' },
  { valor: 'guardia', nom: 'Guàrdia' },
  { valor: 'permanencia', nom: 'Permanència' },
  { valor: 'reunio', nom: 'Reunió' },
  { valor: 'esbarjo', nom: 'Esbarjo' },
  { valor: 'hnl', nom: 'Hora no lectiva' },
  { valor: 'disponible', nom: 'Lliure' },
]

export type ValorsEditor = {
  dia: number
  horaInici: string
  horaFi: string
  tipus: string
  grupId: string
  materia: string
  aula: string
  parellaId: string
  tipusParella: string
  /** Ja hi ha alguna activitat en aquest tram */
  existeix: boolean
}

interface Props {
  docentId: string
  docentNom: string
  franges: { hora_inici: string; hora_fi: string }[]
  grups: { id: string; nom: string }[]
  docents: { id: string; nom: string }[]
  inicial: ValorsEditor
}

const hh = (h: string) => h.slice(0, 5)

export default function EditorHorari({ docentId, docentNom, franges, grups, docents, inicial }: Props) {
  const router = useRouter()
  const [v, setV] = useState<ValorsEditor>(inicial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canvia = (parcial: Partial<ValorsEditor>) => setV(prev => ({ ...prev, ...parcial }))
  const tornar = () => router.push(`/horari?docent=${docentId}&edita=1`)

  const desar = async () => {
    setLoading(true)
    setError('')
    const r = await desarActivitat({
      docentId,
      dia: v.dia,
      horaInici: v.horaInici,
      horaFi: v.horaFi,
      tipus: v.tipus,
      grupId: v.grupId || null,
      materia: v.materia,
      aula: v.aula,
      parellaId: v.parellaId || null,
      tipusParella: v.parellaId ? v.tipusParella || null : null,
    })
    setLoading(false)
    if (!r.ok) { setError(r.error ?? 'Error inesperat'); return }
    tornar()
    router.refresh()
  }

  const esborrar = async () => {
    setLoading(true)
    setError('')
    const r = await esborrarActivitat({ docentId, dia: v.dia, horaInici: v.horaInici, horaFi: v.horaFi })
    setLoading(false)
    if (!r.ok) { setError(r.error ?? 'Error inesperat'); return }
    tornar()
    router.refresh()
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {v.existeix ? 'Canviar activitat' : 'Afegir activitat'} · {docentNom}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          Els canvis valen per a les substitucions que es generin d&apos;ara endavant. Les ja generades no es toquen.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Dia
          <select value={v.dia} onChange={e => canvia({ dia: Number(e.target.value) })} className="block mt-1 w-full">
            {DIES.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Des de
          <select value={v.horaInici} onChange={e => canvia({ horaInici: e.target.value })} className="block mt-1 w-full">
            {franges.map(f => <option key={f.hora_inici + f.hora_fi} value={hh(f.hora_inici)}>{hh(f.hora_inici)}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Fins a
          <select value={v.horaFi} onChange={e => canvia({ horaFi: e.target.value })} className="block mt-1 w-full">
            {franges.map(f => <option key={f.hora_inici + f.hora_fi} value={hh(f.hora_fi)}>{hh(f.hora_fi)}</option>)}
          </select>
        </label>
      </div>

      <label className="block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        Tipus
        <select value={v.tipus} onChange={e => canvia({ tipus: e.target.value })} className="block mt-1 w-full">
          {TIPUS.map(t => <option key={t.valor} value={t.valor}>{t.nom}</option>)}
        </select>
      </label>

      {v.tipus === 'classe' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Grup
              <select value={v.grupId} onChange={e => canvia({ grupId: e.target.value })} className="block mt-1 w-full">
                <option value="">— Sense grup —</option>
                {grups.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Aula
              <input value={v.aula} onChange={e => canvia({ aula: e.target.value })} className="block mt-1 w-full" />
            </label>
          </div>
          <label className="block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Matèria
            <input value={v.materia} onChange={e => canvia({ materia: e.target.value })} className="block mt-1 w-full" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Amb un altre docent
              <select
                value={v.parellaId}
                onChange={e => canvia({ parellaId: e.target.value, tipusParella: e.target.value ? v.tipusParella || 'codocencia' : '' })}
                className="block mt-1 w-full"
              >
                <option value="">— Cap —</option>
                {docents.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            </label>
            {v.parellaId && (
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Tipus
                <select value={v.tipusParella} onChange={e => canvia({ tipusParella: e.target.value })} className="block mt-1 w-full">
                  <option value="codocencia">Codocència</option>
                  <option value="desdoblament">Desdoblament</option>
                </select>
              </label>
            )}
          </div>
          {v.parellaId && (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Cal fer el mateix canvi a l&apos;horari de la parella: no es copia automàticament.
            </p>
          )}
        </>
      )}

      {error && (
        <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={tornar} disabled={loading} className="btn-secondary text-sm" style={{ padding: '8px 16px', minHeight: '36px' }}>
          Cancel·lar
        </button>
        {v.existeix && (
          <button onClick={esborrar} disabled={loading} className="btn-secondary text-sm" style={{ padding: '8px 16px', minHeight: '36px', color: '#991B1B' }}>
            Buidar el tram
          </button>
        )}
        <button onClick={desar} disabled={loading} className="btn-primary text-sm flex-1" style={{ padding: '8px 16px', minHeight: '36px' }}>
          {loading ? 'Desant...' : 'Desar'}
        </button>
      </div>
    </div>
  )
}
