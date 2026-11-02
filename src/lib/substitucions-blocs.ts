// Les franges de primària són de 30 minuts, però una mateixa matèria sovint
// n'ocupa dues o tres seguides. A la base de dades cada franja és una
// substitució, però a les fitxes es mostren com un sol bloc. Només se separen
// quan han de cobrir-les persones diferents.

export type FilaBloc = {
  id: string
  data: string
  estat: string
  substitut_id?: string | null
  absencia_id?: string | null
  sortida_id?: string | null
  absencia?: { docent?: { nom?: string | null } | null } | null
  horari_setmanal?: {
    tipus?: string | null
    materia?: string | null
    grup?: { nom?: string | null } | null
    franja?: { hora_inici: string; hora_fi: string } | null
  } | null
}

export type Bloc<T extends FilaBloc> = {
  /** Fila representativa (la primera franja del bloc) */
  primera: T
  files: T[]
  ids: string[]
  horaInici: string
  horaFi: string
}

function clauBloc(s: FilaBloc): string {
  const h = s.horari_setmanal
  // Mentre no es decideix, la proposta de cada franja no separa el bloc;
  // un cop confirmada sí que importa qui la cobreix.
  const oberta = s.estat === 'pendent' || s.estat === 'proposta_ia'
  return [
    s.absencia_id ?? s.sortida_id ?? s.absencia?.docent?.nom ?? '',
    s.data,
    h?.grup?.nom ?? '',
    h?.materia ?? '',
    h?.tipus ?? '',
    oberta ? 'oberta' : s.estat,
    oberta ? '' : s.substitut_id ?? '',
  ].join('|')
}

/** Agrupa les franges consecutives (hora_fi == hora_inici de la següent) en blocs. */
export function agruparBlocs<T extends FilaBloc>(files: T[]): Bloc<T>[] {
  const ordre = new Map(files.map((f, i) => [f.id, i]))
  const hora = (f: T) => f.horari_setmanal?.franja?.hora_inici ?? ''
  const ordenades = [...files].sort((a, b) =>
    a.data.localeCompare(b.data) || hora(a).localeCompare(hora(b))
  )

  const blocs: Bloc<T>[] = []
  const ultimPerClau = new Map<string, Bloc<T>>()
  for (const f of ordenades) {
    const franja = f.horari_setmanal?.franja
    const clau = clauBloc(f)
    const ultim = ultimPerClau.get(clau)
    if (ultim && franja && ultim.horaFi === franja.hora_inici) {
      ultim.files.push(f)
      ultim.ids.push(f.id)
      ultim.horaFi = franja.hora_fi
    } else {
      const bloc: Bloc<T> = {
        primera: f,
        files: [f],
        ids: [f.id],
        horaInici: franja?.hora_inici ?? '',
        horaFi: franja?.hora_fi ?? '',
      }
      blocs.push(bloc)
      ultimPerClau.set(clau, bloc)
    }
  }

  // Mantén l'ordre en què venien les files (p. ex. dates descendents)
  const posicio = (b: Bloc<T>) => Math.min(...b.ids.map(id => ordre.get(id) ?? 0))
  return blocs.sort((a, b) => posicio(a) - posicio(b))
}

/** "09:00–10:30" a partir d'un bloc. */
export function textHoraBloc(b: { horaInici: string; horaFi: string }): string {
  return `${b.horaInici.slice(0, 5)}–${b.horaFi.slice(0, 5)}`
}
