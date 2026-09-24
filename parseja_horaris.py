#!/usr/bin/env python3
"""
SubsCoop — Script de parseig d'horaris
======================================
Converteix els fitxers Excel d'horaris del Nou Patufet al format normalitzat
per importar a SubsCoop (JSON).

Ús:
    python parseja_horaris.py <carpeta_excels> <fitxer_sortida.json>

Exemple:
    python parseja_horaris.py ./horaris horaris_normalitzats.json

Fitxers esperats a la carpeta:
    - Horaris__EI__Docents__2526.xlsx
    - Horaris_EP_Docents_2526.xlsx
    - Horaris_ESO_Docents_2526.xlsx
    (Els fitxers de grups no es processen — la info ja surt dels de docents)
"""

import json
import re
import sys
import os
from openpyxl import load_workbook


# ── Configuració ──────────────────────────────────────────────────────

DIES_COLS = {
    1: "dilluns",   # columna B (index 1)
    3: "dimarts",   # columna D
    5: "dimecres",  # columna F
    7: "dijous",    # columna H
    9: "divendres", # columna J
}

# Fulls a ignorar (no són horaris de docents)
SKIP_SHEETS = {
    "Guàrdies", "Guàrdies docents", "Distribució patis", "EViP",
    "SUBSTITUCIÓ JORDI",  # Full temporal de substituta, no és horari definitiu
}

# Normalització de noms (Excel → nom complet)
NOM_MAP = {
    "VANESSA": "Vanessa Roma",
    "VANESSA ": "Vanessa Roma",
    "BETO": "Beto Oriol",
    "DAVID": "David Lozano",
    "TXELL": "Txell Casadesús",
    "TXELL ": "Txell Casadesús",
    "Gerard": "Gerard Companys",
    "Roberto": "Roberto De Godos",
}

# Patrons per detectar tipus d'activitat
GUARDIA_PATTERNS = re.compile(r"^gu[àa]rdia$", re.IGNORECASE)
PERMANENCIA_PATTERNS = re.compile(r"^perman[èe]ncia$", re.IGNORECASE)
DISPONIBLE_PATTERNS = re.compile(r"^disponible$", re.IGNORECASE)
ESBARJO_PATTERNS = re.compile(
    r"^(esbarjo|pati|Esbarjo\s+\w+|Pati\s+\w+)", re.IGNORECASE
)
REUNIO_PATTERNS = re.compile(r"^reuni[óo]", re.IGNORECASE)
HNL_PATTERNS = re.compile(r"^hnl$", re.IGNORECASE)

# Patrons per detectar codocència / desdoblament dins el text de la cel·la
CODOC_PATTERN = re.compile(
    r"\(codoc\.?\s+amb\s+(.+?)\)", re.IGNORECASE
)
DESD_PATTERN = re.compile(
    r"\([Dd]esd\.?\s*(?:amb\s+)?(.+?)\)", re.IGNORECASE
)

# Patrons per extreure grup ESO de la primera línia
GRUP_ESO_PATTERN = re.compile(
    r"^(\d[rnt]?\s*ESO)", re.IGNORECASE
)
# Patrons per extreure grup EP (1r a 6è)
GRUP_EP_PATTERN = re.compile(
    r"^(\d[rntè]+)\b", re.IGNORECASE
)
# Patrons per extreure grup EI
GRUP_EI_PATTERN = re.compile(
    r"^(I[345])\b", re.IGNORECASE
)
# Grup EP dins ESO docent (ex: "5è EP\nTaller artístic")
GRUP_EP_IN_ESO_PATTERN = re.compile(
    r"^(\d[èrnt]+\s*EP)\b", re.IGNORECASE
)


# ── Funcions auxiliars ────────────────────────────────────────────────

def parse_time_range(cell_value):
    """Extreu hora_inici i hora_fi d'una cel·la de franja horària.
    
    Exemples:
        "09h00 - 09h30" -> ("09:00", "09:30")
        "11h30- 12h30"  -> ("11:30", "12:30")
        "12:30-13h00"   -> ("12:30", "13:00")
        "11h00- 11h30"  -> ("11:00", "11:30")
    """
    if not cell_value:
        return None, None
    
    s = str(cell_value).strip()
    
    # Normalitzem: "h" -> ":", eliminem espais al voltant del guió
    s = re.sub(r'(\d{2})h(\d{2})', r'\1:\2', s)
    s = re.sub(r'\s*-\s*', '-', s)
    
    parts = s.split('-')
    if len(parts) != 2:
        return None, None
    
    h1 = parts[0].strip()
    h2 = parts[1].strip()
    
    # Validem format HH:MM
    if re.match(r'^\d{2}:\d{2}$', h1) and re.match(r'^\d{2}:\d{2}$', h2):
        return h1, h2
    
    return None, None


def detect_etapa_from_cell(text, default_etapa):
    """Detecta l'etapa a partir del contingut de la cel·la.
    Per a docents multi-etapa (com Laia Pantinat), el grup indica l'etapa real.
    """
    if not text:
        return default_etapa
    
    first_line = text.split('\n')[0].strip()
    
    if re.match(r'^I[345]\b', first_line, re.IGNORECASE):
        return "EI"
    if re.match(r'^\d[èrnt]+\s*EP\b', first_line, re.IGNORECASE):
        return "EP"
    if re.match(r'^\d[rnt]?\s*ESO\b', first_line, re.IGNORECASE):
        return "ESO"
    # Grups EP sense "EP" explícit (dins fitxers EP: "1r", "2n", etc.)
    if default_etapa == "EP" and re.match(r'^\d[èrnt]+\b', first_line):
        return "EP"
    
    return default_etapa


def parse_cell_content(text, default_etapa):
    """Parseja el contingut d'una cel·la d'horari i retorna un dict amb la info.
    
    Retorna:
        {
            "tipus": "classe" | "guardia" | "permanencia" | "reunio" | "esbarjo" | "hnl" | "disponible",
            "grup": "4t ESO" | None,
            "materia": "Matemàtiques" | None,
            "etapa": "ESO" | "EP" | "EI",
            "parella_amb": "Laia Canal" | None,
            "tipus_parella": "codocencia" | "desdoblament" | None,
        }
    """
    if not text or not str(text).strip():
        return None
    
    text = str(text).strip()
    
    # Netegem espais i tabuladors extres
    text = re.sub(r'\t', ' ', text)
    text = re.sub(r'  +', ' ', text)
    
    result = {
        "tipus": "classe",
        "grup": None,
        "materia": None,
        "etapa": default_etapa,
        "parella_amb": None,
        "tipus_parella": None,
    }
    
    # ── Detectar tipus no-classe ──
    clean = text.split('\n')[0].strip()
    
    if GUARDIA_PATTERNS.match(clean):
        result["tipus"] = "guardia"
        return result
    
    if PERMANENCIA_PATTERNS.match(clean):
        result["tipus"] = "permanencia"
        return result
    
    if DISPONIBLE_PATTERNS.match(clean):
        result["tipus"] = "disponible"
        return result
    
    if ESBARJO_PATTERNS.match(clean):
        result["tipus"] = "esbarjo"
        return result
    
    if REUNIO_PATTERNS.match(clean) or clean.upper().startswith("REUNIÓ"):
        result["tipus"] = "reunio"
        # La matèria pot ser el nom de la reunió
        lines = text.split('\n')
        if len(lines) > 1:
            result["materia"] = ' '.join(l.strip() for l in lines).strip()
        else:
            result["materia"] = clean
        return result
    
    if HNL_PATTERNS.match(clean):
        result["tipus"] = "hnl"
        return result
    
    # ── Detectar codocència / desdoblament ──
    codoc_match = CODOC_PATTERN.search(text)
    desd_match = DESD_PATTERN.search(text)
    
    if codoc_match:
        result["parella_amb"] = codoc_match.group(1).strip()
        result["tipus_parella"] = "codocencia"
    elif desd_match:
        result["parella_amb"] = desd_match.group(1).strip()
        result["tipus_parella"] = "desdoblament"
    
    # Eliminem la part de codoc/desd del text per parsejar grup i matèria
    text_clean = CODOC_PATTERN.sub('', text)
    text_clean = DESD_PATTERN.sub('', text_clean)
    text_clean = re.sub(r'\(\s*\)', '', text_clean)  # parèntesis buits
    
    lines = [l.strip() for l in text_clean.split('\n') if l.strip()]
    
    # ── Extreure grup i matèria ──
    if len(lines) >= 2:
        # Format típic ESO: "4t ESO\nMates" o "I5\nMúsica" o "5è EP\nTaller"
        first_line = lines[0]
        
        # Detectar etapa real
        result["etapa"] = detect_etapa_from_cell(first_line, default_etapa)
        
        # El grup és la primera línia, la matèria la resta
        result["grup"] = first_line.strip()
        result["materia"] = ' '.join(lines[1:]).strip()
        
    elif len(lines) == 1:
        line = lines[0].strip()
        
        # Intentem veure si és un grup + matèria en una sola línia
        # (habitual a EP: "Anglès 2n", "Tutoria 5è", "EF Natació 3r")
        # O a EI: "Ens cuidem!", "Fem racons!"
        
        # Primer mirem si comença per un patró de grup
        grup_match = (
            GRUP_ESO_PATTERN.match(line) or 
            GRUP_EP_IN_ESO_PATTERN.match(line) or
            GRUP_EI_PATTERN.match(line)
        )
        
        if grup_match:
            result["grup"] = grup_match.group(1)
            rest = line[grup_match.end():].strip()
            result["materia"] = rest if rest else None
            result["etapa"] = detect_etapa_from_cell(line, default_etapa)
        else:
            # A EP, sovint és "Matèria Grup" (ex: "Anglès 2n", "Matemàtiques 6è")
            # O activitats sense grup (ex: "Ambients CI", "Aula Acollida")
            result["materia"] = line
            result["etapa"] = default_etapa
            
            # Intentem extreure el grup del final
            ep_end = re.search(r'\b(\d[èrnt]+)\s*$', line)
            if ep_end and default_etapa == "EP":
                result["grup"] = ep_end.group(1)
                result["materia"] = line[:ep_end.start()].strip()
    
    return result


def process_docent_sheet(ws, docent_name, default_etapa):
    """Processa un full d'un docent i retorna una llista d'entrades d'horari."""
    entries = []
    
    all_rows = list(ws.iter_rows(values_only=True))
    
    # Trobem les files amb franges horàries (comencen per un patró d'hora)
    for row in all_rows:
        if not row or not row[0]:
            continue
        
        time_str = str(row[0]).strip()
        hora_inici, hora_fi = parse_time_range(time_str)
        
        if not hora_inici:
            continue
        
        # Iterem pels 5 dies de la setmana
        for col_idx, dia in DIES_COLS.items():
            if col_idx >= len(row):
                continue
            
            cell_value = row[col_idx]
            if not cell_value or not str(cell_value).strip():
                continue
            
            parsed = parse_cell_content(cell_value, default_etapa)
            if not parsed:
                continue
            
            entry = {
                "docent": docent_name,
                "dia": dia,
                "hora_inici": hora_inici,
                "hora_fi": hora_fi,
                "tipus": parsed["tipus"],
                "grup": parsed["grup"],
                "materia": parsed["materia"],
                "etapa": parsed["etapa"],
                "parella_amb": parsed["parella_amb"],
                "tipus_parella": parsed["tipus_parella"],
                "aula": None,  # No disponible als Excel actuals
            }
            
            entries.append(entry)
    
    return entries


def process_file(filepath, default_etapa):
    """Processa un fitxer Excel complet i retorna totes les entrades."""
    wb = load_workbook(filepath, read_only=True)
    all_entries = []
    
    for sheet_name in wb.sheetnames:
        if sheet_name.strip() in SKIP_SHEETS:
            continue
        
        ws = wb[sheet_name]
        
        # El nom del docent és a la fila 2 (index 2), columna A
        rows = list(ws.iter_rows(max_row=5, values_only=True))
        docent_name = None
        for r in rows[:4]:
            val = str(r[0]).strip() if r and r[0] else ""
            # Descartem files que contenen l'any del curs o estan buides
            if val and not re.match(r'^(CURS\s+)?\d{2,4}[-/]\d{2,4}$', val, re.IGNORECASE):
                docent_name = str(r[0]).strip()
                break
        
        if not docent_name:
            print(f"  ⚠ No s'ha trobat nom de docent al full '{sheet_name}', es fa servir el nom del full.")
            docent_name = sheet_name.strip()
        
        # Normalitzem el nom
        docent_name = NOM_MAP.get(docent_name, docent_name)
        
        ws2 = wb[sheet_name]  # Re-open to iterate from start
        entries = process_docent_sheet(ws2, docent_name, default_etapa)
        all_entries.extend(entries)
        print(f"  ✓ {docent_name}: {len(entries)} entrades")
    
    wb.close()
    return all_entries


# ── Estadístiques ─────────────────────────────────────────────────────

def print_stats(entries):
    """Mostra estadístiques del parseig."""
    print(f"\n{'='*60}")
    print(f"RESUM DEL PARSEIG")
    print(f"{'='*60}")
    print(f"Total entrades: {len(entries)}")
    
    # Per etapa
    etapes = {}
    for e in entries:
        etapes[e["etapa"]] = etapes.get(e["etapa"], 0) + 1
    print(f"\nPer etapa:")
    for etapa, count in sorted(etapes.items()):
        print(f"  {etapa}: {count}")
    
    # Per tipus
    tipus = {}
    for e in entries:
        tipus[e["tipus"]] = tipus.get(e["tipus"], 0) + 1
    print(f"\nPer tipus d'activitat:")
    for t, count in sorted(tipus.items(), key=lambda x: -x[1]):
        print(f"  {t}: {count}")
    
    # Docents únics
    docents = set(e["docent"] for e in entries)
    print(f"\nDocents únics: {len(docents)}")
    for d in sorted(docents):
        n = sum(1 for e in entries if e["docent"] == d)
        etapes_d = sorted(set(e["etapa"] for e in entries if e["docent"] == d))
        print(f"  {d}: {n} entrades ({', '.join(etapes_d)})")
    
    # Codocències i desdoblaments
    codocs = [e for e in entries if e["tipus_parella"] == "codocencia"]
    desds = [e for e in entries if e["tipus_parella"] == "desdoblament"]
    print(f"\nCodocències: {len(codocs)}")
    print(f"Desdoblaments: {len(desds)}")
    
    # Mostrem les codocencies i desdoblaments per validar
    if codocs:
        print("\n  Codocències detectades:")
        for e in codocs[:10]:
            print(f"    {e['docent']} | {e['dia']} {e['hora_inici']}-{e['hora_fi']} | {e['grup']} {e['materia']} | amb {e['parella_amb']}")
    
    if desds:
        print("\n  Desdoblaments detectats:")
        for e in desds[:10]:
            print(f"    {e['docent']} | {e['dia']} {e['hora_inici']}-{e['hora_fi']} | {e['grup']} {e['materia']} | amb {e['parella_amb']}")


# ── Main ──────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        # Mode per defecte: busca els fitxers a /mnt/user-data/uploads
        input_dir = "/mnt/user-data/uploads"
        output_file = "/home/claude/horaris_normalitzats.json"
    else:
        input_dir = sys.argv[1]
        output_file = sys.argv[2]
    
    # Mapa de fitxers a processar amb la seva etapa per defecte
    files_config = [
        ("Horaris__EI__Docents__2526.xlsx", "EI"),
        ("Horaris_EP_12_1-19_6__Docents_2526.xlsx", "EP"),
        ("Horaris_ESO_Docents_2526.xlsx", "ESO"),
    ]
    
    all_entries = []
    
    for filename, etapa in files_config:
        filepath = os.path.join(input_dir, filename)
        if not os.path.exists(filepath):
            print(f"⚠ Fitxer no trobat: {filepath}")
            continue
        
        print(f"\nProcessant {filename} (etapa: {etapa})...")
        entries = process_file(filepath, etapa)
        all_entries.extend(entries)
    
    # Estadístiques
    print_stats(all_entries)
    
    # Guardem el JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Fitxer generat: {output_file}")
    print(f"  {len(all_entries)} entrades totals")


if __name__ == "__main__":
    main()
