// ============================================================
// SubsCoop — Tipus del model de dades
// ============================================================

export type Etapa = {
  id: string
  codi: 'EI' | 'EP' | 'ESO'
  nom: string
}

export type Docent = {
  id: string
  nom: string
  email: string
  actiu: boolean
  created_at: string
  updated_at: string
}

export type Grup = {
  id: string
  codi: string
  etapa_id: string
  nom: string
}

export type FranjaHoraria = {
  id: string
  etapa_id: string
  hora_inici: string
  hora_fi: string
  ordre: number
}

export type DocentEtapa = {
  id: string
  docent_id: string
  etapa_id: string
}

export type Rol = 'docent' | 'coordinacio_etapa' | 'cap_personal' | 'director' | 'sotsdirector'

export type DocentRol = {
  id: string
  docent_id: string
  rol: Rol
  etapa_id: string | null
  nom_carrec: string | null
}

export type TipusHorari = 'classe' | 'guardia' | 'permanencia' | 'reunio' | 'esbarjo' | 'hnl' | 'disponible'
export type TipusParella = 'codocencia' | 'desdoblament'

export type HorariSetmanal = {
  id: string
  docent_id: string
  franja_id: string
  dia_setmana: 1 | 2 | 3 | 4 | 5
  tipus: TipusHorari
  grup_id: string | null
  materia: string | null
  aula: string | null
  parella_docent_id: string | null
  tipus_parella: TipusParella | null
}

export type MotiuAbsencia = 'medic' | 'dia_personal' | 'formacio'
export type EstatAbsencia = 'pendent' | 'aprovada' | 'rebutjada'

export type Absencia = {
  id: string
  docent_id: string
  data: string
  tot_el_dia: boolean
  hora_inici: string | null
  hora_fi: string | null
  motiu: MotiuAbsencia
  estat: EstatAbsencia
  aprovat_per: string | null
  data_aprovacio: string | null
  observacions: string | null
  created_at: string
}

export type EstatSortida = 'proposta' | 'aprovada' | 'rebutjada'

export type Sortida = {
  id: string
  proposada_per: string
  data: string
  hora_inici: string
  hora_fi: string
  descripcio: string
  estat: EstatSortida
  aprovada_per: string | null
  data_aprovacio: string | null
  observacions: string | null
  google_event_id: string | null
  created_at: string
}

export type SortidaGrup = {
  id: string
  sortida_id: string
  grup_id: string
}

export type SortidaAcompanyant = {
  id: string
  sortida_id: string
  docent_id: string
}

export type EstatSubstitucio = 'pendent' | 'proposta_ia' | 'confirmada'

export type Substitucio = {
  id: string
  absencia_id: string | null
  sortida_id: string | null
  horari_setmanal_id: string
  data: string
  substitut_id: string | null
  estat: EstatSubstitucio
  proposat_per_ia: boolean
  motiu_proposta_ia: string | null
  confirmat_per: string | null
  feina_substitut: string | null
  google_event_id: string | null
  created_at: string
  updated_at: string
}

export type TipusNotificacio =
  | 'assignacio'
  | 'recordatori'
  | 'aprovacio_pendent'
  | 'absencia_processada'
  | 'sortida_proposta'
  | 'sortida_aprovada'

export type Notificacio = {
  id: string
  destinatari_id: string
  tipus: TipusNotificacio
  referencia_id: string | null
  referencia_tipus: 'substitucio' | 'absencia' | 'sortida' | null
  enviat: boolean
  enviat_at: string | null
  programat_per: string | null
  error: string | null
  created_at: string
}

export type LogIA = {
  id: string
  substitucio_id: string
  candidats_considerats: unknown
  candidat_proposat: string
  raonament: string
  acceptat: boolean | null
  created_at: string
}

// Tipus enriquits per a les vistes
export type DocentAmbRols = Docent & {
  rols: DocentRol[]
  etapes: Etapa[]
}

export type SubstitucioAmbDetalls = Substitucio & {
  absencia?: Absencia & { docent: Docent }
  sortida?: Sortida
  horari: HorariSetmanal & {
    franja: FranjaHoraria
    grup?: Grup
  }
  substitut?: Docent
}
