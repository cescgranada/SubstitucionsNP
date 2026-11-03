-- substitucions_assignades_dia és SECURITY DEFINER i la poden cridar tots els
-- docents: només ha de dir qui està ocupat i en quin tram. El nom de qui és
-- absent (que RLS reserva a l'equip directiu i a la mateixa persona) ara només
-- es retorna a l'equip directiu; als altres, null.
CREATE OR REPLACE FUNCTION substitucions_assignades_dia(p_data DATE)
RETURNS TABLE (id UUID, substitut_id UUID, hora_inici TIME, hora_fi TIME, absent_nom TEXT)
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.substitut_id, f.hora_inici, f.hora_fi,
         CASE WHEN auth_es_equip_directiu() THEN d.nom END
  FROM substitucions s
  JOIN horari_setmanal h ON h.id = s.horari_setmanal_id
  JOIN franges_horaries f ON f.id = h.franja_id
  JOIN docents d ON d.id = h.docent_id
  WHERE s.data = p_data
    AND s.estat IN ('confirmada', 'proposta_ia')
    AND s.substitut_id IS NOT NULL
$$;
