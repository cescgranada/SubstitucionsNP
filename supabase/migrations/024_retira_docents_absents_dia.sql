-- La funció docents_absents_dia (migració 023) deixava que qualsevol docent consultés
-- qui és absent un dia, cosa que l'RLS d'absencies evita expressament. La comprovació
-- d'absents es fa ara al servidor amb el client de servei (src/lib/ocupacio.ts).
DROP FUNCTION IF EXISTS docents_absents_dia(DATE);
