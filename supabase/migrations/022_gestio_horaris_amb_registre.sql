-- Pantalla d'administració d'horaris: l'equip directiu pot afegir, canviar i
-- esborrar files de horari_setmanal (abans només tenien lectura). Cada canvi
-- queda registrat a horari_canvis: qui, quan i com era abans i com queda.

CREATE POLICY horari_gestio_equip_directiu ON horari_setmanal
  FOR ALL TO authenticated
  USING (auth_es_equip_directiu()) WITH CHECK (auth_es_equip_directiu());

CREATE TABLE IF NOT EXISTS horari_canvis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accio TEXT NOT NULL CHECK (accio IN ('INSERT', 'UPDATE', 'DELETE')),
  docent_id UUID,
  dia_setmana SMALLINT,
  abans JSONB,
  despres JSONB,
  fet_per UUID,
  fet_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_horari_canvis_docent ON horari_canvis(docent_id, fet_at DESC);

ALTER TABLE horari_canvis ENABLE ROW LEVEL SECURITY;

CREATE POLICY horari_canvis_equip_directiu_select ON horari_canvis
  FOR SELECT TO authenticated USING (auth_es_equip_directiu());

CREATE OR REPLACE FUNCTION log_horari_canvi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND to_jsonb(OLD) = to_jsonb(NEW) THEN
    RETURN NEW;
  END IF;
  INSERT INTO horari_canvis (accio, docent_id, dia_setmana, abans, despres, fet_per)
  VALUES (
    TG_OP,
    COALESCE(NEW.docent_id, OLD.docent_id),
    COALESCE(NEW.dia_setmana, OLD.dia_setmana),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth_docent_id()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_horari_canvi
  AFTER INSERT OR UPDATE OR DELETE ON horari_setmanal
  FOR EACH ROW EXECUTE FUNCTION log_horari_canvi();
