-- "No la puc fer": un substitut renuncia a una franja que se li havia proposat
-- o que tenia confirmada. La franja torna a quedar pendent perquè l'equip
-- directiu hi assigni algú altre, i queda registrat qui hi ha renunciat i per
-- què. El substitut no té permís d'UPDATE sobre substitucions (RLS), per això
-- ho fa una funció SECURITY DEFINER que comprova que les franges són seves.

CREATE TABLE IF NOT EXISTS substitucions_rebutjos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  substitucio_id UUID NOT NULL REFERENCES substitucions(id) ON DELETE CASCADE,
  docent_id UUID NOT NULL REFERENCES docents(id),
  motiu TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_substitucions_rebutjos_substitucio ON substitucions_rebutjos(substitucio_id);

ALTER TABLE substitucions_rebutjos ENABLE ROW LEVEL SECURITY;

CREATE POLICY substitucions_rebutjos_equip_directiu_select ON substitucions_rebutjos
  FOR SELECT TO authenticated USING (auth_es_equip_directiu());

CREATE POLICY substitucions_rebutjos_propia_select ON substitucions_rebutjos
  FOR SELECT TO authenticated USING (docent_id = auth_docent_id());

CREATE OR REPLACE FUNCTION rebutjar_substitucions(p_ids UUID[], p_motiu TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_docent UUID := auth_docent_id();
  v_n INTEGER;
BEGIN
  IF v_docent IS NULL THEN
    RAISE EXCEPTION 'Sessió no vàlida';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Cap franja per renunciar';
  END IF;

  -- Totes han de ser seves, vigents, d'avui en endavant i no de codocència
  IF (
    SELECT count(*) FROM substitucions s
    JOIN horari_setmanal h ON h.id = s.horari_setmanal_id
    WHERE s.id = ANY (p_ids)
      AND s.substitut_id = v_docent
      AND s.estat IN ('proposta_ia', 'confirmada')
      AND s.data >= current_date
      AND h.tipus_parella IS DISTINCT FROM 'codocencia'
  ) <> array_length(p_ids, 1) THEN
    RAISE EXCEPTION 'No pots renunciar a aquesta substitució';
  END IF;

  INSERT INTO substitucions_rebutjos (substitucio_id, docent_id, motiu)
  SELECT id, v_docent, nullif(trim(p_motiu), '') FROM substitucions WHERE id = ANY (p_ids);

  UPDATE substitucions
  SET substitut_id = NULL,
      estat = 'pendent',
      proposat_per_ia = false,
      motiu_proposta_ia = NULL,
      confirmat_per = NULL,
      confirmat_at = NULL
  WHERE id = ANY (p_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION rebutjar_substitucions(UUID[], TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rebutjar_substitucions(UUID[], TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION rebutjar_substitucions(UUID[], TEXT) TO authenticated;
