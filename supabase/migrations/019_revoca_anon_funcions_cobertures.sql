-- Supabase dona EXECUTE a anon per defecte a les funcions noves del schema
-- public; REVOKE FROM PUBLIC no ho treu. Aquestes dues només són per a
-- usuaris autenticats.
REVOKE EXECUTE ON FUNCTION cobertures_curs(DATE, DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION substitucions_assignades_dia(DATE) FROM anon;
