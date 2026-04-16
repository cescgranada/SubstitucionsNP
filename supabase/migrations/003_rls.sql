-- ============================================================
-- SubsCoop — Row Level Security
-- Escola Cooperativa Nou Patufet
-- ============================================================

-- Activar RLS a totes les taules
ALTER TABLE etapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE docents ENABLE ROW LEVEL SECURITY;
ALTER TABLE grups ENABLE ROW LEVEL SECURITY;
ALTER TABLE franges_horaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE docent_etapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE docent_rols ENABLE ROW LEVEL SECURITY;
ALTER TABLE horari_setmanal ENABLE ROW LEVEL SECURITY;
ALTER TABLE absencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sortides ENABLE ROW LEVEL SECURITY;
ALTER TABLE sortida_grups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sortida_acompanyants ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitucions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacions ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_ia ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Funció auxiliar: retorna l'id del docent de la sessió actual
-- ============================================================
CREATE OR REPLACE FUNCTION auth_docent_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT id FROM docents WHERE email = auth.email()
$$;

-- ============================================================
-- Funció auxiliar: comprova si el docent té un rol concret
-- ============================================================
CREATE OR REPLACE FUNCTION auth_has_rol(p_rol TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM docent_rols
    WHERE docent_id = auth_docent_id()
    AND rol = p_rol
  )
$$;

-- ============================================================
-- Funció auxiliar: retorna l'etapa_id de la coordinació
-- ============================================================
CREATE OR REPLACE FUNCTION auth_etapa_coordinacio()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT etapa_id FROM docent_rols
  WHERE docent_id = auth_docent_id()
  AND rol = 'coordinacio_etapa'
  LIMIT 1
$$;

-- ============================================================
-- ETAPES — lectura per tothom, escriptura admin
-- ============================================================
CREATE POLICY "etapes_lectura" ON etapes
  FOR SELECT USING (auth_docent_id() IS NOT NULL);

-- ============================================================
-- DOCENTS — lectura per tothom (dades bàsiques del claustre)
-- ============================================================
CREATE POLICY "docents_lectura" ON docents
  FOR SELECT USING (auth_docent_id() IS NOT NULL);

-- ============================================================
-- GRUPS — lectura per tothom
-- ============================================================
CREATE POLICY "grups_lectura" ON grups
  FOR SELECT USING (auth_docent_id() IS NOT NULL);

-- ============================================================
-- FRANGES_HORARIES — lectura per tothom
-- ============================================================
CREATE POLICY "franges_lectura" ON franges_horaries
  FOR SELECT USING (auth_docent_id() IS NOT NULL);

-- ============================================================
-- DOCENT_ETAPES — lectura per tothom
-- ============================================================
CREATE POLICY "docent_etapes_lectura" ON docent_etapes
  FOR SELECT USING (auth_docent_id() IS NOT NULL);

-- ============================================================
-- DOCENT_ROLS — lectura per tothom
-- ============================================================
CREATE POLICY "docent_rols_lectura" ON docent_rols
  FOR SELECT USING (auth_docent_id() IS NOT NULL);

-- ============================================================
-- HORARI_SETMANAL — lectura per tothom, escriptura admin
-- ============================================================
CREATE POLICY "horari_lectura" ON horari_setmanal
  FOR SELECT USING (auth_docent_id() IS NOT NULL);

-- ============================================================
-- ABSENCIES
-- - Cada docent veu i gestiona les seves pròpies
-- - Coordinació d'etapa veu les de la seva etapa
-- - Cap de personal i director/sotsdirector veuen totes
-- ============================================================
CREATE POLICY "absencies_propia" ON absencies
  FOR ALL
  USING (docent_id = auth_docent_id());

CREATE POLICY "absencies_coordinacio" ON absencies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM docent_etapes de
      WHERE de.docent_id = absencies.docent_id
      AND de.etapa_id = auth_etapa_coordinacio()
    )
  );

CREATE POLICY "absencies_cap_personal" ON absencies
  FOR ALL
  USING (auth_has_rol('cap_personal') OR auth_has_rol('director') OR auth_has_rol('sotsdirector'));

-- Aprovació: cap de personal pot modificar estat
CREATE POLICY "absencies_aprovacio" ON absencies
  FOR UPDATE
  USING (auth_has_rol('cap_personal') OR auth_has_rol('director'));

-- ============================================================
-- SORTIDES
-- - Tothom pot proposar i veure
-- - Coordinació d'etapa aprova les de la seva etapa
-- - Director/sotsdirector aproven totes
-- ============================================================
CREATE POLICY "sortides_lectura" ON sortides
  FOR SELECT USING (auth_docent_id() IS NOT NULL);

CREATE POLICY "sortides_proposta" ON sortides
  FOR INSERT WITH CHECK (proposada_per = auth_docent_id());

CREATE POLICY "sortides_aprovacio" ON sortides
  FOR UPDATE
  USING (auth_has_rol('director') OR auth_has_rol('sotsdirector') OR auth_has_rol('coordinacio_etapa'));

-- ============================================================
-- SORTIDA_GRUPS — lectura per tothom, gestió per coordinació
-- ============================================================
CREATE POLICY "sortida_grups_lectura" ON sortida_grups
  FOR SELECT USING (auth_docent_id() IS NOT NULL);

CREATE POLICY "sortida_grups_gestio" ON sortida_grups
  FOR ALL
  USING (auth_has_rol('director') OR auth_has_rol('sotsdirector') OR auth_has_rol('coordinacio_etapa'));

-- ============================================================
-- SORTIDA_ACOMPANYANTS — lectura per tothom
-- ============================================================
CREATE POLICY "sortida_acompanyants_lectura" ON sortida_acompanyants
  FOR SELECT USING (auth_docent_id() IS NOT NULL);

CREATE POLICY "sortida_acompanyants_gestio" ON sortida_acompanyants
  FOR ALL
  USING (auth_has_rol('director') OR auth_has_rol('sotsdirector') OR auth_has_rol('coordinacio_etapa'));

-- ============================================================
-- SUBSTITUCIONS
-- - El substitut veu les seves
-- - La coordinació d'etapa gestiona les de la seva etapa
-- - Director/sotsdirector veuen totes
-- ============================================================
CREATE POLICY "substitucions_propia" ON substitucions
  FOR SELECT
  USING (substitut_id = auth_docent_id());

CREATE POLICY "substitucions_coordinacio" ON substitucions
  FOR ALL
  USING (
    auth_has_rol('coordinacio_etapa')
    OR auth_has_rol('cap_personal')
    OR auth_has_rol('director')
    OR auth_has_rol('sotsdirector')
  );

-- Docent absent pot veure les seves substitucions
CREATE POLICY "substitucions_docent_absent" ON substitucions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM absencies a
      WHERE a.id = substitucions.absencia_id
      AND a.docent_id = auth_docent_id()
    )
  );

-- ============================================================
-- NOTIFICACIONS — cada docent veu les seves
-- ============================================================
CREATE POLICY "notificacions_propia" ON notificacions
  FOR ALL
  USING (destinatari_id = auth_docent_id());

-- ============================================================
-- LOG_IA — coordinació i direcció
-- ============================================================
CREATE POLICY "log_ia_gestors" ON log_ia
  FOR SELECT
  USING (
    auth_has_rol('coordinacio_etapa')
    OR auth_has_rol('director')
    OR auth_has_rol('sotsdirector')
  );
