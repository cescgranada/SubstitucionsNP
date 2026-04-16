'use server'

import { createClient } from '@/lib/supabase/server'
import { enviarNotificacioSubstitut } from '@/lib/email'

/**
 * Confirma una substitució, assigna el substitut i envia email de notificació.
 */
export async function confirmarSubstitucio(params: {
  substitucioId: string
  substitutId: string
  feinaSubstitut?: string
  docentGestorId: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica que qui confirma és gestor
  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', params.docentGestorId)

  const esGestor = rols?.some(r =>
    ['cap_personal', 'director', 'sotsdirector', 'coordinacio_etapa'].includes(r.rol)
  )
  if (!esGestor) return { ok: false, error: 'Sense permís per confirmar substitucions' }

  // Actualitza la substitució
  const { error } = await supabase
    .from('substitucions')
    .update({
      substitut_id: params.substitutId,
      estat: 'confirmada',
      confirmat_per: params.docentGestorId,
      feina_substitut: params.feinaSubstitut || null,
    })
    .eq('id', params.substitucioId)

  if (error) return { ok: false, error: error.message }

  // Carrega dades per al correu
  const { data: substitucio } = await supabase
    .from('substitucions')
    .select(`
      data, feina_substitut,
      horari_setmanal:horari_setmanal_id(
        materia, aula,
        franja:franja_id(hora_inici, hora_fi),
        grup:grup_id(nom)
      ),
      absencia:absencia_id(
        docent:docent_id(nom)
      )
    `)
    .eq('id', params.substitucioId)
    .single()

  const { data: substitut } = await supabase
    .from('docents')
    .select('nom, email')
    .eq('id', params.substitutId)
    .single()

  if (substitut?.email && substitucio) {
    const h = substitucio.horari_setmanal as any
    enviarNotificacioSubstitut({
      emailSubstitut: substitut.email,
      nomSubstitut: substitut.nom,
      nomDocentAbsent: (substitucio.absencia as any)?.docent?.nom ?? '',
      data: substitucio.data,
      horaInici: h?.franja?.hora_inici ?? '',
      horaFi: h?.franja?.hora_fi ?? '',
      grup: h?.grup?.nom,
      materia: h?.materia ?? undefined,
      aula: h?.aula ?? undefined,
      feinaSubstitut: substitucio.feina_substitut ?? undefined,
    }).catch(console.error)
  }

  return { ok: true }
}

/**
 * Actualitza la feina per al substitut. Si el substitut ja està assignat,
 * li envia un email amb la feina actualitzada.
 */
export async function actualitzarFeinaSubstitut(params: {
  substitucioId: string
  feina: string
  docentAbsentId: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica que qui actualitza és el docent absent
  const { data: substitucio } = await supabase
    .from('substitucions')
    .select(`
      substitut_id, data, feina_substitut,
      horari_setmanal:horari_setmanal_id(
        materia, aula,
        franja:franja_id(hora_inici, hora_fi),
        grup:grup_id(nom)
      ),
      absencia:absencia_id(
        docent_id, docent:docent_id(nom)
      )
    `)
    .eq('id', params.substitucioId)
    .single()

  if (!substitucio) return { ok: false, error: 'Substitució no trobada' }

  const docentAbsentIdReal = (substitucio.absencia as any)?.docent_id
  if (docentAbsentIdReal && docentAbsentIdReal !== params.docentAbsentId) {
    return { ok: false, error: 'Sense permís per modificar aquesta feina' }
  }

  const { error } = await supabase
    .from('substitucions')
    .update({ feina_substitut: params.feina || null })
    .eq('id', params.substitucioId)

  if (error) return { ok: false, error: error.message }

  // Notifica el substitut si ja està assignat
  if (substitucio.substitut_id) {
    const { data: substitut } = await supabase
      .from('docents')
      .select('nom, email')
      .eq('id', substitucio.substitut_id)
      .single()

    if (substitut?.email) {
      const h = substitucio.horari_setmanal as any
      enviarNotificacioSubstitut({
        emailSubstitut: substitut.email,
        nomSubstitut: substitut.nom,
        nomDocentAbsent: (substitucio.absencia as any)?.docent?.nom ?? '',
        data: substitucio.data,
        horaInici: h?.franja?.hora_inici ?? '',
        horaFi: h?.franja?.hora_fi ?? '',
        grup: h?.grup?.nom,
        materia: h?.materia ?? undefined,
        aula: h?.aula ?? undefined,
        feinaSubstitut: params.feina || undefined,
      }).catch(console.error)
    }
  }

  return { ok: true }
}
