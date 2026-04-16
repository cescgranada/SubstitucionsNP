-- ============================================================
-- SubsCoop — Seeds inicials
-- Escola Cooperativa Nou Patufet
-- ============================================================

-- 3.1. Etapes
INSERT INTO etapes (codi, nom) VALUES
  ('EI', 'Educació Infantil'),
  ('EP', 'Educació Primària'),
  ('ESO', 'Educació Secundària Obligatòria');

-- 3.2. Grups
INSERT INTO grups (codi, etapa_id, nom) VALUES
  ('I3', (SELECT id FROM etapes WHERE codi = 'EI'), 'Infantil 3 anys'),
  ('I4', (SELECT id FROM etapes WHERE codi = 'EI'), 'Infantil 4 anys'),
  ('I5', (SELECT id FROM etapes WHERE codi = 'EI'), 'Infantil 5 anys'),
  ('1r', (SELECT id FROM etapes WHERE codi = 'EP'), '1r de Primària'),
  ('2n', (SELECT id FROM etapes WHERE codi = 'EP'), '2n de Primària'),
  ('3r', (SELECT id FROM etapes WHERE codi = 'EP'), '3r de Primària'),
  ('4t', (SELECT id FROM etapes WHERE codi = 'EP'), '4t de Primària'),
  ('5è', (SELECT id FROM etapes WHERE codi = 'EP'), '5è de Primària'),
  ('6è', (SELECT id FROM etapes WHERE codi = 'EP'), '6è de Primària'),
  ('1r ESO', (SELECT id FROM etapes WHERE codi = 'ESO'), '1r d''ESO'),
  ('2n ESO', (SELECT id FROM etapes WHERE codi = 'ESO'), '2n d''ESO'),
  ('3r ESO', (SELECT id FROM etapes WHERE codi = 'ESO'), '3r d''ESO'),
  ('4t ESO', (SELECT id FROM etapes WHERE codi = 'ESO'), '4t d''ESO');

-- 3.3. Docents (23 docents)
INSERT INTO docents (nom, email) VALUES
  ('Vanessa Roma', 'vanessa.roma@noupatufet.coop'),
  ('David Lozano', 'david.lozano@noupatufet.coop'),
  ('Beto Oriol', 'albert.oriol@noupatufet.coop'),
  ('Txell Casadesús', 'txell.casadesus@noupatufet.coop'),
  ('Anna Rimbau', 'anna.rimbau@noupatufet.coop'),
  ('Glòria Pons', 'gloria.pons@noupatufet.coop'),
  ('Berta Roca', 'berta.roca@noupatufet.coop'),
  ('Maria Batlló', 'maria.batllo@noupatufet.coop'),
  ('Ingrid Ribelles', 'ingrid.ribelles@noupatufet.coop'),
  ('Maria Vallés', 'maria.valles@noupatufet.coop'),
  ('Jordi Bosch', 'jordi.bosch@noupatufet.coop'),
  ('Pau Coya', 'pau.coya@noupatufet.coop'),
  ('Gerard Companys', 'gerard.companys@noupatufet.coop'),
  ('Jordi Pere Tàrraga', 'jordi.tarraga@noupatufet.coop'),
  ('Milena Novas', 'milena.novas@noupatufet.coop'),
  ('Júlia Ruiz', 'julia.ruiz@noupatufet.coop'),
  ('Josep Cuervas', 'josep.cuervas@noupatufet.coop'),
  ('Laia Pantinat', 'laia.pantinat@noupatufet.coop'),
  ('Sol Echegaray', 'sol.echegaray@noupatufet.coop'),
  ('Àgata Miquel', 'agata.miquel@noupatufet.coop'),
  ('Laia Canal', 'laia.canal@noupatufet.coop'),
  ('Francesc Granada', 'francesc.granada@noupatufet.coop'),
  ('Roberto De Godos', 'roberto.degodos@noupatufet.coop');

-- 3.4. Rols
-- Tothom té rol docent
INSERT INTO docent_rols (docent_id, rol)
SELECT id, 'docent' FROM docents;

-- Vanessa Roma: Coordinadora d'infantil
INSERT INTO docent_rols (docent_id, rol, etapa_id, nom_carrec) VALUES
  ((SELECT id FROM docents WHERE email = 'vanessa.roma@noupatufet.coop'), 'coordinacio_etapa', (SELECT id FROM etapes WHERE codi = 'EI'), 'Coordinadora d''infantil');

-- Vanessa Roma: Cap de personal
INSERT INTO docent_rols (docent_id, rol, nom_carrec) VALUES
  ((SELECT id FROM docents WHERE email = 'vanessa.roma@noupatufet.coop'), 'cap_personal', 'Cap de personal');

-- Jordi Bosch: Cap d'estudis EP
INSERT INTO docent_rols (docent_id, rol, etapa_id, nom_carrec) VALUES
  ((SELECT id FROM docents WHERE email = 'jordi.bosch@noupatufet.coop'), 'coordinacio_etapa', (SELECT id FROM etapes WHERE codi = 'EP'), 'Cap d''estudis de primària');

-- Josep Cuervas: Cap d'estudis ESO
INSERT INTO docent_rols (docent_id, rol, etapa_id, nom_carrec) VALUES
  ((SELECT id FROM docents WHERE email = 'josep.cuervas@noupatufet.coop'), 'coordinacio_etapa', (SELECT id FROM etapes WHERE codi = 'ESO'), 'Cap d''estudis d''ESO');

-- Ingrid Ribelles: Sotsdirectora
INSERT INTO docent_rols (docent_id, rol, nom_carrec) VALUES
  ((SELECT id FROM docents WHERE email = 'ingrid.ribelles@noupatufet.coop'), 'sotsdirector', 'Sotsdirectora');

-- Francesc Granada: Director
INSERT INTO docent_rols (docent_id, rol, nom_carrec) VALUES
  ((SELECT id FROM docents WHERE email = 'francesc.granada@noupatufet.coop'), 'director', 'Director');

-- 3.5. Docent-etapes
-- EI
INSERT INTO docent_etapes (docent_id, etapa_id)
SELECT d.id, e.id FROM docents d, etapes e
WHERE d.nom IN ('Vanessa Roma', 'David Lozano', 'Beto Oriol', 'Txell Casadesús')
AND e.codi = 'EI';

-- EP
INSERT INTO docent_etapes (docent_id, etapa_id)
SELECT d.id, e.id FROM docents d, etapes e
WHERE d.nom IN ('Anna Rimbau', 'Glòria Pons', 'Berta Roca', 'Maria Batlló', 'Ingrid Ribelles', 'Maria Vallés', 'Jordi Bosch', 'Pau Coya', 'Gerard Companys', 'Roberto De Godos')
AND e.codi = 'EP';

-- ESO
INSERT INTO docent_etapes (docent_id, etapa_id)
SELECT d.id, e.id FROM docents d, etapes e
WHERE d.nom IN ('Josep Cuervas', 'Àgata Miquel', 'Laia Canal', 'Francesc Granada', 'Júlia Ruiz', 'Sol Echegaray', 'Milena Novas')
AND e.codi = 'ESO';

-- Laia Pantinat: totes les etapes (EI, EP, ESO)
INSERT INTO docent_etapes (docent_id, etapa_id)
SELECT d.id, e.id FROM docents d, etapes e
WHERE d.nom = 'Laia Pantinat';

-- Jordi Pere Tàrraga: EP i ESO
INSERT INTO docent_etapes (docent_id, etapa_id)
SELECT d.id, e.id FROM docents d, etapes e
WHERE d.nom = 'Jordi Pere Tàrraga' AND e.codi IN ('EP', 'ESO');
