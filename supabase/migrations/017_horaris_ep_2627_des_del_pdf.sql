-- Horaris d'Educació Primària curs 26-27, tal com surten al PDF oficial
-- (Horaris_2627/Horaris_EP_Docents_2627.pdf). Generat amb
-- scripts/horaris_ep_pdf_a_sql.py. Corregeix:
--   * cel·les combinades: abans només es guardava la primera franja de 30 min
--     (p. ex. el Castellà de 1r del Jordi Bosch, dimarts de 9 a 10:30);
--   * files duplicades (docent, dia, franja);
--   * hores sense res escrit: ara són 'disponible' (poden substituir).
-- Jordi Bosch: 20 cel·les
-- Gerard Companys: 32 cel·les
-- Roberto De Godos: 22 cel·les
-- Glòria Pons: 33 cel·les
-- Clara Nicolau: 34 cel·les
-- Maria Batlló: 34 cel·les
-- Maria Vallés: 28 cel·les
-- Berta Roca: 31 cel·les
-- Ingrid Ribelles: 17 cel·les
-- Pau Coya: 22 cel·les

-- Cel·les de l'horari (una per bloc; les combinades ocupen diverses franges)
CREATE TEMP TABLE _cel_les (
  docent TEXT, dia SMALLINT, hora_inici TIME, hora_fi TIME, tipus TEXT, grup TEXT, materia TEXT
) ON COMMIT DROP;

INSERT INTO _cel_les VALUES
  ('Jordi Bosch', 1, '15:00', '17:00', 'classe', NULL, 'Ambients CI'),
  ('Jordi Bosch', 2, '09:00', '10:30', 'classe', '1r', 'Castellà'),
  ('Jordi Bosch', 2, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Jordi Bosch', 2, '11:00', '12:00', 'classe', '2n', 'Matemàtiques (Glòria TInd)'),
  ('Jordi Bosch', 2, '12:00', '13:00', 'reunio', NULL, 'REUNIÓ CI'),
  ('Jordi Bosch', 2, '15:00', '16:00', 'classe', '3r', 'Racons Matemàtiques (amb Maria B)'),
  ('Jordi Bosch', 2, '16:00', '17:00', 'classe', '1r', 'APT'),
  ('Jordi Bosch', 3, '09:30', '10:30', 'classe', '3r', 'Castellà'),
  ('Jordi Bosch', 3, '11:00', '12:30', 'classe', '2n', 'Castellà'),
  ('Jordi Bosch', 3, '13:00', '15:00', 'reunio', NULL, 'REUNIÓ EP'),
  ('Jordi Bosch', 3, '15:00', '16:00', 'classe', '2n', 'APT'),
  ('Jordi Bosch', 3, '16:00', '17:00', 'classe', '1r', 'Castellà'),
  ('Jordi Bosch', 4, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Jordi Bosch', 4, '11:00', '12:00', 'classe', '2n', 'Castellà'),
  ('Jordi Bosch', 4, '12:00', '13:00', 'classe', '2n', 'APT'),
  ('Jordi Bosch', 4, '16:00', '17:00', 'classe', '1r', 'APT'),
  ('Jordi Bosch', 5, '09:00', '10:30', 'classe', '3r', 'Castellà'),
  ('Jordi Bosch', 5, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Jordi Bosch', 5, '11:00', '12:00', 'classe', '1r', 'Matemàtiques (Berta TInd)'),
  ('Jordi Bosch', 5, '15:00', '17:00', 'classe', NULL, 'Ambients CI'),
  ('Gerard Companys', 1, '09:00', '10:00', 'classe', NULL, 'AA'),
  ('Gerard Companys', 1, '10:00', '11:00', 'classe', '6è', 'Català'),
  ('Gerard Companys', 1, '11:00', '11:30', 'guardia', NULL, NULL),
  ('Gerard Companys', 1, '11:30', '12:30', 'classe', '5è', 'Taller Paraules (Maria V TInd)'),
  ('Gerard Companys', 1, '12:30', '13:00', 'guardia', NULL, NULL),
  ('Gerard Companys', 1, '15:00', '15:30', 'classe', NULL, 'AA'),
  ('Gerard Companys', 1, '15:30', '17:00', 'classe', '6è', 'Castellà'),
  ('Gerard Companys', 2, '09:00', '10:00', 'reunio', NULL, 'REUNIÓ CS'),
  ('Gerard Companys', 2, '10:00', '11:00', 'classe', '6è', 'Matemàtiques'),
  ('Gerard Companys', 2, '11:00', '11:30', 'guardia', NULL, NULL),
  ('Gerard Companys', 2, '11:30', '13:00', 'classe', '4t', 'Castellà'),
  ('Gerard Companys', 2, '15:00', '16:00', 'classe', '6è', 'Taller Paraules (Íngrid TInd)'),
  ('Gerard Companys', 2, '16:00', '17:00', 'classe', '6è', 'APT'),
  ('Gerard Companys', 3, '09:00', '10:00', 'classe', NULL, 'AA'),
  ('Gerard Companys', 3, '10:00', '11:00', 'guardia', NULL, NULL),
  ('Gerard Companys', 3, '11:00', '12:00', 'guardia', NULL, NULL),
  ('Gerard Companys', 3, '12:00', '13:00', 'classe', NULL, 'AA'),
  ('Gerard Companys', 3, '13:00', '15:00', 'reunio', NULL, 'REUNIÓ EP'),
  ('Gerard Companys', 3, '15:00', '16:00', 'classe', NULL, 'AA'),
  ('Gerard Companys', 3, '16:00', '17:00', 'classe', NULL, 'AA'),
  ('Gerard Companys', 4, '09:00', '10:00', 'classe', '5è', 'APT'),
  ('Gerard Companys', 4, '10:00', '11:00', 'classe', '6è', 'Castellà'),
  ('Gerard Companys', 4, '11:00', '11:30', 'guardia', NULL, NULL),
  ('Gerard Companys', 4, '11:30', '13:00', 'classe', '5è', 'Castellà'),
  ('Gerard Companys', 4, '15:00', '16:00', 'classe', '4t', 'Castellà'),
  ('Gerard Companys', 4, '16:00', '17:00', 'classe', '6è', 'C. Medi'),
  ('Gerard Companys', 5, '09:00', '10:30', 'classe', '4t', 'APT'),
  ('Gerard Companys', 5, '10:30', '11:00', 'guardia', NULL, NULL),
  ('Gerard Companys', 5, '11:00', '11:30', 'esbarjo', NULL, NULL),
  ('Gerard Companys', 5, '11:30', '12:00', 'guardia', NULL, NULL),
  ('Gerard Companys', 5, '12:00', '13:00', 'classe', '5è', 'Castellà'),
  ('Gerard Companys', 5, '15:00', '17:00', 'classe', '6è', 'Esport'),
  ('Roberto De Godos', 1, '09:00', '10:00', 'classe', '6è', 'APT'),
  ('Roberto De Godos', 1, '10:00', '11:00', 'guardia', NULL, NULL),
  ('Roberto De Godos', 1, '11:00', '11:30', 'esbarjo', NULL, NULL),
  ('Roberto De Godos', 1, '12:00', '13:00', 'classe', NULL, 'AA'),
  ('Roberto De Godos', 2, '09:00', '10:00', 'classe', '5è', 'APT'),
  ('Roberto De Godos', 2, '10:00', '11:00', 'guardia', NULL, NULL),
  ('Roberto De Godos', 2, '11:00', '12:00', 'classe', NULL, 'AA'),
  ('Roberto De Godos', 2, '12:00', '13:00', 'classe', '2n', 'Anglès'),
  ('Roberto De Godos', 3, '09:00', '10:00', 'classe', '1r', 'Anglès'),
  ('Roberto De Godos', 3, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Roberto De Godos', 3, '11:00', '12:00', 'classe', NULL, 'AA'),
  ('Roberto De Godos', 3, '12:00', '13:00', 'classe', NULL, 'AA'),
  ('Roberto De Godos', 3, '13:00', '14:00', 'reunio', NULL, 'REUNIÓ EP'),
  ('Roberto De Godos', 4, '09:00', '10:00', 'classe', '6è', 'APT'),
  ('Roberto De Godos', 4, '10:00', '11:00', 'guardia', NULL, NULL),
  ('Roberto De Godos', 4, '11:00', '12:00', 'classe', NULL, 'AA'),
  ('Roberto De Godos', 4, '12:00', '13:00', 'classe', NULL, 'AA'),
  ('Roberto De Godos', 5, '09:00', '10:00', 'classe', '1r', 'Anglès'),
  ('Roberto De Godos', 5, '10:00', '10:30', 'guardia', NULL, NULL),
  ('Roberto De Godos', 5, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Roberto De Godos', 5, '11:00', '12:00', 'classe', '2n', 'Anglès'),
  ('Roberto De Godos', 5, '12:00', '13:00', 'classe', NULL, 'AA'),
  ('Glòria Pons', 1, '09:00', '10:30', 'classe', '2n', 'C. Medi'),
  ('Glòria Pons', 1, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Glòria Pons', 1, '11:00', '12:30', 'classe', '2n', 'Natació'),
  ('Glòria Pons', 1, '12:30', '13:00', 'classe', '2n', 'Tutoria'),
  ('Glòria Pons', 1, '15:00', '17:00', 'classe', NULL, 'CI Ambients'),
  ('Glòria Pons', 2, '09:00', '10:00', 'classe', '2n', 'Matemàtiques'),
  ('Glòria Pons', 2, '10:00', '10:30', 'classe', '2n', 'Català'),
  ('Glòria Pons', 2, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Glòria Pons', 2, '11:00', '12:00', 'classe', '2n', 'Tutories individualitzades (Jordi Racons Mat)'),
  ('Glòria Pons', 2, '12:00', '13:00', 'reunio', NULL, 'REUNIÓ CI'),
  ('Glòria Pons', 2, '15:00', '16:00', 'classe', '1r', 'APT'),
  ('Glòria Pons', 2, '16:00', '17:00', 'guardia', NULL, NULL),
  ('Glòria Pons', 3, '09:00', '09:30', 'classe', '2n', 'Tutoria'),
  ('Glòria Pons', 3, '09:30', '10:30', 'classe', '2n', 'Català'),
  ('Glòria Pons', 3, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Glòria Pons', 3, '11:00', '12:00', 'classe', '1r', 'APT'),
  ('Glòria Pons', 3, '12:00', '12:30', 'guardia', NULL, NULL),
  ('Glòria Pons', 3, '12:30', '13:00', 'classe', '2n', 'Matemàtiques'),
  ('Glòria Pons', 3, '13:00', '15:00', 'reunio', NULL, 'REUNIÓ EP'),
  ('Glòria Pons', 3, '15:00', '16:00', 'guardia', NULL, NULL),
  ('Glòria Pons', 3, '16:00', '17:00', 'classe', '2n', 'APT'),
  ('Glòria Pons', 4, '09:00', '10:00', 'classe', '2n', 'C. Medi'),
  ('Glòria Pons', 4, '10:00', '10:30', 'classe', '2n', 'Matemàtiques'),
  ('Glòria Pons', 4, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Glòria Pons', 4, '11:00', '12:00', 'guardia', NULL, NULL),
  ('Glòria Pons', 4, '12:00', '13:00', 'guardia', NULL, NULL),
  ('Glòria Pons', 4, '15:00', '16:00', 'classe', '2n', 'Esport'),
  ('Glòria Pons', 4, '16:00', '17:00', 'classe', '2n', 'APT'),
  ('Glòria Pons', 5, '09:00', '10:30', 'classe', '2n', 'EViP'),
  ('Glòria Pons', 5, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Glòria Pons', 5, '11:00', '12:00', 'guardia', NULL, NULL),
  ('Glòria Pons', 5, '12:00', '13:00', 'classe', '2n', 'Racons Llengua (amb Anna)'),
  ('Glòria Pons', 5, '15:00', '17:00', 'classe', NULL, 'CI Ambients'),
  ('Clara Nicolau', 1, '09:00', '10:00', 'classe', '4t', 'Català'),
  ('Clara Nicolau', 1, '10:00', '11:30', 'classe', '4t', 'Natació'),
  ('Clara Nicolau', 1, '11:30', '12:00', 'esbarjo', NULL, NULL),
  ('Clara Nicolau', 1, '12:00', '13:00', 'classe', '4t', 'Tutoria'),
  ('Clara Nicolau', 1, '15:00', '15:30', 'classe', '4t', 'Matemàtiques'),
  ('Clara Nicolau', 1, '15:30', '17:00', 'guardia', NULL, NULL),
  ('Clara Nicolau', 2, '09:00', '10:30', 'classe', '4t', 'C. Medi'),
  ('Clara Nicolau', 2, '10:30', '11:00', 'guardia', NULL, NULL),
  ('Clara Nicolau', 2, '11:00', '11:30', 'classe', '4t', 'Matemàtiques'),
  ('Clara Nicolau', 2, '11:30', '12:00', 'guardia', NULL, NULL),
  ('Clara Nicolau', 2, '12:00', '13:00', 'guardia', NULL, NULL),
  ('Clara Nicolau', 2, '15:00', '16:30', 'classe', '4t', 'APT'),
  ('Clara Nicolau', 2, '16:30', '17:00', 'classe', '4t', 'Català'),
  ('Clara Nicolau', 3, '09:00', '10:30', 'classe', '4t', 'EViP'),
  ('Clara Nicolau', 3, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Clara Nicolau', 3, '11:00', '12:00', 'classe', '3r', 'Taller de Paraules (Maria B T Ind)'),
  ('Clara Nicolau', 3, '12:00', '13:00', 'classe', '1r', 'Racons de Llengua (amb Berta)'),
  ('Clara Nicolau', 3, '13:00', '15:00', 'reunio', NULL, 'REUNIÓ EP'),
  ('Clara Nicolau', 3, '15:00', '16:00', 'classe', '3r', 'APT'),
  ('Clara Nicolau', 3, '16:00', '17:00', 'classe', '4t', 'Matemàtiques'),
  ('Clara Nicolau', 4, '09:00', '10:00', 'classe', '4t', 'APT'),
  ('Clara Nicolau', 4, '10:00', '10:30', 'classe', '4t', 'Matemàtiques'),
  ('Clara Nicolau', 4, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Clara Nicolau', 4, '11:00', '12:00', 'classe', '4t', 'Català'),
  ('Clara Nicolau', 4, '12:00', '13:00', 'classe', '3r', 'Racons de Llengua (amb Maria B)'),
  ('Clara Nicolau', 4, '15:00', '16:00', 'guardia', NULL, NULL),
  ('Clara Nicolau', 4, '16:00', '17:00', 'classe', '4t', 'Esport'),
  ('Clara Nicolau', 5, '09:00', '10:00', 'reunio', NULL, 'REUNIÓ CM'),
  ('Clara Nicolau', 5, '10:00', '10:30', 'guardia', NULL, NULL),
  ('Clara Nicolau', 5, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Clara Nicolau', 5, '11:00', '12:00', 'classe', '4t', 'Tutories individualitzades (Maria B T Paraules)'),
  ('Clara Nicolau', 5, '12:00', '13:00', 'classe', '2n', 'Racons de Llengua (amb Glòria)'),
  ('Clara Nicolau', 5, '15:00', '16:00', 'classe', '4t', 'Matemàtiques'),
  ('Clara Nicolau', 5, '16:00', '17:00', 'classe', '4t', 'C. Medi'),
  ('Maria Batlló', 1, '09:00', '10:30', 'classe', '3r', 'C. Medi'),
  ('Maria Batlló', 1, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Maria Batlló', 1, '11:00', '12:30', 'classe', '3r', 'Natació'),
  ('Maria Batlló', 1, '12:30', '13:00', 'classe', '3r', 'Matemàtiques'),
  ('Maria Batlló', 1, '15:00', '16:30', 'classe', '3r', 'EViP'),
  ('Maria Batlló', 1, '16:30', '17:00', 'classe', '3r', 'Tutoria'),
  ('Maria Batlló', 2, '09:00', '10:30', 'classe', '3r', 'Català'),
  ('Maria Batlló', 2, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Maria Batlló', 2, '11:00', '12:30', 'guardia', NULL, NULL),
  ('Maria Batlló', 2, '12:30', '13:00', 'classe', '3r', 'Tutoria'),
  ('Maria Batlló', 2, '15:00', '16:00', 'classe', '3r', 'Racons de Matemàtiques (amb Jordi)'),
  ('Maria Batlló', 2, '16:00', '17:00', 'classe', '3r', 'APT'),
  ('Maria Batlló', 3, '09:00', '09:30', 'classe', '3r', 'Matemàtiques'),
  ('Maria Batlló', 3, '09:30', '10:00', 'guardia', NULL, NULL),
  ('Maria Batlló', 3, '10:00', '11:00', 'classe', NULL, 'CS Taller experimentació'),
  ('Maria Batlló', 3, '11:00', '12:00', 'classe', '3r', 'Tutories individualitzades (Anna T Paraules)'),
  ('Maria Batlló', 3, '12:00', '13:00', 'classe', NULL, 'CM Taller experimentació'),
  ('Maria Batlló', 3, '13:00', '15:00', 'reunio', NULL, 'REUNIÓ EP'),
  ('Maria Batlló', 3, '15:00', '16:00', 'guardia', NULL, NULL),
  ('Maria Batlló', 3, '16:00', '17:00', 'guardia', NULL, NULL),
  ('Maria Batlló', 4, '09:00', '10:00', 'classe', '3r', 'APT'),
  ('Maria Batlló', 4, '10:00', '10:30', 'classe', '3r', 'Matemàtiques'),
  ('Maria Batlló', 4, '10:30', '11:00', 'guardia', NULL, NULL),
  ('Maria Batlló', 4, '11:00', '11:30', 'esbarjo', NULL, NULL),
  ('Maria Batlló', 4, '11:30', '12:00', 'guardia', NULL, NULL),
  ('Maria Batlló', 4, '12:00', '13:00', 'classe', '3r', 'Racons de Llengua (amb Anna)'),
  ('Maria Batlló', 4, '15:00', '16:00', 'classe', '3r', 'C. Medi'),
  ('Maria Batlló', 4, '16:00', '17:00', 'classe', '3r', 'Esport'),
  ('Maria Batlló', 5, '09:00', '10:00', 'reunio', NULL, 'REUNIÓ CM'),
  ('Maria Batlló', 5, '10:00', '11:00', 'classe', NULL, 'CS Taller experimentació'),
  ('Maria Batlló', 5, '11:00', '12:00', 'classe', '4t', 'Taller de Paraules (Anna T Ind)'),
  ('Maria Batlló', 5, '12:00', '13:00', 'classe', NULL, 'CM Taller experimentació'),
  ('Maria Batlló', 5, '15:00', '16:00', 'classe', '3r', 'Matemàtiques'),
  ('Maria Batlló', 5, '16:00', '17:00', 'classe', '3r', 'APT'),
  ('Maria Vallés', 1, '09:00', '10:00', 'classe', '5è', 'C. Medi'),
  ('Maria Vallés', 1, '10:00', '11:00', 'classe', '5è', 'Taller de nombres'),
  ('Maria Vallés', 1, '11:00', '11:30', 'guardia', NULL, NULL),
  ('Maria Vallés', 1, '11:30', '12:30', 'classe', '5è', 'Tutories individualitzades (Gerard T Paraules)'),
  ('Maria Vallés', 1, '12:30', '13:00', 'classe', '5è', 'Tutoria'),
  ('Maria Vallés', 1, '15:00', '16:00', 'classe', '5è', 'Matemàtiques'),
  ('Maria Vallés', 1, '16:00', '17:00', 'classe', '5è', 'APT'),
  ('Maria Vallés', 2, '09:00', '10:00', 'reunio', NULL, 'REUNIÓ CS'),
  ('Maria Vallés', 2, '10:00', '11:00', 'classe', '5è', 'APT'),
  ('Maria Vallés', 2, '11:00', '11:30', 'esbarjo', NULL, NULL),
  ('Maria Vallés', 2, '11:30', '13:00', 'classe', '5è', 'Matemàtiques'),
  ('Maria Vallés', 2, '15:00', '16:00', 'classe', '5è', 'Pensament Crític'),
  ('Maria Vallés', 2, '16:00', '17:00', 'classe', '5è', 'Català'),
  ('Maria Vallés', 3, '09:00', '10:00', 'classe', '5è', 'Matemàtiques'),
  ('Maria Vallés', 3, '10:00', '11:00', 'classe', NULL, 'CS Taller de robòtica'),
  ('Maria Vallés', 3, '11:00', '12:00', 'guardia', NULL, NULL),
  ('Maria Vallés', 3, '12:00', '13:00', 'classe', NULL, 'CM Taller de robòtica'),
  ('Maria Vallés', 3, '13:00', '15:00', 'reunio', NULL, 'REUNIÓ EP'),
  ('Maria Vallés', 3, '15:00', '16:00', 'classe', '5è', 'C. Medi'),
  ('Maria Vallés', 3, '16:00', '17:00', 'classe', '6è', 'APT'),
  ('Maria Vallés', 4, '15:00', '16:30', 'classe', '5è', 'Català'),
  ('Maria Vallés', 4, '16:30', '17:00', 'classe', '5è', 'Tutoria'),
  ('Maria Vallés', 5, '09:00', '10:00', 'guardia', NULL, NULL),
  ('Maria Vallés', 5, '10:00', '11:00', 'classe', NULL, 'CS Taller de robòtica'),
  ('Maria Vallés', 5, '11:00', '11:30', 'guardia', NULL, NULL),
  ('Maria Vallés', 5, '11:30', '12:00', 'classe', '5è', 'Tutoria'),
  ('Maria Vallés', 5, '12:00', '13:00', 'classe', NULL, 'CM Taller de robòtica'),
  ('Maria Vallés', 5, '15:00', '17:00', 'classe', '5è', 'Esport'),
  ('Berta Roca', 1, '09:00', '10:30', 'classe', '1r', 'C. Medi'),
  ('Berta Roca', 1, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Berta Roca', 1, '11:00', '12:30', 'classe', '1r', 'Natació'),
  ('Berta Roca', 1, '12:30', '13:00', 'classe', '1r', 'Tutoria'),
  ('Berta Roca', 1, '15:00', '17:00', 'classe', NULL, 'CI Ambients'),
  ('Berta Roca', 2, '09:00', '10:30', 'guardia', NULL, NULL),
  ('Berta Roca', 2, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Berta Roca', 2, '11:00', '12:30', 'classe', '1r', 'EViP'),
  ('Berta Roca', 2, '12:30', '13:00', 'classe', '1r', 'Matemàtiques'),
  ('Berta Roca', 2, '15:00', '16:00', 'classe', '2n', 'Música'),
  ('Berta Roca', 2, '16:00', '17:00', 'classe', '2n', 'APT'),
  ('Berta Roca', 3, '10:00', '10:30', 'classe', '1r', 'Matemàtiques'),
  ('Berta Roca', 3, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Berta Roca', 3, '11:00', '12:00', 'guardia', NULL, NULL),
  ('Berta Roca', 3, '12:00', '13:00', 'classe', '1r', 'Racons Llengua (amb Anna)'),
  ('Berta Roca', 3, '13:00', '15:00', 'reunio', NULL, 'REUNIÓ EP'),
  ('Berta Roca', 3, '15:00', '16:00', 'classe', '1r', 'Català'),
  ('Berta Roca', 3, '16:00', '17:00', 'classe', '3r', 'Música'),
  ('Berta Roca', 4, '09:00', '10:00', 'classe', '1r', 'C. Medi'),
  ('Berta Roca', 4, '10:00', '10:30', 'classe', '1r', 'Tutoria'),
  ('Berta Roca', 4, '10:30', '11:00', 'esbarjo', NULL, NULL),
  ('Berta Roca', 4, '11:00', '12:00', 'classe', '1r', 'Música'),
  ('Berta Roca', 4, '12:00', '13:00', 'classe', '1r', 'Matemàtiques'),
  ('Berta Roca', 4, '15:00', '16:00', 'classe', '1r', 'Esport'),
  ('Berta Roca', 4, '16:00', '17:00', 'guardia', NULL, NULL),
  ('Berta Roca', 5, '09:00', '10:00', 'guardia', NULL, NULL),
  ('Berta Roca', 5, '10:00', '10:30', 'classe', '1r', 'Català'),
  ('Berta Roca', 5, '10:30', '11:00', 'guardia', NULL, NULL),
  ('Berta Roca', 5, '11:00', '12:00', 'classe', '1r', 'Tutories Individualitzades (Jordi Racons Mat)'),
  ('Berta Roca', 5, '12:00', '13:00', 'classe', '1r', 'APT'),
  ('Berta Roca', 5, '15:00', '17:00', 'classe', NULL, 'CI Ambients'),
  ('Ingrid Ribelles', 1, '10:30', '11:30', 'reunio', NULL, 'REUNIÓ STEM'),
  ('Ingrid Ribelles', 1, '12:30', '13:00', 'classe', '6è', 'Tutoria'),
  ('Ingrid Ribelles', 1, '15:00', '15:30', 'classe', '6è', 'Matemàtiques'),
  ('Ingrid Ribelles', 2, '09:00', '10:00', 'reunio', NULL, 'REUNIÓ CS'),
  ('Ingrid Ribelles', 2, '10:30', '11:30', 'reunio', NULL, 'REUNIÓ Coord ESO'),
  ('Ingrid Ribelles', 2, '11:30', '12:30', 'classe', '6è', 'C. Medi'),
  ('Ingrid Ribelles', 2, '12:30', '13:00', 'classe', '6è', 'Tutoria'),
  ('Ingrid Ribelles', 2, '15:00', '16:00', 'classe', '6è', 'Tutories Individualitzades (Gerard T Paraules)'),
  ('Ingrid Ribelles', 3, '09:00', '10:00', 'reunio', NULL, 'REUNIÓ SocArt'),
  ('Ingrid Ribelles', 3, '11:30', '13:00', 'classe', '6è', 'Racons Llengua'),
  ('Ingrid Ribelles', 3, '13:00', '15:00', 'reunio', NULL, 'REUNIÓ EP'),
  ('Ingrid Ribelles', 3, '15:00', '16:00', 'classe', '6è', 'Taller de nombres'),
  ('Ingrid Ribelles', 4, '15:00', '16:00', 'classe', '6è', 'Matemàtiques'),
  ('Ingrid Ribelles', 5, '09:00', '10:00', 'classe', '6è', 'Pensament Crític'),
  ('Ingrid Ribelles', 5, '10:30', '11:30', 'reunio', NULL, 'REUNIÓ Lingüístic'),
  ('Ingrid Ribelles', 5, '11:30', '12:30', 'classe', '6è', 'Matemàtiques'),
  ('Ingrid Ribelles', 5, '12:30', '13:00', 'classe', '6è', 'Tutoria'),
  ('Pau Coya', 1, '15:00', '15:30', 'guardia', NULL, NULL),
  ('Pau Coya', 1, '15:30', '17:00', 'classe', '4t', 'Competència Digital'),
  ('Pau Coya', 2, '09:00', '10:00', 'classe', '6è', 'Anglès'),
  ('Pau Coya', 2, '10:00', '11:00', 'guardia', NULL, NULL),
  ('Pau Coya', 2, '11:00', '12:30', 'classe', '3r', 'Competència Digital'),
  ('Pau Coya', 2, '12:30', '13:00', 'guardia', NULL, NULL),
  ('Pau Coya', 3, '09:00', '10:00', 'classe', '6è', 'Anglès'),
  ('Pau Coya', 3, '10:00', '11:00', 'classe', NULL, 'CS Taller de comunicació'),
  ('Pau Coya', 3, '11:00', '11:30', 'esbarjo', NULL, NULL),
  ('Pau Coya', 3, '11:30', '12:00', 'guardia', NULL, NULL),
  ('Pau Coya', 3, '12:00', '13:00', 'classe', NULL, 'CM Taller de comunicació'),
  ('Pau Coya', 3, '13:00', '15:00', 'reunio', NULL, 'REUNIÓ EP'),
  ('Pau Coya', 3, '15:00', '16:00', 'classe', '4t', 'Anglès'),
  ('Pau Coya', 3, '16:00', '17:00', 'classe', '5è', 'Anglès'),
  ('Pau Coya', 4, '09:00', '10:00', 'guardia', NULL, NULL),
  ('Pau Coya', 4, '10:00', '11:00', 'classe', '5è', 'Anglès'),
  ('Pau Coya', 4, '11:00', '12:00', 'classe', '3r', 'Anglès'),
  ('Pau Coya', 4, '12:00', '13:00', 'classe', '4t', 'Anglès'),
  ('Pau Coya', 5, '09:00', '10:00', 'reunio', NULL, 'REUNIÓ CM'),
  ('Pau Coya', 5, '10:00', '11:00', 'classe', NULL, 'CS Taller de comunicació'),
  ('Pau Coya', 5, '11:00', '12:00', 'classe', '3r', 'Anglès'),
  ('Pau Coya', 5, '12:00', '13:00', 'classe', NULL, 'CM Taller de comunicació');

-- Fins a quina hora té franges cada docent al PDF
CREATE TEMP TABLE _rang (docent TEXT, fins TIME) ON COMMIT DROP;
INSERT INTO _rang VALUES
  ('Jordi Bosch', '17:00'),
  ('Gerard Companys', '17:00'),
  ('Roberto De Godos', '14:00'),
  ('Glòria Pons', '17:00'),
  ('Clara Nicolau', '17:00'),
  ('Maria Batlló', '17:00'),
  ('Maria Vallés', '17:00'),
  ('Berta Roca', '17:00'),
  ('Ingrid Ribelles', '17:00'),
  ('Pau Coya', '17:00');

-- Una fila per franja de 30 minuts coberta per cada cel·la (o la franja
-- del migdia, 13h00-15h00 o 13h00-14h00)
CREATE TEMP TABLE _objectiu ON COMMIT DROP AS
SELECT d.id AS docent_id, c.dia, f.id AS franja_id, c.tipus, g.id AS grup_id, c.materia
FROM _cel_les c
JOIN docents d ON d.nom = c.docent
JOIN etapes e ON e.codi = 'EP'
JOIN franges_horaries f ON f.etapa_id = e.id
  AND f.hora_inici >= c.hora_inici AND f.hora_fi <= c.hora_fi
  AND ((f.hora_fi - f.hora_inici) = INTERVAL '30 minutes'
       OR (f.hora_inici = c.hora_inici AND f.hora_fi = c.hora_fi AND f.hora_inici = TIME '13:00'))
LEFT JOIN grups g ON g.codi = c.grup;

-- Hores sense res escrit: 'disponible' (poden substituir). No s'hi compta el
-- migdia (franges de les 13h00).
INSERT INTO _objectiu
SELECT d.id, dia.n, f.id, 'disponible', NULL, NULL
FROM _rang r
JOIN docents d ON d.nom = r.docent
JOIN etapes e ON e.codi = 'EP'
JOIN franges_horaries f ON f.etapa_id = e.id
  AND (f.hora_fi - f.hora_inici) = INTERVAL '30 minutes'
  AND f.hora_inici >= TIME '09:00' AND f.hora_inici <> TIME '13:00'
  AND f.hora_fi <= r.fins
CROSS JOIN generate_series(1, 5) AS dia(n)
WHERE NOT EXISTS (
  SELECT 1 FROM _objectiu o WHERE o.docent_id = d.id AND o.dia = dia.n AND o.franja_id = f.id);

-- Docents afectats
CREATE TEMP TABLE _afectats ON COMMIT DROP AS SELECT DISTINCT docent_id FROM _objectiu;

-- Per cada (docent, dia, franja) es conserva una sola fila (la que ja tenen
-- referenciada, si n'hi ha) i les altres es fusionen cap a ella.
CREATE TEMP TABLE _mestra ON COMMIT DROP AS
SELECT DISTINCT ON (h.docent_id, h.dia_setmana, h.franja_id)
       h.docent_id, h.dia_setmana, h.franja_id, h.id AS mestra_id
FROM horari_setmanal h
JOIN franges_horaries f ON f.id = h.franja_id
JOIN etapes e ON e.id = f.etapa_id AND e.codi = 'EP'
WHERE h.docent_id IN (SELECT docent_id FROM _afectats)
ORDER BY h.docent_id, h.dia_setmana, h.franja_id,
  (EXISTS (SELECT 1 FROM substitucions s WHERE s.horari_setmanal_id = h.id)
   OR EXISTS (SELECT 1 FROM absencia_feines a WHERE a.horari_setmanal_id = h.id)) DESC, h.id;

UPDATE substitucions s SET horari_setmanal_id = m.mestra_id
FROM horari_setmanal h JOIN _mestra m
  ON m.docent_id = h.docent_id AND m.dia_setmana = h.dia_setmana AND m.franja_id = h.franja_id
WHERE s.horari_setmanal_id = h.id AND h.id <> m.mestra_id;

DELETE FROM absencia_feines a USING horari_setmanal h JOIN _mestra m
  ON m.docent_id = h.docent_id AND m.dia_setmana = h.dia_setmana AND m.franja_id = h.franja_id
WHERE a.horari_setmanal_id = h.id AND h.id <> m.mestra_id
  AND EXISTS (SELECT 1 FROM absencia_feines b WHERE b.horari_setmanal_id = m.mestra_id
              AND b.absencia_id = a.absencia_id AND b.data = a.data);
UPDATE absencia_feines a SET horari_setmanal_id = m.mestra_id
FROM horari_setmanal h JOIN _mestra m
  ON m.docent_id = h.docent_id AND m.dia_setmana = h.dia_setmana AND m.franja_id = h.franja_id
WHERE a.horari_setmanal_id = h.id AND h.id <> m.mestra_id;

DELETE FROM horari_setmanal h USING _mestra m
WHERE h.docent_id = m.docent_id AND h.dia_setmana = m.dia_setmana
  AND h.franja_id = m.franja_id AND h.id <> m.mestra_id;

-- Actualitza les files que ja existeixen
UPDATE horari_setmanal h
SET tipus = o.tipus, grup_id = o.grup_id, materia = o.materia,
    aula = NULL, parella_docent_id = NULL, tipus_parella = NULL
FROM _objectiu o
WHERE h.docent_id = o.docent_id AND h.dia_setmana = o.dia AND h.franja_id = o.franja_id;

-- Insereix les que no existien
INSERT INTO horari_setmanal (docent_id, dia_setmana, franja_id, tipus, grup_id, materia)
SELECT o.docent_id, o.dia, o.franja_id, o.tipus, o.grup_id, o.materia
FROM _objectiu o
WHERE NOT EXISTS (
  SELECT 1 FROM horari_setmanal h
  WHERE h.docent_id = o.docent_id AND h.dia_setmana = o.dia AND h.franja_id = o.franja_id);

-- Elimina les files d'EP d'aquests docents que ja no surten al PDF i que
-- ningú referencia (p. ex. franges que ara són part d'una cel·la combinada
-- amb una altra durada)
DELETE FROM horari_setmanal h
USING franges_horaries f, etapes e
WHERE f.id = h.franja_id AND e.id = f.etapa_id AND e.codi = 'EP'
  AND h.docent_id IN (SELECT docent_id FROM _afectats)
  AND NOT EXISTS (SELECT 1 FROM _objectiu o
                  WHERE o.docent_id = h.docent_id AND o.dia = h.dia_setmana AND o.franja_id = h.franja_id)
  AND NOT EXISTS (SELECT 1 FROM substitucions s WHERE s.horari_setmanal_id = h.id)
  AND NOT EXISTS (SELECT 1 FROM absencia_feines a WHERE a.horari_setmanal_id = h.id);
