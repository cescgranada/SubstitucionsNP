-- ============================================================
-- SubsCoop — Migració 005: estat cancel·lada per a absències
-- ============================================================

-- Substitueix la restricció CHECK per incloure 'cancel·lada'
ALTER TABLE absencies DROP CONSTRAINT IF EXISTS absencies_estat_check;
ALTER TABLE absencies ADD CONSTRAINT absencies_estat_check
  CHECK (estat IN ('pendent', 'aprovada', 'rebutjada', 'cancel·lada'));
