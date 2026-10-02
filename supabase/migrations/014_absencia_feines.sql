-- Feina que el docent deixa per a cada franja afectada, escrita en el
-- moment de comunicar l'absència (quan encara pot no haver-hi
-- substitucions, p. ex. dia personal pendent d'aprovar). Es copia a
-- substitucions.feina_substitut quan es generen.
CREATE TABLE absencia_feines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  absencia_id UUID NOT NULL REFERENCES absencies(id) ON DELETE CASCADE,
  horari_setmanal_id UUID NOT NULL REFERENCES horari_setmanal(id),
  data DATE NOT NULL,
  feina TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (absencia_id, horari_setmanal_id, data)
);

ALTER TABLE absencia_feines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "absencia_feines_propia" ON absencia_feines
  FOR ALL
  USING (EXISTS (SELECT 1 FROM absencies a WHERE a.id = absencia_feines.absencia_id AND a.docent_id = auth_docent_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM absencies a WHERE a.id = absencia_feines.absencia_id AND a.docent_id = auth_docent_id()));

CREATE POLICY "absencia_feines_equip_directiu" ON absencia_feines
  FOR SELECT USING (auth_es_equip_directiu());
