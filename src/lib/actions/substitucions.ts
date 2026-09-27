'use server'

import { createClient } from '@/lib/supabase/server'
import { enviarNotificacioSubstitut } from '@/lib/email'
import { esEquipDirectiu } from '@/lib/roles'

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

  // Verifica que qui confirma és de l'equip directiu
  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', params.docentGestorId)

  if (!esEquipDirectiu(rols)) return { ok: false, error: 'Sense permís per confirmar substitucions' }

  const { data: actual } = await supabase
    .from('substitucions')
    .select('estat')
    .eq('id', params.substitucioId)
    .single()

  if (!actual) return { ok: false, error: 'Substitució no trobada' }
  if (actual.estat === 'eliminada') return { ok: false, error: 'Aquesta substitució ha estat eliminada' }

  // Actualitza la substitució. La validació final i l'assignació real
  // del substitut sempre la fa, manualment, un membre de l'equip directiu
  // (verificat més amunt) — queda registrat qui i quan.
  const { error } = await supabase
    .from('substitucions')
    .update({
      substitut_id: params.substitutId,
      estat: 'confirmada',
      confirmat_per: params.docentGestorId,
      confirmat_at: new Date().toISOString(),
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
 * Marca una franja com que no necessita substitut ("No cal substitució").
 * Igual que confirmarSubstitucio, és una decisió manual reservada a
 * l'equip directiu, i queda registrat qui l'ha presa i quan.
 */
export async function marcarSenseSubstitucio(
  substitucioId: string,
  docentGestorId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docentGestorId)

  if (!esEquipDirectiu(rols)) return { ok: false, error: 'Sense permís per fer aquest canvi' }

  const { data: actual } = await supabase
    .from('substitucions')
    .select('estat')
    .eq('id', substitucioId)
    .single()

  if (!actual) return { ok: false, error: 'Substitució no trobada' }
  if (actual.estat === 'eliminada') return { ok: false, error: 'Aquesta substitució ha estat eliminada' }

  const { error } = await supabase
    .from('substitucions')
    .update({
      estat: 'no_cal',
      substitut_id: null,
      confirmat_per: docentGestorId,
      confirmat_at: new Date().toISOString(),
    })
    .eq('id', substitucioId)

  if (error) return { ok: false, error: error.message }

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
