'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmarBloc, actualitzarFeinaSubstitut, marcarSenseSubstitucio } from '@/lib/actions/substitucions'
import { nomAbsent } from '@/lib/substitucions-blocs'
import { MOTIUS, TIPUS_HORARI, ESTAT_SUBSTITUCIO as TEXT_ESTAT } from '@/lib/etiquetes'

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleDateString('ca-ES', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export type BlocInfo = {
  ids: string[]
  franges: { id: string; horaInici: string; horaFi: string; substitutId: string | null }[]
  horaInici: string
  horaFi: string
  feina: string
  substituts: string[]
}

export type DocentOpcio = {
  id: string
  nom: string
  /** Té guàrdia/permanència/HNL a totes les franges i és de l'etapa */
  prioritari: boolean
  /** Per franja: què fa i si no pot substituir (sortida o altra substitució) */
  franges: Record<string, { text: string; bloquejat: boolean; avis: boolean }>
}

interface Props {
  substitucio: any
  bloc: BlocInfo
  docents: DocentOpcio[]
  docentActualId: string
  esGestor: boolean
  esDocentAbsent: boolean
}

function hora(h: string) {
  return h.slice(0, 5)
}

export default function SubstitucioDetall({
  substitucio,
  bloc,
  docents,
  docentActualId,
  esGestor,
  esDocentAbsent,
}: Props) {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [substitutSeleccionat, setSubstitutSeleccionat] = useState<string>(
    bloc.franges[0]?.substitutId ?? ''
  )
  const [dividir, setDividir] = useState(false)
  const [perFranja, setPerFranja] = useState<Record<string, string>>(
    Object.fromEntries(bloc.franges.map(f => [f.id, f.substitutId ?? '']))
  )
  const [mostrarAltres, setMostrarAltres] = useState(false)
  const [cerca, setCerca] = useState('')
  const [feina, setFeina] = useState(bloc.feina)
  const [editantFeina, setEditantFeina] = useState(false)
  const [feinaDraft, setFeinaDraft] = useState(bloc.feina)

  const esSubs = substitucio.substitut?.id === docentActualId || bloc.franges.some(f => f.substitutId === docentActualId)

  const opcioDocent = (d: DocentOpcio) => {
    const franges = Object.values(d.franges)
    const bloquejat = franges.some(f => f.bloquejat)
    const avis = franges.some(f => f.avis)
    const text = Array.from(new Set(franges.map(f => f.text))).join(' · ')
    return { bloquejat, avis, text }
  }

  const assignacions = bloc.franges.map(f => ({
    substitucioId: f.id,
    substitutId: dividir ? perFranja[f.id] : substitutSeleccionat,
  }))
  const potConfirmar = assignacions.every(a => !!a.substitutId)

  const handleConfirmar = async () => {
    if (!potConfirmar) return
    setLoading(true)
    setErrorMsg('')
    const result = await confirmarBloc({ assignacions, feinaSubstitut: feina || undefined })
    if (!result.ok) {
      setErrorMsg(result.error ?? 'Error inesperat')
      setLoading(false)
      return
    }
    router.push('/substitucions')
    router.refresh()
  }

  const handleSenseSubstitucio = async () => {
    setLoading(true)
    setErrorMsg('')
    const result = await marcarSenseSubstitucio(bloc.ids)
    if (!result.ok) {
      setErrorMsg(result.error ?? 'Error inesperat')
      setLoading(false)
      return
    }
    router.push('/substitucions')
    router.refresh()
  }

  const handleDesarFeina = async () => {
    setLoading(true)
    setErrorMsg('')
    const result = await actualitzarFeinaSubstitut({
      substitucioIds: bloc.ids,
      feina: feinaDraft,
      docentAbsentId: docentActualId,
    })
    if (!result.ok) {
      setErrorMsg(result.error ?? 'Error inesperat')
      setLoading(false)
      return
    }
    setFeina(feinaDraft)
    setEditantFeina(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <a href="/substitucions" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          ← Substitucions
        </a>
      </div>

      {/* Capçalera */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--color-primary)' }}>
              {nomAbsent(substitucio) ?? 'Substitució'}
            </h1>
            {(substitucio.horari_setmanal?.materia || substitucio.horari_setmanal?.grup?.nom) && (
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>
                {[substitucio.horari_setmanal?.materia, substitucio.horari_setmanal?.grup?.nom].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {new Date(substitucio.data).toLocaleDateString('ca-ES', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <span className={`badge badge-${substitucio.estat}`}>
            {TEXT_ESTAT[substitucio.estat] ?? substitucio.estat}
          </span>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt style={{ color: 'var(--color-text-secondary)' }}>Franja</dt>
            <dd className="font-medium">
              {hora(bloc.horaInici)}–{hora(bloc.horaFi)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: 'var(--color-text-secondary)' }}>Tipus</dt>
            <dd className="font-medium">
              {TIPUS_HORARI[substitucio.horari_setmanal?.tipus] ?? substitucio.horari_setmanal?.tipus}
            </dd>
          </div>
          {substitucio.horari_setmanal?.grup?.nom && (
            <div className="flex justify-between">
              <dt style={{ color: 'var(--color-text-secondary)' }}>Grup</dt>
              <dd className="font-medium">{substitucio.horari_setmanal.grup.nom}</dd>
            </div>
          )}
          {substitucio.horari_setmanal?.materia && (
            <div className="flex justify-between">
              <dt style={{ color: 'var(--color-text-secondary)' }}>Matèria</dt>
              <dd className="font-medium">{substitucio.horari_setmanal.materia}</dd>
            </div>
          )}
          {substitucio.horari_setmanal?.aula && (
            <div className="flex justify-between">
              <dt style={{ color: 'var(--color-text-secondary)' }}>Aula</dt>
              <dd className="font-medium">{substitucio.horari_setmanal.aula}</dd>
            </div>
          )}
          {substitucio.absencia?.motiu && (
            <div className="flex justify-between">
              <dt style={{ color: 'var(--color-text-secondary)' }}>Motiu absència</dt>
              <dd className="font-medium">{MOTIUS[substitucio.absencia.motiu]}</dd>
            </div>
          )}
          {substitucio.motiu_proposta_ia && (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}
            >
              💡 {substitucio.motiu_proposta_ia}
            </div>
          )}
          {substitucio.horari_setmanal?.parella_docent?.nom && (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}
            >
              {substitucio.horari_setmanal.tipus_parella === 'codocencia'
                ? `Codocència amb ${substitucio.horari_setmanal.parella_docent.nom} — pot cobrir la classe.`
                : `Desdoblament amb ${substitucio.horari_setmanal.parella_docent.nom}.`}
            </div>
          )}
        </dl>
      </div>

      {/* Feina per al substitut */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Feina per al substitut/a
          </h2>
          {esDocentAbsent && !editantFeina && ['pendent', 'proposta_ia'].includes(substitucio.estat) && (
            <button
              onClick={() => { setFeinaDraft(feina); setEditantFeina(true) }}
              className="text-xs font-medium"
              style={{ color: 'var(--color-accent)' }}
            >
              {feina ? 'Editar' : '+ Afegir'}
            </button>
          )}
        </div>

        {editantFeina ? (
          <div className="space-y-3">
            <textarea
              rows={4}
              value={feinaDraft}
              onChange={(e) => setFeinaDraft(e.target.value)}
              placeholder="Descriu la feina que han de fer els alumnes..."
              style={{ minHeight: 'auto', resize: 'none' }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditantFeina(false)}
                className="btn-secondary flex-1 text-sm"
                style={{ padding: '8px 16px', minHeight: '36px' }}
              >
                Cancel·lar
              </button>
              <button
                onClick={handleDesarFeina}
                disabled={loading}
                className="btn-primary flex-1 text-sm"
                style={{ padding: '8px 16px', minHeight: '36px' }}
              >
                {loading ? 'Desant...' : 'Desar'}
              </button>
            </div>
          </div>
        ) : feina ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {feina}
          </p>
        ) : (
          <p className="text-sm italic" style={{ color: 'var(--color-text-secondary)' }}>
            {esDocentAbsent
              ? 'Afegeix les instruccions per al substitut.'
              : "Encara no s'ha deixat feina."}
          </p>
        )}
      </div>

      {/* Gestió: assignar substitut */}
      {esGestor && substitucio.estat !== 'eliminada' && (
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {['pendent', 'proposta_ia'].includes(substitucio.estat) ? 'Assignar substitut/a' : 'Canviar substitut/a'}
          </h2>
          {bloc.franges.length > 1 && (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Aquesta classe ocupa {bloc.franges.length} franges seguides ({hora(bloc.horaInici)}–{hora(bloc.horaFi)}).
              Per defecte les cobreix una sola persona.
            </p>
          )}

          {!dividir ? (
            <div className="space-y-3">
              {docents.some(d => d.prioritari) ? (
                <>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Candidats disponibles{bloc.franges.length > 1 ? ' tot el bloc' : ' en aquesta franja'}:
                  </p>
                  <div className="space-y-2">
                    {docents.filter(d => d.prioritari).map(d => (
                      <BotoDocent
                        key={d.id}
                        nom={d.nom}
                        text={opcioDocent(d).text}
                        seleccionat={substitutSeleccionat === d.id}
                        onClick={() => setSubstitutSeleccionat(d.id)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  No hi ha candidats prioritaris disponibles{bloc.franges.length > 1 ? ' durant tot el bloc' : ' en aquesta franja'}.
                </p>
              )}

              <button
                type="button"
                onClick={() => setMostrarAltres(v => !v)}
                className="text-sm font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                {mostrarAltres ? '− Amagar la resta de docents' : '+ Triar un altre docent (falta gent)'}
              </button>
              {mostrarAltres && (
                <>
                  <input
                    type="search"
                    value={cerca}
                    onChange={(e) => setCerca(e.target.value)}
                    placeholder="Cerca per nom..."
                  />
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {docents
                      .filter(d => !d.prioritari && d.nom.toLowerCase().includes(cerca.toLowerCase()))
                      .sort((a, b) => Number(opcioDocent(a).bloquejat) - Number(opcioDocent(b).bloquejat))
                      .map(d => {
                        const o = opcioDocent(d)
                        return (
                          <BotoDocent
                            key={d.id}
                            nom={d.nom}
                            text={o.text}
                            avis={o.avis}
                            bloquejat={o.bloquejat}
                            seleccionat={substitutSeleccionat === d.id}
                            onClick={() => setSubstitutSeleccionat(d.id)}
                          />
                        )
                      })}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    En vermell, docents que tenen classe o reunió. Els que són de sortida o ja substitueixen algú
                    en aquest tram no es poden triar.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Tria qui cobreix cada franja:
              </p>
              {bloc.franges.map(f => (
                <div key={f.id} className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    {hora(f.horaInici)}–{hora(f.horaFi)}
                  </label>
                  <select
                    value={perFranja[f.id] ?? ''}
                    onChange={(e) => setPerFranja(p => ({ ...p, [f.id]: e.target.value }))}
                  >
                    <option value="">— Tria un docent —</option>
                    {[...docents]
                      .sort((a, b) =>
                        Number(!!a.franges[f.id]?.bloquejat) - Number(!!b.franges[f.id]?.bloquejat)
                        || a.nom.localeCompare(b.nom))
                      .map(d => {
                        const info = d.franges[f.id]
                        return (
                          <option key={d.id} value={d.id} disabled={info?.bloquejat}>
                            {d.nom} — {info?.text}
                          </option>
                        )
                      })}
                  </select>
                </div>
              ))}
            </div>
          )}

          {bloc.franges.length > 1 && (
            <button
              type="button"
              onClick={() => setDividir(v => !v)}
              className="text-sm font-medium block"
              style={{ color: 'var(--color-accent)' }}
            >
              {dividir ? '← Una sola persona per a tot el bloc' : 'Dividir entre diverses persones'}
            </button>
          )}

          {errorMsg && (
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
            >
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleConfirmar}
            disabled={!potConfirmar || loading}
            className="btn-primary w-full"
          >
            {loading ? 'Desant...' : ['pendent', 'proposta_ia'].includes(substitucio.estat) ? 'Confirmar substitució' : 'Desar el canvi'}
          </button>

          {substitucio.estat !== 'no_cal' && (
          <button
            onClick={handleSenseSubstitucio}
            disabled={loading}
            className="text-sm font-medium w-full text-center"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            No cal substitut/a per a aquesta {bloc.franges.length > 1 ? 'classe' : 'franja'}
          </button>
          )}
        </div>
      )}

      {/* Decisió: no calia substitut */}
      {substitucio.estat === 'no_cal' && (
        <div className="card text-sm" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
          <p className="font-medium">No calia substitut/a per a aquesta franja.</p>
          {substitucio.confirmador && (
            <p className="text-xs mt-1">
              Decidit per {substitucio.confirmador.nom}
              {substitucio.confirmat_at && ` · ${formatDataHora(substitucio.confirmat_at)}`}
            </p>
          )}
        </div>
      )}

      {/* Substitut confirmat */}
      {substitucio.estat === 'confirmada' && bloc.substituts.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Substitut/a confirmat/da
          </h2>
          <p className="font-medium" style={{ color: 'var(--color-success)' }}>
            {bloc.substituts.join(' · ')}
          </p>
          {substitucio.confirmador && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Confirmat per {substitucio.confirmador.nom}
              {substitucio.confirmat_at && ` · ${formatDataHora(substitucio.confirmat_at)}`}
            </p>
          )}
        </div>
      )}

      {esSubs && (
        <div
          className="card text-sm"
          style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}
        >
          Ets el substitut/a assignat/da per a aquesta classe.
        </div>
      )}

      {substitucio.estat === 'eliminada' && (
        <div className="card text-sm" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
          Aquesta substitució es va eliminar
          {substitucio.eliminador?.nom && ` (${substitucio.eliminador.nom}`}
          {substitucio.eliminada_at && `, ${formatDataHora(substitucio.eliminada_at)}`}
          {substitucio.eliminador?.nom && ')'}
          .
        </div>
      )}
    </div>
  )
}

function BotoDocent({
  nom, text, seleccionat, onClick, avis = false, bloquejat = false,
}: {
  nom: string
  text: string
  seleccionat: boolean
  onClick: () => void
  avis?: boolean
  bloquejat?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={bloquejat}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm transition-colors"
      style={{
        borderColor: seleccionat ? 'var(--color-primary)' : 'var(--color-border)',
        backgroundColor: bloquejat ? '#F3F4F6' : seleccionat ? 'var(--color-primary-light)' : 'white',
        color: 'var(--color-text)',
        opacity: bloquejat ? 0.75 : 1,
        cursor: bloquejat ? 'not-allowed' : 'pointer',
      }}
    >
      <span className="font-medium text-left">{nom}</span>
      <span
        className="text-xs text-right"
        style={{ color: bloquejat || avis ? '#991B1B' : 'var(--color-text-secondary)' }}
      >
        {text}
      </span>
    </button>
  )
}
