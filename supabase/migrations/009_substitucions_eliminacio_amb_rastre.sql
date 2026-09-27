-- ============================================================
-- SubsCoop — Migració 009: traçabilitat també a substitucions
-- ============================================================
-- Quan s'elimina una absència o una sortida, les substitucions que
-- se n'havien generat ja no es poden esborrar de veritat: es marquen
-- com a 'eliminada' amb qui ho ha fet i quan, igual que absències i
-- sortides.

ALTER TABLE substitucions ADD COLUMN IF NOT EXISTS eliminada_per UUID REFERENCES docents(id);
ALTER TABLE substitucions ADD COLUMN IF NOT EXISTS eliminada_at TIMESTAMPTZ;

ALTER TABLE substitucions DROP CONSTRAINT IF EXISTS substitucions_estat_check;
ALTER TABLE substitucions ADD CONSTRAINT substitucions_estat_check
  CHECK (estat IN ('pendent', 'proposta_ia', 'confirmada', 'eliminada'));

-- Treu la capacitat de DELETE físic (només quedava via la política
-- "FOR ALL" de l'equip directiu) i la substitueix per SELECT/INSERT/UPDATE.
DROP POLICY IF EXISTS "substitucions_equip_directiu" ON substitucions;
CREATE POLICY "substitucions_equip_directiu_select" ON substitucions
  FOR SELECT USING (auth_es_equip_directiu());
CREATE POLICY "substitucions_equip_directiu_insert" ON substitucions
  FOR INSERT WITH CHECK (auth_es_equip_directiu());
CREATE POLICY "substitucions_equip_directiu_update" ON substitucions
  FOR UPDATE USING (auth_es_equip_directiu());

-- El docent absent ha de poder marcar com a eliminades les substitucions
-- generades per la seva pròpia absència (en cancel·lar-la o eliminar-la).
CREATE POLICY "substitucions_update_docent_absent" ON substitucions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM absencies a
      WHERE a.id = substitucions.absencia_id
      AND a.docent_id = auth_docent_id()
    )
  );

-- El proposador d'una sortida ha de poder marcar com a eliminades les
-- substitucions generades per aquesta sortida (en eliminar-la).
CREATE POLICY "substitucions_update_proposador_sortida" ON substitucions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sortides s
      WHERE s.id = substitucions.sortida_id
      AND s.proposada_per = auth_docent_id()
    )
  );
