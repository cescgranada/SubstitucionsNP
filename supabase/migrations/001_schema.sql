-- ============================================================
-- SubsCoop — Migració inicial del schema
-- Escola Cooperativa Nou Patufet
-- ============================================================

-- 2.1. etapes
CREATE TABLE etapes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codi TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL
);

-- 2.2. docents
CREATE TABLE docents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  actiu BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3. grups
CREATE TABLE grups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codi TEXT NOT NULL UNIQUE,
  etapa_id UUID NOT NULL REFERENCES etapes(id),
  nom TEXT NOT NULL
);

-- 2.4. franges_horaries
CREATE TABLE franges_horaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES etapes(id),
  hora_inici TIME NOT NULL,
  hora_fi TIME NOT NULL,
  ordre INTEGER NOT NULL,
  UNIQUE(etapa_id, hora_inici, hora_fi)
);

-- 2.5. docent_etapes
CREATE TABLE docent_etapes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  docent_id UUID NOT NULL REFERENCES docents(id),
  etapa_id UUID NOT NULL REFERENCES etapes(id),
  UNIQUE(docent_id, etapa_id)
);

-- 2.6. docent_rols
CREATE TABLE docent_rols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  docent_id UUID NOT NULL REFERENCES docents(id),
  rol TEXT NOT NULL CHECK (rol IN ('docent', 'coordinacio_etapa', 'cap_personal', 'director', 'sotsdirector')),
  etapa_id UUID REFERENCES etapes(id),
  nom_carrec TEXT
);

-- 2.7. horari_setmanal
CREATE TABLE horari_setmanal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  docent_id UUID NOT NULL REFERENCES docents(id),
  franja_id UUID NOT NULL REFERENCES franges_horaries(id),
  dia_setmana SMALLINT NOT NULL CHECK (dia_setmana BETWEEN 1 AND 5),
  tipus TEXT NOT NULL CHECK (tipus IN ('classe', 'guardia', 'permanencia', 'reunio', 'esbarjo', 'hnl', 'disponible')),
  grup_id UUID REFERENCES grups(id),
  materia TEXT,
  aula TEXT,
  parella_docent_id UUID REFERENCES docents(id),
  tipus_parella TEXT CHECK (tipus_parella IN ('codocencia', 'desdoblament'))
);

-- 2.8. absencies
CREATE TABLE absencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  docent_id UUID NOT NULL REFERENCES docents(id),
  data DATE NOT NULL,
  tot_el_dia BOOLEAN NOT NULL DEFAULT true,
  hora_inici TIME,
  hora_fi TIME,
  motiu TEXT NOT NULL CHECK (motiu IN ('medic', 'dia_personal', 'formacio')),
  estat TEXT NOT NULL DEFAULT 'pendent' CHECK (estat IN ('pendent', 'aprovada', 'rebutjada')),
  aprovat_per UUID REFERENCES docents(id),
  data_aprovacio TIMESTAMPTZ,
  observacions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9. sortides
CREATE TABLE sortides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposada_per UUID NOT NULL REFERENCES docents(id),
  data DATE NOT NULL,
  hora_inici TIME NOT NULL,
  hora_fi TIME NOT NULL,
  descripcio TEXT NOT NULL,
  estat TEXT NOT NULL DEFAULT 'proposta' CHECK (estat IN ('proposta', 'aprovada', 'rebutjada')),
  aprovada_per UUID REFERENCES docents(id),
  data_aprovacio TIMESTAMPTZ,
  observacions TEXT,
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.10. sortida_grups
CREATE TABLE sortida_grups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sortida_id UUID NOT NULL REFERENCES sortides(id) ON DELETE CASCADE,
  grup_id UUID NOT NULL REFERENCES grups(id),
  UNIQUE(sortida_id, grup_id)
);

-- 2.11. sortida_acompanyants
CREATE TABLE sortida_acompanyants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sortida_id UUID NOT NULL REFERENCES sortides(id) ON DELETE CASCADE,
  docent_id UUID NOT NULL REFERENCES docents(id),
  UNIQUE(sortida_id, docent_id)
);

-- 2.12. substitucions
CREATE TABLE substitucions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  absencia_id UUID REFERENCES absencies(id),
  sortida_id UUID REFERENCES sortides(id),
  horari_setmanal_id UUID NOT NULL REFERENCES horari_setmanal(id),
  data DATE NOT NULL,
  substitut_id UUID REFERENCES docents(id),
  estat TEXT NOT NULL DEFAULT 'pendent' CHECK (estat IN ('pendent', 'proposta_ia', 'confirmada')),
  proposat_per_ia BOOLEAN NOT NULL DEFAULT false,
  motiu_proposta_ia TEXT,
  confirmat_per UUID REFERENCES docents(id),
  feina_substitut TEXT,
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (absencia_id IS NOT NULL OR sortida_id IS NOT NULL)
);

-- 2.13. notificacions
CREATE TABLE notificacions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  destinatari_id UUID NOT NULL REFERENCES docents(id),
  tipus TEXT NOT NULL CHECK (tipus IN ('assignacio', 'recordatori', 'aprovacio_pendent', 'absencia_processada', 'sortida_proposta', 'sortida_aprovada')),
  referencia_id UUID,
  referencia_tipus TEXT CHECK (referencia_tipus IN ('substitucio', 'absencia', 'sortida')),
  enviat BOOLEAN NOT NULL DEFAULT false,
  enviat_at TIMESTAMPTZ,
  programat_per TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.14. log_ia
CREATE TABLE log_ia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  substitucio_id UUID NOT NULL REFERENCES substitucions(id),
  candidats_considerats JSONB NOT NULL,
  candidat_proposat UUID NOT NULL REFERENCES docents(id),
  raonament TEXT NOT NULL,
  acceptat BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.15. Índexs
CREATE INDEX idx_horari_docent_dia ON horari_setmanal(docent_id, dia_setmana);
CREATE INDEX idx_horari_dia_tipus ON horari_setmanal(dia_setmana, tipus);
CREATE INDEX idx_absencies_data ON absencies(data, estat);
CREATE INDEX idx_substitucions_data ON substitucions(data, estat);
CREATE INDEX idx_substitucions_substitut ON substitucions(substitut_id);
CREATE INDEX idx_notificacions_programat ON notificacions(programat_per, enviat);
