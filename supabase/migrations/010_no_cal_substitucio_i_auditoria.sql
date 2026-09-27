-- ============================================================
-- SubsCoop — Migració 010: "No cal substitució" + auditoria
-- de la confirmació
-- ============================================================
-- La proposta de substitut la genera l'IA (`proposta_ia`), però la
-- validació final és sempre manual, d'un membre de l'EQUIP_DIRECTIU.
-- Queda registrat qui ho ha confirmat i quan (confirmat_per ja existia;
-- s'hi afegeix confirmat_at). El mateix registre serveix quan es decideix
-- que una franja no necessita substitut ('no_cal').

ALTER TABLE substitucions ADD COLUMN IF NOT EXISTS confirmat_at TIMESTAMPTZ;

ALTER TABLE substitucions DROP CONSTRAINT IF EXISTS substitucions_estat_check;
ALTER TABLE substitucions ADD CONSTRAINT substitucions_estat_check
  CHECK (estat IN ('pendent', 'proposta_ia', 'confirmada', 'no_cal', 'eliminada'));
