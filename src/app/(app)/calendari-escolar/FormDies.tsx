'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { afegirDiesSenseClasse, eliminarDiaSenseClasse } from '@/lib/actions/calendari-escolar'

export const TIPUS_DIA: Record<string, string> = {
  festiu: 'Festiu oficial',
  festa_local: 'Festa local',
  vacances: 'Vacances',
  no_lectiu: 'Dia no lectiu',
  fora_de_curs: 'Fora de curs',
}

export function FormAfegirDies() {
  const router = useRouter()
  const [des, setDes] = useState('')
  const [fins, setFins] = useState('')
  const [tipus, setTipus] = useState('festiu')
  const [descripcio, setDescripcio] = useState('')
  const [loading, setLoading] = useState(false)
  const [missatge, setMissatge] = useState<{ text: string; error: boolean } | null>(null)

  const afegir = async () => {
    setLoading(true)
    setMissatge(null)
    const r = await afegirDiesSenseClasse({ des, fins: fins || des, tipus, descripcio })
    setLoading(false)
    if (!r.ok) { setMissatge({ text: r.error ?? 'Error inesperat', error: true }); return }
    setMissatge({ text: `${r.afegits} ${r.afegits === 1 ? 'dia afegit' : 'dies afegits'}`, error: false })
    setDes(''); setFins(''); setDescripcio('')
    router.refresh()
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Afegir dies sense classe</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Des del
          <input type="date" value={des} onChange={e => setDes(e.target.value)} className="block mt-1 w-full" />
        </label>
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Fins al (opcional)
          <input type="date" value={fins} min={des} onChange={e => setFins(e.target.value)} className="block mt-1 w-full" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Tipus
          <select value={tipus} onChange={e => setTipus(e.target.value)} className="block mt-1 w-full">
            {Object.entries(TIPUS_DIA).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Descripció
          <input value={descripcio} onChange={e => setDescripcio(e.target.value)} placeholder="Ex.: Diada" className="block mt-1 w-full" />
        </label>
      </div>
      {missatge && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={missatge.error ? { backgroundColor: '#FEE2E2', color: '#991B1B' } : { backgroundColor: '#DCFCE7', color: '#166534' }}
        >
          {missatge.text}
        </div>
      )}
      <button onClick={afegir} disabled={loading || !des} className="btn-primary w-full text-sm">
        {loading ? 'Desant...' : 'Afegir'}
      </button>
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Només es marquen els dies laborables (dilluns a divendres). No es generen substitucions aquests dies.
      </p>
    </div>
  )
}

export function BotoEliminarDia({ data }: { data: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        await eliminarDiaSenseClasse(data)
        setLoading(false)
        router.refresh()
      }}
      className="text-xs font-medium"
      style={{ color: '#991B1B' }}
      aria-label={`Treure ${data} del calendari`}
    >
      Treure
    </button>
  )
}
