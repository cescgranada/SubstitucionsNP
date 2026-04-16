'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmarSubstitucio, actualitzarFeinaSubstitut } from '@/lib/actions/substitucions'

const MOTIUS: Record<string, string> = {
  medic: 'Mèdic',
  dia_personal: 'Dia personal',
  formacio: 'Formació',
}

const TIPUS_HORARI: Record<string, string> = {
  classe: 'Classe',
  guardia: 'Guàrdia',
  permanencia: 'Permanència',
  reunio: 'Reunió',
  esbarjo: 'Esbarjo',
  hnl: 'Hora no lectiva',
  disponible: 'Disponible',
}

interface Props {
  substitucio: any
  candidats: any[]
  docentActualId: string
  esGestor: boolean
  esDocentAbsent: boolean
}

export default function SubstitucioDetall({
  substitucio,
  candidats,
  docentActualId,
  esGestor,
  esDocentAbsent,
}: Props) {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [substitutSeleccionat, setSubstitutSeleccionat] = useState<string>(
    substitucio.substitut_id ?? ''
  )
  const [feina, setFeina] = useState(substitucio.feina_substitut ?? '')
  const [editantFeina, setEditantFeina] = useState(false)
  const [feinaDraft, setFeinaDraft] = useState(substitucio.feina_substitut ?? '')

  const esSubs = substitucio.substitut?.id === docentActualId

  const handleConfirmar = async () => {
    if (!substitutSeleccionat) return
    setLoading(true)
    setErrorMsg('')
    const result = await confirmarSubstitucio({
      substitucioId: substitucio.id,
      substitutId: substitutSeleccionat,
      feinaSubstitut: feina || undefined,
      docentGestorId: docentActualId,
    })
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
      substitucioId: substitucio.id,
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
              {substitucio.absencia?.docent?.nom ?? 'Substitució'}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {new Date(substitucio.data).toLocaleDateString('ca-ES', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <span className={`badge badge-${substitucio.estat}`}>
            {substitucio.estat === 'pendent'
              ? 'Pendent'
              : substitucio.estat === 'proposta_ia'
              ? 'Proposta'
              : 'Confirmada'}
          </span>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt style={{ color: 'var(--color-text-secondary)' }}>Franja</dt>
            <dd className="font-medium">
              {substitucio.horari_setmanal?.franja?.hora_inici?.slice(0, 5)}–
              {substitucio.horari_setmanal?.franja?.hora_fi?.slice(0, 5)}
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
          {esDocentAbsent && !editantFeina && substitucio.estat !== 'confirmada' && (
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
      {esGestor && substitucio.estat !== 'confirmada' && (
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Assignar substitut/a
          </h2>

          {candidats.length > 0 ? (
            <>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Candidats disponibles en aquesta franja:
              </p>
              <div className="space-y-2">
                {candidats.map((c: any) => (
                  <button
                    key={c.docent_id}
                    type="button"
                    onClick={() => setSubstitutSeleccionat(c.docent_id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors"
                    style={{
                      borderColor:
                        substitutSeleccionat === c.docent_id
                          ? 'var(--color-primary)'
                          : 'var(--color-border)',
                      backgroundColor:
                        substitutSeleccionat === c.docent_id
                          ? 'var(--color-primary-light)'
                          : 'white',
                      color: 'var(--color-text)',
                    }}
                  >
                    <span className="font-medium">{c.docent?.nom}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {TIPUS_HORARI[c.tipus] ?? c.tipus}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              No hi ha candidats prioritaris disponibles en aquesta franja.
            </p>
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
            disabled={!substitutSeleccionat || loading}
            className="btn-primary w-full"
          >
            {loading ? 'Confirmant...' : 'Confirmar substitució'}
          </button>
        </div>
      )}

      {/* Substitut confirmat */}
      {substitucio.estat === 'confirmada' && substitucio.substitut && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Substitut/a confirmat/da
          </h2>
          <p className="font-medium" style={{ color: 'var(--color-success)' }}>
            {substitucio.substitut.nom}
          </p>
          {substitucio.confirmador && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Confirmat per {substitucio.confirmador.nom}
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
    </div>
  )
}
