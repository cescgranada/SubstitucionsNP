-- Revisió final:
--  1) Qui és absent un dia (aprovada o pendent) no pot ser proposat com a substitut.
--     Funció SECURITY DEFINER perquè un docent no veu les absències dels companys
--     per RLS, i només retorna docent i tram horari (mai el motiu).
--  2) log_horari_canvi és una funció de trigger: ningú l'ha de poder cridar per l'API.
--  3) Índexs de les claus foranes que fan servir les consultes més freqüents.

CREATE OR REPLACE FUNCTION docents_absents_dia(p_data DATE)
RETURNS TABLE (docent_id UUID, hora_inici TIME, hora_fi TIME)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.docent_id,
         CASE WHEN a.tot_el_dia OR a.hora_inici IS NULL OR a.hora_fi IS NULL
              THEN TIME '00:00' ELSE a.hora_inici END,
         CASE WHEN a.tot_el_dia OR a.hora_inici IS NULL OR a.hora_fi IS NULL
              THEN TIME '23:59:59' ELSE a.hora_fi END
  FROM absencies a
  WHERE a.estat IN ('pendent', 'aprovada')
    AND p_data BETWEEN a.data AND COALESCE(a.data_fi, a.data)
$$;

REVOKE EXECUTE ON FUNCTION docents_absents_dia(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION docents_absents_dia(DATE) TO authenticated;

REVOKE EXECUTE ON FUNCTION log_horari_canvi() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_substitucions_horari ON substitucions(horari_setmanal_id);
CREATE INDEX IF NOT EXISTS idx_substitucions_absencia ON substitucions(absencia_id);
CREATE INDEX IF NOT EXISTS idx_absencia_feines_horari ON absencia_feines(horari_setmanal_id);
CREATE INDEX IF NOT EXISTS idx_horari_setmanal_franja ON horari_setmanal(franja_id);
