// ============================================================
// SubsCoop — Model de rols (RBAC) i restricció de domini
// ============================================================
//
// Hi ha exactament 2 rols: 'docent' i 'equip_directiu'.
// La graella fina (director, sotsdirector, cap de personal, coordinació
// d'etapa) es manté només com a metadada visual: `nom_carrec` (el títol
// a mostrar) i `etapa_id` (quina etapa gestiona, si escau) a la taula
// `docent_rols`. Els permisos, en canvi, són binaris.

export type Rol = 'docent' | 'equip_directiu'

export const DOMINI_PERMES = 'noupatufet.coop'

/** Comprova que un correu pertany al domini del centre. */
export function emailDelDomini(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith('@' + DOMINI_PERMES)
}

/** Cert si la llista de rols d'un docent inclou 'equip_directiu'. */
export function esEquipDirectiu(rols: { rol: string }[] | null | undefined): boolean {
  return !!rols?.some(r => r.rol === 'equip_directiu')
}

export const NOM_ROL: Record<Rol, string> = {
  docent: 'Docent',
  equip_directiu: 'Equip directiu',
}
