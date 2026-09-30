// ============================================================
// SubsCoop — Galeta de pista de rol (navegació, no seguretat)
// ============================================================
//
// El middleware (proxy.ts) necessita saber si algú és PAS abans de
// renderitzar cap pàgina, per redirigir-lo fora de tot el que no sigui
// Sortides — sense haver de consultar la base de dades a cada petició.
// Aquesta galeta és NOMÉS una ajuda de navegació: si es manipulés, com a
// molt es veurien pantalles equivocades, mai dades que la RLS no permeti.
//
// Es fixa un cop, en iniciar sessió (auth/callback). Si el rol d'algú
// canvia mentre té la sessió oberta, cal tornar a entrar perquè es
// refresqui — és una limitació coneguda i acceptable a aquesta escala.

export const ROL_COOKIE = 'sc_rol'

/**
 * Rol "principal" a efectes de navegació. Si algú té diversos rols,
 * l'equip directiu sempre té prioritat (accés complet); el PAS només
 * s'aplica si no és també equip directiu.
 */
export function calculaRolPrincipal(rols: { rol: string }[] | null | undefined): string {
  const valors = (rols ?? []).map(r => r.rol)
  if (valors.includes('equip_directiu')) return 'equip_directiu'
  if (valors.includes('pas')) return 'pas'
  return 'docent'
}
