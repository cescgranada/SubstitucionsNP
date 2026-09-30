-- ============================================================
-- SubsCoop — Migració 013: el docent absent pot generar les seves
-- pròpies substitucions
-- ============================================================
-- Quan un docent normal (no equip directiu) comunica una absència de
-- tipus mèdic/formació, s'aprova automàticament i es generen les
-- substitucions a l'acte, amb la sessió del mateix docent (no amb un
-- rol elevat). Fins ara l'única política d'INSERT a `substitucions`
-- exigia ser equip_directiu, així que aquest INSERT quedava bloquejat
-- en silenci per a qualsevol docent normal: l'absència es desava bé,
-- però no sortien "classes afectades" ni es podia deixar feina pel
-- substitut. Aquesta política permet inserir només substitucions
-- lligades a una absència pròpia.

CREATE POLICY "substitucions_insert_docent_absent" ON substitucions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM absencies a
      WHERE a.id = substitucions.absencia_id
      AND a.docent_id = auth_docent_id()
    )
  );
