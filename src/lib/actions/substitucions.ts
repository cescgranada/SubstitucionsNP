'use server'

import { createClient } from '@/lib/supabase/server'
import { enviarNotificacioSubstitut } from '@/lib/email'
import { esEquipDirectiu } from '@/lib/roles'

type Supabase = Awaited<ReturnType<typeof createClient>>

/** Id del docent que té la sessió iniciada (per correu), o null. */
async function docentActualId(supabase: Supabase): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data } = await supabase.from('docents').select('id').eq('email', user.email).single()
  return data?.id ?? null
}

/**
 * Comprova que l'usuari amb sessió és de l'equip directiu. L'actor es
 * dedueix de la sessió, mai d'un paràmetre rebut del client.
 */
async function gestorActual(supabase: Supabase): Promise<{ id: string } | { error: string }> {
  const id = await docentActualId(supabase)
  if (!id) return { error: 'Sessió no vàlida' }
  const { data: rols } = await supabase.from('docent_rols').select('rol').eq('docent_id', id)
  if (!esEquipDirectiu(rols)) return { error: 'Sense permís per gestionar substitucions' }
  return { id }
}

/**
 * Confirma una o diverses franges (un bloc), assigna el substitut de cada
 * una i envia un correu a cada substitut amb el tram que cobreix.
 * Per defecte tot el bloc té el mateix substitut; només si cal que el cobreixin
 * persones diferents s'envien assignacions diferents.
 */
export async function confirmarBloc(params: {
  assignacions: { substitucioId: string; substitutId: string }[]
  feinaSubstitut?: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const gestor = await gestorActual(supabase)
  if ('error' in gestor) return { ok: false, error: gestor.error }
  if (params.assignacions.length === 0) return { ok: false, error: 'Cap franja per confirmar' }

  const ids = params.assignacions.map(a => a.substitucioId)
  const { data: actuals } = await supabase
    .from('substitucions')
    .select('id, estat, absencia:absencia_id(docent_id)')
    .in('id', ids)

  if (!actuals || actuals.length !== ids.length) return { ok: false, error: 'Substitució no trobada' }
  for (const a of actuals as any[]) {
    if (a.estat === 'eliminada') return { ok: false, error: 'Aquesta substitució ha estat eliminada' }
  }
  for (const a of params.assignacions) {
    const actual = (actuals as any[]).find(x => x.id === a.substitucioId)
    if (actual?.absencia?.docent_id === a.substitutId) {
      return { ok: false, error: 'El docent absent no pot ser el seu propi substitut' }
    }
  }

  // La validació final i l'assignació real la fa, manualment, un membre de
  // l'equip directiu — queda registrat qui i quan.
  const ara = new Date().toISOString()
  for (const a of params.assignacions) {
    const { data: actualitzades, error } = await supabase
      .from('substitucions')
      .update({
        substitut_id: a.substitutId,
        estat: 'confirmada',
        confirmat_per: gestor.id,
        confirmat_at: ara,
        feina_substitut: params.feinaSubstitut || null,
      })
      .eq('id', a.substitucioId)
      .select('id')

    if (error) return { ok: false, error: error.message }
    if (!actualitzades || actualitzades.length === 0) {
      return { ok: false, error: "No s'ha pogut desar la confirmació (sense permís)" }
    }
  }

  // Un correu per substitut, amb el tram complet que cobreix
  const { data: files } = await supabase
    .from('substitucions')
    .select(`
      id, substitut_id, data, feina_substitut,
      horari_setmanal:horari_setmanal_id(
        materia, aula,
        franja:franja_id(hora_inici, hora_fi),
        grup:grup_id(nom)
      ),
      absencia:absencia_id(docent:docent_id(nom))
    `)
    .in('id', ids)

  const perSubstitut = new Map<string, any[]>()
  for (const f of (files ?? []) as any[]) {
    if (!f.substitut_id) continue
    perSubstitut.set(f.substitut_id, [...(perSubstitut.get(f.substitut_id) ?? []), f])
  }

  for (const [substitutId, franges] of perSubstitut) {
    const { data: substitut } = await supabase
      .from('docents')
      .select('nom, email')
      .eq('id', substitutId)
      .single()
    if (!substitut?.email) continue

    const inicis = franges.map(f => f.horari_setmanal?.franja?.hora_inici ?? '').sort()
    const fins = franges.map(f => f.horari_setmanal?.franja?.hora_fi ?? '').sort()
    const h = franges[0].horari_setmanal
    enviarNotificacioSubstitut({
      emailSubstitut: substitut.email,
      nomSubstitut: substitut.nom,
      nomDocentAbsent: franges[0].absencia?.docent?.nom ?? '',
      data: franges[0].data,
      horaInici: inicis[0] ?? '',
      horaFi: fins[fins.length - 1] ?? '',
      grup: h?.grup?.nom,
      materia: h?.materia ?? undefined,
      aula: h?.aula ?? undefined,
      feinaSubstitut: franges[0].feina_substitut ?? undefined,
    }).catch(console.error)
  }

  return { ok: true }
}

/**
 * Marca una o diverses franges com que no necessiten substitut ("No cal
 * substitució"). Decisió manual reservada a l'equip directiu; queda
 * registrat qui l'ha presa i quan.
 */
export async function marcarSenseSubstitucio(
  substitucioIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const gestor = await gestorActual(supabase)
  if ('error' in gestor) return { ok: false, error: gestor.error }
  if (substitucioIds.length === 0) return { ok: false, error: 'Cap franja per marcar' }

  const { data: actuals } = await supabase
    .from('substitucions')
    .select('id, estat')
    .in('id', substitucioIds)

  if (!actuals || actuals.length !== substitucioIds.length) return { ok: false, error: 'Substitució no trobada' }
  if ((actuals as any[]).some(a => a.estat === 'eliminada')) {
    return { ok: false, error: 'Aquesta substitució ha estat eliminada' }
  }

  const { data: actualitzades, error } = await supabase
    .from('substitucions')
    .update({
      estat: 'no_cal',
      substitut_id: null,
      confirmat_per: gestor.id,
      confirmat_at: new Date().toISOString(),
    })
    .in('id', substitucioIds)
    .select('id')

  if (error) return { ok: false, error: error.message }
  if (!actualitzades || actualitzades.length !== substitucioIds.length) {
    return { ok: false, error: "No s'ha pogut desar el canvi (sense permís)" }
  }

  return { ok: true }
}

/**
 * Actualitza la feina per al substitut de totes les franges d'un bloc. Si el
 * substitut ja està assignat, li envia un email amb la feina actualitzada.
 */
export async function actualitzarFeinaSubstitut(params: {
  substitucioIds: string[]
  feina: string
  docentAbsentId: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  if (params.substitucioIds.length === 0) return { ok: false, error: 'Substitució no trobada' }

  // Verifica que qui actualitza és el docent absent
  const { data: franges } = await supabase
    .from('substitucions')
    .select(`
      id, substitut_id, data, feina_substitut,
      horari_setmanal:horari_setmanal_id(
        materia, aula,
        franja:franja_id(hora_inici, hora_fi),
        grup:grup_id(nom)
      ),
      absencia:absencia_id(
        docent_id, docent:docent_id(nom)
      )
    `)
    .in('id', params.substitucioIds)

  if (!franges || franges.length !== params.substitucioIds.length) {
    return { ok: false, error: 'Substitució no trobada' }
  }

  const actorId = await docentActualId(supabase)
  for (const s of franges as any[]) {
    const docentAbsentIdReal = s.absencia?.docent_id
    if (docentAbsentIdReal && (docentAbsentIdReal !== actorId || docentAbsentIdReal !== params.docentAbsentId)) {
      return { ok: false, error: 'Sense permís per modificar aquesta feina' }
    }
  }

  const { error } = await supabase
    .from('substitucions')
    .update({ feina_substitut: params.feina || null })
    .in('id', params.substitucioIds)

  if (error) return { ok: false, error: error.message }

  // Notifica cada substitut ja assignat (un correu per persona)
  const perSubstitut = new Map<string, any[]>()
  for (const s of franges as any[]) {
    if (!s.substitut_id) continue
    perSubstitut.set(s.substitut_id, [...(perSubstitut.get(s.substitut_id) ?? []), s])
  }

  for (const [substitutId, fs] of perSubstitut) {
    const { data: substitut } = await supabase
      .from('docents')
      .select('nom, email')
      .eq('id', substitutId)
      .single()
    if (!substitut?.email) continue

    const inicis = fs.map(f => f.horari_setmanal?.franja?.hora_inici ?? '').sort()
    const fins = fs.map(f => f.horari_setmanal?.franja?.hora_fi ?? '').sort()
    const h = fs[0].horari_setmanal
    enviarNotificacioSubstitut({
      emailSubstitut: substitut.email,
      nomSubstitut: substitut.nom,
      nomDocentAbsent: fs[0].absencia?.docent?.nom ?? '',
      data: fs[0].data,
      horaInici: inicis[0] ?? '',
      horaFi: fins[fins.length - 1] ?? '',
      grup: h?.grup?.nom,
      materia: h?.materia ?? undefined,
      aula: h?.aula ?? undefined,
      feinaSubstitut: params.feina || undefined,
    }).catch(console.error)
  }

  return { ok: true }
}
