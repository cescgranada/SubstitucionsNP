'use client'

import { useRouter } from 'next/navigation'

interface Props {
  docents: { id: string; nom: string }[]
  seleccionat: string
  propiId: string
}

/** Desplegable perquè l'equip directiu consulti l'horari de qualsevol docent. */
export default function SelectorDocent({ docents, seleccionat, propiId }: Props) {
  const router = useRouter()

  return (
    <div className="max-w-sm">
      <label htmlFor="selector-horari" className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        Horari de
      </label>
      <select
        id="selector-horari"
        value={seleccionat}
        onChange={(e) => router.push(e.target.value === propiId ? '/horari' : `/horari?docent=${e.target.value}`)}
      >
        <option value={propiId}>El meu horari</option>
        {docents.filter(d => d.id !== propiId).map(d => (
          <option key={d.id} value={d.id}>{d.nom}</option>
        ))}
      </select>
    </div>
  )
}
