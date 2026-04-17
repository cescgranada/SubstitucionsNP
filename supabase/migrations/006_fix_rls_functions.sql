-- ============================================================
-- SubsCoop — Correcció funcions auxiliars RLS
-- Les funcions necessiten SECURITY DEFINER per poder llegir
-- la taula docents sense quedar bloquejades per la seva
-- pròpia política RLS (cercle viciós: per llegir docents
-- cal ser docent, però per saber si ets docent cal llegir docents).
-- ============================================================

CREATE OR REPLACE FUNCTION auth_docent_id()
RETURNS UUID
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM docents WHERE email = auth.email()
$$;

CREATE OR REPLACE FUNCTION auth_has_rol(p_rol TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM docent_rols
    WHERE docent_id = auth_docent_id()
    AND rol = p_rol
  )
$$;

CREATE OR REPLACE FUNCTION auth_etapa_coordinacio()
RETURNS UUID
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT etapa_id FROM docent_rols
  WHERE docent_id = auth_docent_id()
  AND rol = 'coordinacio_etapa'
  LIMIT 1
$$;
