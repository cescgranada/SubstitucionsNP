'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MOTIUS: Record<string, string> = {
  medic: 'Mèdic',
  dia_personal: 'Dia personal',
  formacio: 'Formació',
}

interface Props {
  data: string
  substitucions: any[]
  avui: string
}

export default function FullSubstitucions({ data: dataInicial, substitucions: subsInicials, avui }: Props) {
  const router = useRouter()
  const [data, setData] = useState(dataInicial)

  const handleCanviData = (novaData: string) => {
    setData(novaData)
    router.push(`/substitucions/full?data=${novaData}`)
  }

  const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('ca-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Agrupa per docent absent
  const perDocentAbsent = subsInicials.reduce((acc: Record<string, any>, s: any) => {
    const nom = s.absencia?.docent?.nom ?? '—'
    if (!acc[nom]) acc[nom] = { motiu: s.absencia?.motiu, subs: [] }
    acc[nom].subs.push(s)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Capçalera amb selector de data */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <a href="/substitucions" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            ← Substitucions
          </a>
          <h1 className="text-xl font-semibold mt-1" style={{ color: 'var(--color-primary)' }}>
            Full de substitucions
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={data}
            onChange={e => handleCanviData(e.target.value)}
            className="text-sm rounded-lg border px-3 py-2"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              backgroundColor: 'white',
              minHeight: 'auto',
            }}
          />
          <button
            onClick={() => window.print()}
            className="btn-secondary text-sm px-4 py-2"
            style={{ minHeight: '36px' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
            Imprimir
          </button>
        </div>
      </div>

      {/* Data */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Escola Cooperativa Nou Patufet</p>
        <p className="text-lg font-semibold capitalize mt-0.5">{dataFormatada}</p>
        {data === avui && (
          <p className="text-xs opacity-70 mt-0.5">Avui</p>
        )}
      </div>

      {subsInicials.length === 0 ? (
        <div className="card text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm">Cap substitució per a aquest dia.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Resum numèric */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{subsInicials.length}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Total</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                {subsInicials.filter(s => s.estat === 'confirmada').length}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Confirmades</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--color-warning)' }}>
                {subsInicials.filter(s => s.estat !== 'confirmada').length}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Pendents</p>
            </div>
          </div>

          {/* Taula de substitucions */}
          <div className="card overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Franja', 'Grup / Matèria', 'Aula', 'Docent absent', 'Motiu', 'Substitut/a', 'Estat'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subsInicials.map((s: any, i: number) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: i % 2 === 0 ? 'white' : 'var(--color-bg)',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 500, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                      {s.horari_setmanal?.franja?.hora_inici?.slice(0, 5)}–{s.horari_setmanal?.franja?.hora_fi?.slice(0, 5)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text)' }}>
                      <span className="font-medium">{s.horari_setmanal?.grup?.nom ?? '—'}</span>
                      {s.horari_setmanal?.materia && (
                        <span style={{ color: 'var(--color-text-secondary)', marginLeft: '4px' }}>
                          · {s.horari_setmanal.materia}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                      {s.horari_setmanal?.aula ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text)', fontWeight: 500 }}>
                      {s.absencia?.docent?.nom ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                      {MOTIUS[s.absencia?.motiu] ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {s.substitut?.nom ? (
                        <span className="font-medium" style={{ color: s.estat === 'confirmada' ? 'var(--color-success)' : 'var(--color-accent)' }}>
                          {s.substitut.nom}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-warning)', fontStyle: 'italic' }}>Pendent</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge badge-${s.estat}`} style={{ fontSize: '11px' }}>
                        {s.estat === 'confirmada' ? 'Confirmada' : s.estat === 'proposta_ia' ? 'Proposta' : 'Pendent'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Secció feina per substituts */}
          {subsInicials.some(s => s.feina_substitut) && (
            <div className="card space-y-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Feina deixada pels docents absents
              </h2>
              {subsInicials
                .filter(s => s.feina_substitut)
                .map((s: any) => (
                  <div key={s.id} className="text-sm">
                    <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                      {s.horari_setmanal?.franja?.hora_inici?.slice(0, 5)}–{s.horari_setmanal?.franja?.hora_fi?.slice(0, 5)}
                      {' · '}{s.horari_setmanal?.grup?.nom}
                      {' · '}{s.absencia?.docent?.nom}
                    </p>
                    <p className="mt-0.5 italic" style={{ color: 'var(--color-text-secondary)' }}>
                      {s.feina_substitut}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media print {
          nav, aside, a[href="/substitucions"], button, input[type="date"] { display: none !important; }
          body { background: white !important; }
          .card { box-shadow: none !important; border: 1px solid #D8E3E8 !important; }
        }
      `}</style>
    </div>
  )
}
