-- ============================================================
-- SubsCoop — Migració 007: RBAC simplificat a 2 rols
-- (DOCENT / EQUIP_DIRECTIU) + regles d'eliminació
-- ============================================================
-- La graella fina anterior (coordinacio_etapa, cap_personal, director,
-- sotsdirector) es col·lapsa a un únic rol amb permisos: 'equip_directiu'.
-- `nom_carrec` i `etapa_id` es conserven a cada fila de docent_rols com
-- a metadada (títol a mostrar / etapa que gestiona), no com a permís
-- — el codi de l'aplicació els fa servir per filtrar notificacions per
-- etapa sense necessitat de rols separats.

-- 1. Treu totes les polítiques que depenen dels rols antics
DROP POLICY IF EXISTS "absencies_propia" ON absencies;
DROP POLICY IF EXISTS "absencies_coordinacio" ON absencies;
DROP POLICY IF EXISTS "absencies_cap_personal" ON absencies;
DROP POLICY IF EXISTS "absencies_aprovacio" ON absencies;
DROP POLICY IF EXISTS "sortides_aprovacio" ON sortides;
DROP POLICY IF EXISTS "sortida_grups_gestio" ON sortida_grups;
DROP POLICY IF EXISTS "sortida_acompanyants_gestio" ON sortida_acompanyants;
DROP POLICY IF EXISTS "substitucions_coordinacio" ON substitucions;
DROP POLICY IF EXISTS "log_ia_gestors" ON log_ia;

-- 2. Ara ja es poden eliminar les funcions auxiliars obsoletes
DROP FUNCTION IF EXISTS auth_has_rol(TEXT);
DROP FUNCTION IF EXISTS auth_etapa_coordinacio();

-- 3. Treu temporalment el CHECK per poder migrar les dades
ALTER TABLE docent_rols DROP CONSTRAINT IF EXISTS docent_rols_rol_check;

-- 4. Migra les dades existents
UPDATE docent_rols
SET rol = 'equip_directiu'
WHERE rol IN ('coordinacio_etapa', 'cap_personal', 'director', 'sotsdirector');

-- 5. Restringeix el CHECK als 2 rols
ALTER TABLE docent_rols ADD CONSTRAINT docent_rols_rol_check
  CHECK (rol IN ('docent', 'equip_directiu'));

-- 6. Funció auxiliar: és equip directiu?
CREATE OR REPLACE FUNCTION auth_es_equip_directiu()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM docent_rols
    WHERE docent_id = auth_docent_id()
    AND rol = 'equip_directiu'
  )
$$;

-- ============================================================
-- ABSENCIES
-- ============================================================
CREATE POLICY "absencies_lectura_propia" ON absencies
  FOR SELECT USING (docent_id = auth_docent_id());

CREATE POLICY "absencies_insert_propia" ON absencies
  FOR INSERT WITH CHECK (docent_id = auth_docent_id());

CREATE POLICY "absencies_update_propia" ON absencies
  FOR UPDATE USING (docent_id = auth_docent_id());

-- DOCENT: només pot esborrar les seves pròpies mentre estan pendents.
CREATE POLICY "absencies_delete_propia" ON absencies
  FOR DELETE USING (docent_id = auth_docent_id() AND estat = 'pendent');

-- EQUIP_DIRECTIU: accés complet, sense restricció d'estat.
CREATE POLICY "absencies_equip_directiu" ON absencies
  FOR ALL USING (auth_es_equip_directiu());

-- ============================================================
-- SORTIDES
-- ============================================================
-- DOCENT: només pot esborrar la seva proposta mentre no s'ha resolt.
CREATE POLICY "sortides_delete_propia" ON sortides
  FOR DELETE USING (proposada_per = auth_docent_id() AND estat = 'proposta');

CREATE POLICY "sortides_gestio_equip_directiu" ON sortides
  FOR ALL USING (auth_es_equip_directiu());

-- ============================================================
-- SORTIDA_GRUPS / SORTIDA_ACOMPANYANTS
-- ============================================================
CREATE POLICY "sortida_grups_gestio" ON sortida_grups
  FOR ALL USING (auth_es_equip_directiu());

CREATE POLICY "sortida_acompanyants_gestio" ON sortida_acompanyants
  FOR ALL USING (auth_es_equip_directiu());

-- ============================================================
-- SUBSTITUCIONS
-- ============================================================
CREATE POLICY "substitucions_equip_directiu" ON substitucions
  FOR ALL USING (auth_es_equip_directiu());

-- ============================================================
-- LOG_IA
-- ============================================================
CREATE POLICY "log_ia_equip_directiu" ON log_ia
  FOR SELECT USING (auth_es_equip_directiu());
