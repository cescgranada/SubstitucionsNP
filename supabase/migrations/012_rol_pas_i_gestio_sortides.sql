-- ============================================================
-- SubsCoop — Migració 012: rol PAS i gestió logística de sortides
-- ============================================================
-- Nou rol 'pas', a més de 'docent' i 'equip_directiu'. El PAS només
-- gestiona (marca com a fetes) les tasques logístiques d'una sortida
-- ja aprovada: demanar dinar, demanar transport, fer el pagament.

-- 1. Amplia el CHECK de rols
ALTER TABLE docent_rols DROP CONSTRAINT IF EXISTS docent_rols_rol_check;
ALTER TABLE docent_rols ADD CONSTRAINT docent_rols_rol_check
  CHECK (rol IN ('docent', 'equip_directiu', 'pas'));

-- 2. Alta de la Laura Mas i la Carme Servitje
INSERT INTO docents (nom, email)
VALUES
  ('Laura Mas', 'laura.mas@noupatufet.coop'),
  ('Carme Servitje', 'carme.servitje@noupatufet.coop')
ON CONFLICT (email) DO NOTHING;

INSERT INTO docent_rols (docent_id, rol, nom_carrec)
SELECT id, 'pas', 'PAS'
FROM docents
WHERE email IN ('laura.mas@noupatufet.coop', 'carme.servitje@noupatufet.coop')
ON CONFLICT DO NOTHING;

-- 3. Camps de gestió logística a sortides (mateix patró qui/quan de tota
--    l'app)
ALTER TABLE sortides ADD COLUMN IF NOT EXISTS dinar_demanat BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sortides ADD COLUMN IF NOT EXISTS dinar_demanat_per UUID REFERENCES docents(id);
ALTER TABLE sortides ADD COLUMN IF NOT EXISTS dinar_demanat_at TIMESTAMPTZ;

ALTER TABLE sortides ADD COLUMN IF NOT EXISTS transport_demanat BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sortides ADD COLUMN IF NOT EXISTS transport_demanat_per UUID REFERENCES docents(id);
ALTER TABLE sortides ADD COLUMN IF NOT EXISTS transport_demanat_at TIMESTAMPTZ;

ALTER TABLE sortides ADD COLUMN IF NOT EXISTS pagament_fet BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sortides ADD COLUMN IF NOT EXISTS pagament_fet_per UUID REFERENCES docents(id);
ALTER TABLE sortides ADD COLUMN IF NOT EXISTS pagament_fet_at TIMESTAMPTZ;

-- 4. Funció auxiliar: és PAS?
CREATE OR REPLACE FUNCTION auth_es_pas()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM docent_rols
    WHERE docent_id = auth_docent_id()
    AND rol = 'pas'
  )
$$;

-- 5. El PAS pot actualitzar sortides (la Server Action només toca els
--    3 camps de gestió; la RLS no distingeix columnes, però mai
--    s'exposa al client la possibilitat d'enviar-ne d'altres).
CREATE POLICY "sortides_gestio_pas" ON sortides
  FOR UPDATE USING (auth_es_pas());
