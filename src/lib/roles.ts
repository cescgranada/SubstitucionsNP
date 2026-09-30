// ============================================================
// SubsCoop — Model de rols (RBAC) i restricció de domini
// ============================================================
//
// Hi ha 3 rols: 'docent', 'equip_directiu' i 'pas'.
// La graella fina (director, sotsdirector, cap de personal, coordinació
// d'etapa) es manté només com a metadada visual: `nom_carrec` (el títol
// a mostrar) i `etapa_id` (quina etapa gestiona, si escau) a la taula
// `docent_rols`. Els permisos, en canvi, són senzills.
//
// El PAS és un rol a part: només té accés a l'apartat de Sortides (un
// cop aprovades), per marcar-hi la gestió logística (dinar, transport,
// pagament). No veu absències, horaris ni substitucions.

export type Rol = 'docent' | 'equip_directiu' | 'pas'

export const DOMINI_PERMES = 'noupatufet.coop'

/** Comprova que un correu pertany al domini del centre. */
export function emailDelDomini(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith('@' + DOMINI_PERMES)
}

/** Cert si la llista de rols d'un docent inclou 'equip_directiu'. */
export function esEquipDirectiu(rols: { rol: string }[] | null | undefined): boolean {
  return !!rols?.some(r => r.rol === 'equip_directiu')
}

/** Cert si la llista de rols d'un docent inclou 'pas'. */
export function esPas(rols: { rol: string }[] | null | undefined): boolean {
  return !!rols?.some(r => r.rol === 'pas')
}

export const NOM_ROL: Record<Rol, string> = {
  docent: 'Docent',
  equip_directiu: 'Equip directiu',
  pas: 'PAS',
}
