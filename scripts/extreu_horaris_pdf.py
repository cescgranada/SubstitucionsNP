#!/usr/bin/env python3
"""
Extreu els horaris d'Educació Primària del PDF oficial (fitxer d'horaris per
docent) respectant les cel·les combinades, que els CSV/Excel no conserven bé.

Ús: python scripts/extreu_horaris_pdf.py Horaris_2627/Horaris_EP_Docents_2627.pdf sortida.json
"""
import json
import re
import sys
import warnings

warnings.filterwarnings('ignore')
import fitz  # PyMuPDF

DIES = ['dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres']
RE_HORA = re.compile(r'^(\d{2})h(\d{2})\s*-\s*(\d{2})h(\d{2})$')


def extreu_pagina(pagina):
    blocs = pagina.get_text('blocks')

    # Files: etiquetes d'hora de la primera columna
    files = []
    for x0, y0, x1, y1, text, *_ in blocs:
        m = RE_HORA.match(text.strip())
        if m:
            files.append({
                'inici': f'{m[1]}:{m[2]}', 'fi': f'{m[3]}:{m[4]}', 'yc': (y0 + y1) / 2,
            })
    files.sort(key=lambda f: f['yc'])
    if not files:
        return None

    # Vores horitzontals de cel·la (rectangles molt prims, plens de negre)
    vores = []
    for d in pagina.get_drawings():
        for it in d['items']:
            if it[0] == 're':
                r = it[1]
                if (r.y1 - r.y0) < 1.5 and (r.x1 - r.x0) > 20:
                    vores.append((r.x0, r.x1, (r.y0 + r.y1) / 2))
    # Rectangles de farciment de la columna d'hores: marquen els límits de fila
    limits = []
    for d in pagina.get_drawings():
        for it in d['items']:
            if it[0] == 're':
                r = it[1]
                if abs(r.x0 - 51.0) < 1.5 and abs(r.x1 - 122.9) < 1.5 and (r.y1 - r.y0) > 20:
                    limits.append((r.y0, r.y1))
    limits.sort()

    # Columnes de dies: centres dels encapçalaments (algunes pàgines tenen la
    # taula més ampla o tallada, així que no es fixen a mà)
    centres = {}
    for x0, y0, x1, y1, text, *_ in pagina.get_text('words'):
        for i, nom_dia in enumerate(['DILLUNS', 'DIMARTS', 'DIMECRES', 'DIJOUS', 'DIVENDRES']):
            if text.strip().upper() == nom_dia and y0 < 130:
                centres[i] = (x0 + x1) / 2
    if len(centres) < 4:
        return None
    separacio = (centres[3] - centres[0]) / 3
    for i in range(5):
        centres.setdefault(i, centres[0] + separacio * i)
    capcalera = (0, 97, 0, 112)
    amplada = separacio

    def columna(xc):
        return min(range(5), key=lambda i: abs(centres[i] - xc))

    # Nom del docent: la primera línia de la capçalera que no és "CURS ..."
    nom = None
    capcalera_y = capcalera[1]
    for bloc in sorted(pagina.get_text('dict')['blocks'], key=lambda b: b['bbox'][1]):
        for ln in bloc.get('lines', []):
            t = ' '.join(''.join(sp['text'] for sp in ln['spans']).split())
            if t and ln['bbox'][3] < capcalera_y and not t.upper().startswith('CURS') and nom is None:
                nom = t

    # Línies de text -> cel·les. Les línies d'una mateixa columna se separen
    # quan hi ha una vora horitzontal entre elles (són cel·les diferents).
    linies = []
    for bloc in pagina.get_text('dict')['blocks']:
        for ln in bloc.get('lines', []):
            t = ' '.join(''.join(sp['text'] for sp in ln['spans']).split())
            if not t:
                continue
            x0, y0, x1, y1 = ln['bbox']
            if RE_HORA.match(t) or t == nom or t.upper().startswith(('CURS', 'DILLUNS', 'DIMARTS')):
                continue
            if capcalera and y1 <= capcalera[3] + 1:
                continue
            linies.append({'t': t, 'xc': (x0 + x1) / 2, 'yc': (y0 + y1) / 2, 'w': x1 - x0})

    def vora_entre(col, ya, yb):
        centre_x = centres[col]
        return any(v[0] <= centre_x <= v[1] and ya < v[2] < yb for v in vores)

    cel_les = []
    for col in range(5):
        de_columna = sorted(
            (l for l in linies if columna(l['xc']) == col and l['w'] < amplada * 1.6),
            key=lambda l: l['yc'])
        grups = []
        for l in de_columna:
            if grups and not vora_entre(col, grups[-1][-1]['yc'], l['yc']) and l['yc'] - grups[-1][-1]['yc'] < 16:
                grups[-1].append(l)
            else:
                grups.append([l])
        for g in grups:
            yc = sum(l['yc'] for l in g) / len(g)
            centre_x = centres[col]
            sobre = [v[2] for v in vores if v[0] <= centre_x <= v[1] and v[2] <= g[0]['yc']]
            sota = [v[2] for v in vores if v[0] <= centre_x <= v[1] and v[2] >= g[-1]['yc']]
            y_sup = max(sobre, default=None)
            y_inf = min(sota, default=None)
            cobertes = [i for i, f in enumerate(files)
                        if (y_sup is None or f['yc'] > y_sup) and (y_inf is None or f['yc'] < y_inf)]
            if not cobertes:
                cobertes = [min(range(len(files)), key=lambda i: abs(files[i]['yc'] - yc))]
            cel_les.append({
                'dia': col + 1,
                'dia_nom': DIES[col],
                'inici': files[cobertes[0]]['inici'],
                'fi': files[cobertes[-1]]['fi'],
                'text': ' / '.join(l['t'] for l in g),
                'linies': [l['t'] for l in g],
                'franges': [(files[i]['inici'], files[i]['fi']) for i in cobertes],
            })
    # Cel·les que ocupen tota la fila (reunions): línies molt amples
    for l in linies:
        if l['w'] >= amplada * 1.6:
            fila = min(range(len(files)), key=lambda i: abs(files[i]['yc'] - l['yc']))
            cel_les.append({
                'dia': 0, 'dia_nom': 'tots', 'inici': files[fila]['inici'], 'fi': files[fila]['fi'], 'text': l['t'],
                'linies': [l['t']], 'franges': [(files[fila]['inici'], files[fila]['fi'])],
            })
    return {'docent': nom, 'cel_les': cel_les, 'files': [(f['inici'], f['fi']) for f in files]}


def main():
    entrada, sortida = sys.argv[1], sys.argv[2]
    doc = fitz.open(entrada)
    resultat = []
    for pagina in doc:
        r = extreu_pagina(pagina)
        if r:
            resultat.append(r)
    with open(sortida, 'w', encoding='utf-8') as f:
        json.dump(resultat, f, ensure_ascii=False, indent=1)
    print(f'{len(resultat)} pàgines')


if __name__ == '__main__':
    main()
