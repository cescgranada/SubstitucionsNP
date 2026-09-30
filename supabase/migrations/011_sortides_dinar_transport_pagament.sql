-- ============================================================
-- SubsCoop — Migració 011: dinar, transport i pagament a sortides
-- ============================================================
-- Tres camps nous que el docent omple en proposar la sortida:
-- si cal dinar, com s'hi desplacen i si cal fer un pagament (amb
-- la data límit). El camp "observacions" ja existia (text lliure).

ALTER TABLE sortides ADD COLUMN IF NOT EXISTS necessita_dinar BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE sortides ADD COLUMN IF NOT EXISTS transport TEXT;
ALTER TABLE sortides ADD CONSTRAINT sortides_transport_check
  CHECK (transport IS NULL OR transport IN ('peu', 'autocar', 'transport_public'));

ALTER TABLE sortides ADD COLUMN IF NOT EXISTS requereix_pagament BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sortides ADD COLUMN IF NOT EXISTS data_limit_pagament DATE;

-- Integritat: si es marca que cal pagament, la data límit és obligatòria.
ALTER TABLE sortides ADD CONSTRAINT sortides_pagament_check
  CHECK (NOT requereix_pagament OR data_limit_pagament IS NOT NULL);
