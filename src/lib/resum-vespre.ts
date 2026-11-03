import { createAdminClient } from '@/lib/supabase/admin'
import { agruparBlocs, nomAbsent } from '@/lib/substitucions-blocs'
import {
  correuResumSubstitut,
  correuResumGestio,
  enviarLot,
  type CorreuPreparat,
  type BlocResum,
} from '@/lib/email'

type Admin = ReturnType<typeof createAdminClient>

/** Data d'avui a Madrid (YYYY-MM-DD): el servidor corre en UTC. */
export function avuiMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
}

function sumaDies(data: string, dies: number): string {
  const d = new Date(data + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + dies)
  return d.toISOString().slice(0, 10)
}

/** Pròxim dia lectiu després de `avui` (salta caps de setmana i calendari escolar). */
export async function properDiaLectiu(admin: Admin, avui: string): Promise<string | null> {
  const { data } = await admin
    .from('calendari_escolar')
    .select('data')
    .gt('data', avui)
    .lte('data', sumaDies(avui, 21))
  const noLectius = new Set((data ?? []).map(d => d.data as string))
  for (let i = 1; i <= 21; i++) {
    const d = sumaDies(avui, i)
    const dow = new Date(d + 'T12:00:00Z').getUTCDay()
    if (dow >= 1 && dow <= 5 && !noLectius.has(d)) return d
  }
  return null
}

const SELECT_FILES = `
  id, data, estat, substitut_id, absencia_id, sortida_id, feina_substitut,
  substitut:substitut_id(nom, email, actiu),
  horari_setmanal:horari_setmanal_id(
    docent:docent_id(nom),
    tipus, materia, aula, tipus_parella,
    franja:franja_id(hora_inici, hora_fi),
    grup:grup_id(nom)
  ),
  absencia:absencia_id(docent:docent_id(nom))
`

export type ResultatResum = {
  data: string | null
  motiu?: string
  substituts: number
  gestors: number
  enviats: number
  errors: number
}

/**
 * Prepara (i, si no és una simulació, envia) el resum de la vespra: a cada
 * substitut els seus blocs de l'endemà lectiu, i a l'equip directiu l'estat del dia.
 */
export async function resumVespre(opcions: { simula?: boolean; data?: string } = {}): Promise<ResultatResum> {
  const admin = createAdminClient()
  const data = opcions.data ?? await properDiaLectiu(admin, avuiMadrid())
  if (!data) return { data: null, motiu: 'Cap dia lectiu proper', substituts: 0, gestors: 0, enviats: 0, errors: 0 }

  const { data: files, error } = await admin
    .from('substitucions')
    .select(SELECT_FILES)
    .eq('data', data)
    .in('estat', ['pendent', 'proposta_ia', 'confirmada'])
  if (error) throw new Error(error.message)

  // La codocència no és una substitució: la parella ja hi és
  const reals = ((files ?? []) as any[]).filter(f => f.horari_setmanal?.tipus_parella !== 'codocencia')
  if (reals.length === 0) {
    return { data, motiu: 'Cap substitució', substituts: 0, gestors: 0, enviats: 0, errors: 0 }
  }

  const correus: CorreuPreparat[] = []

  // Un correu per substitut, amb tots els seus blocs
  const perSubstitut = new Map<string, any[]>()
  for (const f of reals) {
    if (!f.substitut_id || !f.substitut?.email || f.substitut.actiu === false) continue
    perSubstitut.set(f.substitut_id, [...(perSubstitut.get(f.substitut_id) ?? []), f])
  }
  for (const filesSubs of perSubstitut.values()) {
    const substitut = filesSubs[0].substitut
    const blocs: BlocResum[] = agruparBlocs(filesSubs).map(b => {
      const h = b.primera.horari_setmanal as any
      const feina = Array.from(new Set(b.files.map((x: any) => x.feina_substitut).filter(Boolean))).join('\n\n')
      return {
        horaInici: b.horaInici,
        horaFi: b.horaFi,
        grup: h?.grup?.nom,
        materia: h?.materia,
        aula: h?.aula,
        nomAbsent: nomAbsent(b.primera) ?? '',
        proposta: b.files.some((x: any) => x.estat === 'proposta_ia'),
        feina,
        camí: `/substitucions/${b.primera.id}`,
      }
    })
    correus.push(correuResumSubstitut({ email: substitut.email, nom: substitut.nom, data, blocs }))
  }
  const substituts = correus.length

  // Un correu per a cada membre de l'equip directiu amb l'estat del dia
  let senseSubstitut = 0, perConfirmar = 0, confirmats = 0
  for (const b of agruparBlocs(reals)) {
    if (b.files.some((x: any) => x.estat === 'pendent')) senseSubstitut++
    else if (b.files.some((x: any) => x.estat === 'proposta_ia')) perConfirmar++
    else confirmats++
  }
  const { data: rolsGestio } = await admin
    .from('docent_rols')
    .select('docent:docent_id(nom, email, actiu)')
    .eq('rol', 'equip_directiu')
  const jaAvisats = new Set<string>()
  for (const r of (rolsGestio ?? []) as any[]) {
    const d = r.docent
    if (!d?.email || d.actiu === false || jaAvisats.has(d.email)) continue
    jaAvisats.add(d.email)
    correus.push(correuResumGestio({ email: d.email, nom: d.nom, data, senseSubstitut, perConfirmar, confirmats }))
  }

  if (opcions.simula) {
    return { data, substituts, gestors: correus.length - substituts, enviats: 0, errors: 0 }
  }
  const { enviats, errors } = await enviarLot(correus)
  return { data, substituts, gestors: correus.length - substituts, enviats, errors }
}
