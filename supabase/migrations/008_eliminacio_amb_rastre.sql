-- ============================================================
-- SubsCoop — Migració 008: eliminació amb rastre (soft-delete)
-- ============================================================
-- En lloc d'esborrar files (DELETE), les absències i sortides
-- eliminades es marquen amb estat='eliminada' i queden registrades
-- qui ho ha fet i quan. Així es poden consultar sempre.

-- ABSENCIES
ALTER TABLE absencies ADD COLUMN IF NOT EXISTS eliminada_per UUID REFERENCES docents(id);
ALTER TABLE absencies ADD COLUMN IF NOT EXISTS eliminada_at TIMESTAMPTZ;

ALTER TABLE absencies DROP CONSTRAINT IF EXISTS absencies_estat_check;
ALTER TABLE absencies ADD CONSTRAINT absencies_estat_check
  CHECK (estat IN ('pendent', 'aprovada', 'rebutjada', 'cancel·lada', 'eliminada'));

-- SORTIDES
ALTER TABLE sortides ADD COLUMN IF NOT EXISTS eliminada_per UUID REFERENCES docents(id);
ALTER TABLE sortides ADD COLUMN IF NOT EXISTS eliminada_at TIMESTAMPTZ;

ALTER TABLE sortides DROP CONSTRAINT IF EXISTS sortides_estat_check;
ALTER TABLE sortides ADD CONSTRAINT sortides_estat_check
  CHECK (estat IN ('proposta', 'aprovada', 'rebutjada', 'eliminada'));

-- ============================================================
-- Es treu la capacitat de DELETE físic sobre les "sol·licituds"
-- (absències i sortides): a partir d'ara només es poden marcar
-- com a eliminades via UPDATE, mai esborrar-se de veritat. Així
-- el rastre no es pot saltar ni amb accés directe a la base de dades.
-- ============================================================
DROP POLICY IF EXISTS "absencies_delete_propia" ON absencies;
DROP POLICY IF EXISTS "absencies_equip_directiu" ON absencies;
CREATE POLICY "absencies_equip_directiu_select" ON absencies
  FOR SELECT USING (auth_es_equip_directiu());
CREATE POLICY "absencies_equip_directiu_insert" ON absencies
  FOR INSERT WITH CHECK (auth_es_equip_directiu());
CREATE POLICY "absencies_equip_directiu_update" ON absencies
  FOR UPDATE USING (auth_es_equip_directiu());

DROP POLICY IF EXISTS "sortides_delete_propia" ON sortides;
DROP POLICY IF EXISTS "sortides_gestio_equip_directiu" ON sortides;
CREATE POLICY "sortides_equip_directiu_insert" ON sortides
  FOR INSERT WITH CHECK (auth_es_equip_directiu());
CREATE POLICY "sortides_equip_directiu_update" ON sortides
  FOR UPDATE USING (auth_es_equip_directiu());
