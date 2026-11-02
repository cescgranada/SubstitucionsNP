/** Textos que es mostren a més d'una pàgina: un sol lloc on canviar-los. */

export const MOTIUS: Record<string, string> = {
  medic: 'Mèdic',
  dia_personal: 'Dia personal',
  formacio: 'Formació',
}

export const TIPUS_HORARI: Record<string, string> = {
  classe: 'Classe',
  guardia: 'Guàrdia',
  permanencia: 'Permanència',
  reunio: 'Reunió',
  esbarjo: 'Esbarjo',
  hnl: 'Hora no lectiva',
  disponible: 'Disponible',
}

export const ESTAT_ABSENCIA: Record<string, string> = {
  pendent: 'Pendent',
  aprovada: 'Aprovada',
  rebutjada: 'Rebutjada',
  'cancel·lada': 'Cancel·lada',
  eliminada: 'Eliminada',
}

export const ESTAT_SUBSTITUCIO: Record<string, string> = {
  pendent: 'Pendent',
  proposta_ia: 'Proposta',
  confirmada: 'Confirmada',
  no_cal: 'No cal',
  eliminada: 'Eliminada',
}

export const ESTAT_SORTIDA: Record<string, string> = {
  proposta: 'Proposta',
  aprovada: 'Aprovada',
  rebutjada: 'Rebutjada',
  eliminada: 'Eliminada',
}
