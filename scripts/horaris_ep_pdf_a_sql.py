#!/usr/bin/env python3
"""
Genera la migració SQL que deixa els horaris d'Educació Primària del curs
26-27 tal com surten al PDF oficial (Horaris_2627/Horaris_EP_Docents_2627.pdf).

Diferències respecte a la càrrega antiga (CSV/Excel):
  - les cel·les combinades ocupen totes les franges de 30 minuts que cobreixen
    (abans només es guardava la primera);
  - les hores sense res escrit es guarden com a 'disponible': són hores en què
    el docent pot substituir;
  - la franja de les 13h00 (migdia) només es guarda si hi ha res escrit.

Ús: python scripts/horaris_ep_pdf_a_sql.py <pdf> <sortida.sql>
"""
import json
import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from parseja_horaris import parse_cell_content  # noqa: E402

# Nom que surt al PDF -> nom a la taula docents
NOMS = {
    'Jordi Bosch': 'Jordi Bosch',
    'Gerard': 'Gerard Companys',
    'Roberto': 'Roberto De Godos',
    'Glòria Pons': 'Glòria Pons',
    'Anna Rimbau': 'Clara Nicolau',
    'Maria Batlló': 'Maria Batlló',
    'Maria Vallés': 'Maria Vallés',
    'Berta Roca': 'Berta Roca',
    'Ingrid Ribelles': 'Ingrid Ribelles',
    'Pau Coya': 'Pau Coya',
}

# El divendres de la Maria Vallés surt tallat al PDF (passa a la pàgina
# següent); es llegeix de l'imatge de les dues pàgines.
DIVENDRES_MARIA_VALLES = [
    ('09:00', '10:00', ['Guàrdia']),
    ('10:00', '11:00', ['CS', 'Taller de robòtica']),
    ('11:00', '11:30', ['Guàrdia']),
    ('11:30', '12:00', ['5è', 'Tutoria']),
    ('12:00', '13:00', ['CM', 'Taller de robòtica']),
    ('15:00', '17:00', ['5è', 'Esport']),
]

NOMS_DIA = ('DILLUNS', 'DIMARTS', 'DIMECRES', 'DIJOUS', 'DIVENDRES', 'DIVEN')


def arregla_linies(linies):
    """Neteja línies d'encapçalament i separa "5èTutoria" en grup + matèria."""
    linies = [l for l in linies if l.upper() not in NOMS_DIA]
    if len(linies) == 1:
        m = re.match(r'^(\dè|\d[rnt])\s*(\S.*)$', linies[0])
        if m:
            return [m.group(1), m.group(2)]
    return linies


def main():
    pdf, sortida = sys.argv[1], sys.argv[2]
    tmp = os.path.join(tempfile.gettempdir(), 'horaris_ep_pdf.json')
    subprocess.run([sys.executable, '-W', 'ignore',
                    os.path.join(os.path.dirname(__file__), 'extreu_horaris_pdf.py'), pdf, tmp], check=True)
    pagines = json.load(open(tmp, encoding='utf-8'))

    files_sql = []
    rangs = []
    resum = []
    for pg in pagines:
        nom_pdf = pg['docent']
        if nom_pdf not in NOMS:
            continue
        docent = NOMS[nom_pdf]
        rows = pg['files']  # [(inici, fi)]

        cel_les = []
        for c in pg['cel_les']:
            linies = arregla_linies(c['linies'])
            if not linies:
                continue
            if docent == 'Maria Vallés' and c['dia'] == 5:
                continue  # es substitueix per la lectura manual
            cel_les.append((c['dia'], [tuple(f) for f in c['franges']], linies))
        if docent == 'Maria Vallés':
            for inici, fi, linies in DIVENDRES_MARIA_VALLES:
                franges = [(a, b) for a, b in rows if a >= inici and b <= fi]
                cel_les.append((5, franges, linies))

        entrades = []
        for dia, franges, linies in cel_les:
            dies = [dia] if dia else [1, 2, 3, 4, 5]  # fila sencera (reunió)
            parsed = parse_cell_content(chr(10).join(linies), 'EP')
            if not parsed:
                continue
            # Ambients/Tallers de cicle (CI, CS, CM) no són un grup de la taula
            if parsed.get('grup') in ('CI', 'CS', 'CM'):
                parsed['materia'] = f"{parsed['grup']} {parsed['materia']}".strip()
                parsed['grup'] = None
            for d in dies:
                entrades.append((d, franges[0][0], franges[-1][1], parsed))

        q = lambda v: 'NULL' if v is None else "'" + v.replace("'", "''") + "'"
        for d, inici, fi, p in sorted(entrades, key=lambda e: (e[0], e[1])):
            files_sql.append(
                f"  ({q(docent)}, {d}, '{inici}', '{fi}', '{p['tipus']}', {q(p.get('grup'))}, {q(p.get('materia'))})")
        rangs.append(f"  ({q(docent)}, '{rows[-1][1]}')")
        resum.append(f'-- {docent}: {len(entrades)} cel·les')

    sql = f"""-- Horaris d'Educació Primària curs 26-27, tal com surten al PDF oficial
-- (Horaris_2627/Horaris_EP_Docents_2627.pdf). Generat amb
-- scripts/horaris_ep_pdf_a_sql.py. Corregeix:
--   * cel·les combinades: abans només es guardava la primera franja de 30 min
--     (p. ex. el Castellà de 1r del Jordi Bosch, dimarts de 9 a 10:30);
--   * files duplicades (docent, dia, franja);
--   * hores sense res escrit: ara són 'disponible' (poden substituir).
{chr(10).join(resum)}

-- Cel·les de l'horari (una per bloc; les combinades ocupen diverses franges)
CREATE TEMP TABLE _cel_les (
  docent TEXT, dia SMALLINT, hora_inici TIME, hora_fi TIME, tipus TEXT, grup TEXT, materia TEXT
) ON COMMIT DROP;

INSERT INTO _cel_les VALUES
{(',' + chr(10)).join(files_sql)};

-- Fins a quina hora té franges cada docent al PDF
CREATE TEMP TABLE _rang (docent TEXT, fins TIME) ON COMMIT DROP;
INSERT INTO _rang VALUES
{(',' + chr(10)).join(rangs)};

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
"""
    with open(sortida, 'w', encoding='utf-8') as f:
        f.write(sql)
    print('\n'.join(resum))


if __name__ == '__main__':
    main()
