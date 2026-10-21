-- Revisió de seguretat de la 015: qui proposa una sortida només ha de poder
-- afegir-hi grups mentre encara està pendent d'aprovar ('proposta'), no
-- després d'aprovada o rebutjada.
DROP POLICY IF EXISTS "sortida_grups_insert_proposador" ON sortida_grups;
CREATE POLICY "sortida_grups_insert_proposador" ON sortida_grups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sortides s
      WHERE s.id = sortida_grups.sortida_id
        AND s.proposada_per = auth_docent_id()
        AND s.estat = 'proposta'
    )
  );
