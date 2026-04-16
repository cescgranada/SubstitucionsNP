-- ============================================================
-- SubsCoop — Migració 004: suport absències multi-dia
-- ============================================================

-- Afegeix la columna data_fi a absencies.
-- Si és NULL, l'absència és d'un sol dia (equivalent a data_fi = data).
ALTER TABLE absencies ADD COLUMN IF NOT EXISTS data_fi DATE;

-- Índex per consultes per rang de dates
CREATE INDEX IF NOT EXISTS idx_absencies_data_rang ON absencies(data, data_fi);
