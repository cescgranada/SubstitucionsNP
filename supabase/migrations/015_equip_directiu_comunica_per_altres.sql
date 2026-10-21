-- Qui ha comunicat l'absència quan no és el propi docent (auditoria)
ALTER TABLE absencies ADD COLUMN IF NOT EXISTS comunicada_per UUID REFERENCES docents(id);

-- L'equip directiu pot deixar la feina en nom del docent absent (el docent
-- podrà editar-la després amb absencia_feines_propia)
CREATE POLICY "absencia_feines_equip_directiu_insert" ON absencia_feines
  FOR INSERT WITH CHECK (auth_es_equip_directiu());

-- Un docent pot associar grups a la sortida que ell mateix proposa (abans
-- només ho podia fer l'equip directiu i la proposta fallava en silenci)
CREATE POLICY "sortida_grups_insert_proposador" ON sortida_grups
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sortides s WHERE s.id = sortida_grups.sortida_id AND s.proposada_per = auth_docent_id())
  );
