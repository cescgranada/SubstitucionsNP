-- Calendari escolar: dies laborables (dl–dv) sense classe, perquè no es
-- generin substitucions els festius, les vacances ni els dies no lectius.
-- Curs 2026-27, llegit de 20260901_Hores_Curs.xlsx (colors de cada dia).
-- Els caps de setmana no cal guardar-los: ja s'ometen sempre.

CREATE TABLE IF NOT EXISTS calendari_escolar (
  data DATE PRIMARY KEY,
  tipus TEXT NOT NULL CHECK (tipus IN ('festiu', 'festa_local', 'vacances', 'no_lectiu', 'fora_de_curs')),
  descripcio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE calendari_escolar ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendari_escolar_lectura ON calendari_escolar
  FOR SELECT TO authenticated USING (true);

CREATE POLICY calendari_escolar_equip_directiu ON calendari_escolar
  FOR ALL TO authenticated
  USING (auth_es_equip_directiu()) WITH CHECK (auth_es_equip_directiu());

INSERT INTO calendari_escolar (data, tipus, descripcio) VALUES
  ('2026-09-01', 'no_lectiu', 'Dia no lectiu'),
  ('2026-09-02', 'no_lectiu', 'Dia no lectiu'),
  ('2026-09-03', 'no_lectiu', 'Dia no lectiu'),
  ('2026-09-04', 'no_lectiu', 'Dia no lectiu'),
  ('2026-09-07', 'no_lectiu', 'Dia no lectiu'),
  ('2026-09-11', 'festiu', 'Diada Nacional de Catalunya'),
  ('2026-09-24', 'festa_local', 'Festa local'),
  ('2026-10-12', 'festiu', 'Festa Nacional d''Espanya'),
  ('2026-12-08', 'festiu', 'La Immaculada'),
  ('2026-12-21', 'no_lectiu', 'Dia no lectiu'),
  ('2026-12-22', 'vacances', 'Vacances de Nadal'),
  ('2026-12-23', 'vacances', 'Vacances de Nadal'),
  ('2026-12-24', 'vacances', 'Vacances de Nadal'),
  ('2026-12-25', 'festiu', 'Nadal'),
  ('2026-12-28', 'vacances', 'Vacances de Nadal'),
  ('2026-12-29', 'vacances', 'Vacances de Nadal'),
  ('2026-12-30', 'vacances', 'Vacances de Nadal'),
  ('2026-12-31', 'vacances', 'Vacances de Nadal'),
  ('2027-01-01', 'festiu', 'Cap d''Any'),
  ('2027-01-04', 'vacances', 'Vacances de Nadal'),
  ('2027-01-05', 'vacances', 'Vacances de Nadal'),
  ('2027-01-06', 'festiu', 'Reis'),
  ('2027-01-07', 'vacances', 'Vacances de Nadal'),
  ('2027-03-19', 'no_lectiu', 'Dia no lectiu'),
  ('2027-03-22', 'vacances', 'Setmana Santa'),
  ('2027-03-23', 'vacances', 'Setmana Santa'),
  ('2027-03-24', 'vacances', 'Setmana Santa'),
  ('2027-03-25', 'vacances', 'Setmana Santa'),
  ('2027-03-26', 'festiu', 'Divendres Sant'),
  ('2027-03-29', 'festiu', 'Dilluns de Pasqua'),
  ('2027-05-17', 'festa_local', 'Festa local'),
  ('2027-06-21', 'no_lectiu', 'Dia no lectiu'),
  ('2027-06-22', 'no_lectiu', 'Dia no lectiu'),
  ('2027-06-23', 'no_lectiu', 'Dia no lectiu'),
  ('2027-06-24', 'festiu', 'Sant Joan'),
  ('2027-06-25', 'no_lectiu', 'Dia no lectiu'),
  ('2027-06-28', 'no_lectiu', 'Dia no lectiu'),
  ('2027-06-29', 'no_lectiu', 'Dia no lectiu'),
  ('2027-06-30', 'no_lectiu', 'Dia no lectiu'),
  ('2027-07-01', 'no_lectiu', 'Dia no lectiu'),
  ('2027-07-02', 'no_lectiu', 'Dia no lectiu'),
  ('2027-07-05', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-06', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-07', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-08', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-09', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-12', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-13', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-14', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-15', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-16', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-19', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-20', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-21', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-22', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-23', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-26', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-27', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-28', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-29', 'fora_de_curs', 'Fora de curs'),
  ('2027-07-30', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-02', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-03', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-04', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-05', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-06', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-09', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-10', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-11', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-12', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-13', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-16', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-17', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-18', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-19', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-20', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-23', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-24', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-25', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-26', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-27', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-30', 'fora_de_curs', 'Fora de curs'),
  ('2027-08-31', 'fora_de_curs', 'Fora de curs')
ON CONFLICT (data) DO NOTHING;

-- Comptador de cobertures del curs: franges de 30 min que ha cobert cada
-- docent (confirmades o proposades), sense comptar la codocència, que no
-- és una cobertura sinó el seu horari. SECURITY DEFINER perquè un docent que
-- comunica la seva absència no veu les substitucions dels altres, i sense el
-- recompte complet el repartiment no seria just. Només retorna números.
CREATE OR REPLACE FUNCTION cobertures_curs(p_inici DATE, p_fi DATE)
RETURNS TABLE (docent_id UUID, franges BIGINT)
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.substitut_id, count(*)
  FROM substitucions s
  JOIN horari_setmanal h ON h.id = s.horari_setmanal_id
  WHERE s.data BETWEEN p_inici AND p_fi
    AND s.estat IN ('confirmada', 'proposta_ia')
    AND s.substitut_id IS NOT NULL
    AND h.tipus_parella IS DISTINCT FROM 'codocencia'
  GROUP BY s.substitut_id
$$;

REVOKE ALL ON FUNCTION cobertures_curs(DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cobertures_curs(DATE, DATE) TO authenticated;

-- Substitucions ja assignades o proposades en un dia (qui les cobreix i en
-- quin tram), visibles per a qualsevol docent que generi substitucions: sense
-- això, qui comunica una absència no veia que un company ja estava ocupat.
CREATE OR REPLACE FUNCTION substitucions_assignades_dia(p_data DATE)
RETURNS TABLE (id UUID, substitut_id UUID, hora_inici TIME, hora_fi TIME, absent_nom TEXT)
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.substitut_id, f.hora_inici, f.hora_fi, d.nom
  FROM substitucions s
  JOIN horari_setmanal h ON h.id = s.horari_setmanal_id
  JOIN franges_horaries f ON f.id = h.franja_id
  JOIN docents d ON d.id = h.docent_id
  WHERE s.data = p_data
    AND s.estat IN ('confirmada', 'proposta_ia')
    AND s.substitut_id IS NOT NULL
$$;

REVOKE ALL ON FUNCTION substitucions_assignades_dia(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION substitucions_assignades_dia(DATE) TO authenticated;
