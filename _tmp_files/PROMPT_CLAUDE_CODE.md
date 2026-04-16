# SubsCoop — Prompt inicial per a Claude Code

## Què és SubsCoop

SubsCoop és una aplicació web per gestionar les substitucions docents, absències i sortides escolars de l'Escola Cooperativa Nou Patufet (Barcelona). El centre té 23 docents repartits en tres etapes: Educació Infantil (EI), Educació Primària (EP) i ESO.

## Context tècnic

- **Stack**: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (PostgreSQL + Auth + RLS)
- **Desplegament**: Vercel
- **Repositori**: GitHub (privat, ja creat i clonat)
- **Autenticació**: Google OAuth via Supabase Auth (els docents entren amb el seu correu @noupatufet.coop)
- **Notificacions**: Gmail API o Resend (decisió posterior)
- **Calendari**: sincronització amb Google Calendar (Fase 2)

## Credencials Supabase (ja configurades)

Crea un fitxer `.env.local` amb les variables següents (substitueix pels valors reals):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

Google OAuth ja està activat com a provider a Supabase Auth.

## Què has de fer (en ordre)

### Pas 1: Crear el projecte Next.js

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
npm install @supabase/supabase-js @supabase/ssr
```

Configura el client de Supabase (utils per a client-side i server-side) seguint la documentació oficial de Supabase + Next.js App Router.

### Pas 2: Crear les taules a Supabase

Crea una migració SQL amb totes les taules. L'ordre de creació és important per les dependències:

#### 2.1. etapes
```sql
CREATE TABLE etapes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codi TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL
);
```

#### 2.2. docents
```sql
CREATE TABLE docents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  actiu BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2.3. grups
```sql
CREATE TABLE grups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codi TEXT NOT NULL UNIQUE,
  etapa_id UUID NOT NULL REFERENCES etapes(id),
  nom TEXT NOT NULL
);
```

#### 2.4. franges_horaries
```sql
CREATE TABLE franges_horaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES etapes(id),
  hora_inici TIME NOT NULL,
  hora_fi TIME NOT NULL,
  ordre INTEGER NOT NULL,
  UNIQUE(etapa_id, hora_inici, hora_fi)
);
```

#### 2.5. docent_etapes
```sql
CREATE TABLE docent_etapes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  docent_id UUID NOT NULL REFERENCES docents(id),
  etapa_id UUID NOT NULL REFERENCES etapes(id),
  UNIQUE(docent_id, etapa_id)
);
```

#### 2.6. docent_rols
```sql
CREATE TABLE docent_rols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  docent_id UUID NOT NULL REFERENCES docents(id),
  rol TEXT NOT NULL CHECK (rol IN ('docent', 'coordinacio_etapa', 'cap_personal', 'director', 'sotsdirector')),
  etapa_id UUID REFERENCES etapes(id),
  nom_carrec TEXT
);
```

#### 2.7. horari_setmanal
```sql
CREATE TABLE horari_setmanal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  docent_id UUID NOT NULL REFERENCES docents(id),
  franja_id UUID NOT NULL REFERENCES franges_horaries(id),
  dia_setmana SMALLINT NOT NULL CHECK (dia_setmana BETWEEN 1 AND 5),
  tipus TEXT NOT NULL CHECK (tipus IN ('classe', 'guardia', 'permanencia', 'reunio', 'esbarjo', 'hnl', 'disponible')),
  grup_id UUID REFERENCES grups(id),
  materia TEXT,
  aula TEXT,
  parella_docent_id UUID REFERENCES docents(id),
  tipus_parella TEXT CHECK (tipus_parella IN ('codocencia', 'desdoblament'))
);
```

#### 2.8. absencies
```sql
CREATE TABLE absencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  docent_id UUID NOT NULL REFERENCES docents(id),
  data DATE NOT NULL,
  tot_el_dia BOOLEAN NOT NULL DEFAULT true,
  hora_inici TIME,
  hora_fi TIME,
  motiu TEXT NOT NULL CHECK (motiu IN ('medic', 'dia_personal', 'formacio')),
  estat TEXT NOT NULL DEFAULT 'pendent' CHECK (estat IN ('pendent', 'aprovada', 'rebutjada')),
  aprovat_per UUID REFERENCES docents(id),
  data_aprovacio TIMESTAMPTZ,
  observacions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2.9. sortides
```sql
CREATE TABLE sortides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposada_per UUID NOT NULL REFERENCES docents(id),
  data DATE NOT NULL,
  hora_inici TIME NOT NULL,
  hora_fi TIME NOT NULL,
  descripcio TEXT NOT NULL,
  estat TEXT NOT NULL DEFAULT 'proposta' CHECK (estat IN ('proposta', 'aprovada', 'rebutjada')),
  aprovada_per UUID REFERENCES docents(id),
  data_aprovacio TIMESTAMPTZ,
  observacions TEXT,
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2.10. sortida_grups
```sql
CREATE TABLE sortida_grups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sortida_id UUID NOT NULL REFERENCES sortides(id) ON DELETE CASCADE,
  grup_id UUID NOT NULL REFERENCES grups(id),
  UNIQUE(sortida_id, grup_id)
);
```

#### 2.11. sortida_acompanyants
```sql
CREATE TABLE sortida_acompanyants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sortida_id UUID NOT NULL REFERENCES sortides(id) ON DELETE CASCADE,
  docent_id UUID NOT NULL REFERENCES docents(id),
  UNIQUE(sortida_id, docent_id)
);
```

#### 2.12. substitucions
```sql
CREATE TABLE substitucions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  absencia_id UUID REFERENCES absencies(id),
  sortida_id UUID REFERENCES sortides(id),
  horari_setmanal_id UUID NOT NULL REFERENCES horari_setmanal(id),
  data DATE NOT NULL,
  substitut_id UUID REFERENCES docents(id),
  estat TEXT NOT NULL DEFAULT 'pendent' CHECK (estat IN ('pendent', 'proposta_ia', 'confirmada')),
  proposat_per_ia BOOLEAN NOT NULL DEFAULT false,
  motiu_proposta_ia TEXT,
  confirmat_per UUID REFERENCES docents(id),
  feina_substitut TEXT,
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (absencia_id IS NOT NULL OR sortida_id IS NOT NULL)
);
```

#### 2.13. notificacions
```sql
CREATE TABLE notificacions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  destinatari_id UUID NOT NULL REFERENCES docents(id),
  tipus TEXT NOT NULL CHECK (tipus IN ('assignacio', 'recordatori', 'aprovacio_pendent', 'absencia_processada', 'sortida_proposta', 'sortida_aprovada')),
  referencia_id UUID,
  referencia_tipus TEXT CHECK (referencia_tipus IN ('substitucio', 'absencia', 'sortida')),
  enviat BOOLEAN NOT NULL DEFAULT false,
  enviat_at TIMESTAMPTZ,
  programat_per TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2.14. log_ia
```sql
CREATE TABLE log_ia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  substitucio_id UUID NOT NULL REFERENCES substitucions(id),
  candidats_considerats JSONB NOT NULL,
  candidat_proposat UUID NOT NULL REFERENCES docents(id),
  raonament TEXT NOT NULL,
  acceptat BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2.15. Índexs
```sql
CREATE INDEX idx_horari_docent_dia ON horari_setmanal(docent_id, dia_setmana);
CREATE INDEX idx_horari_dia_tipus ON horari_setmanal(dia_setmana, tipus);
CREATE INDEX idx_absencies_data ON absencies(data, estat);
CREATE INDEX idx_substitucions_data ON substitucions(data, estat);
CREATE INDEX idx_substitucions_substitut ON substitucions(substitut_id);
CREATE INDEX idx_notificacions_programat ON notificacions(programat_per, enviat);
```

### Pas 3: Carregar les seeds

#### 3.1. Etapes
```sql
INSERT INTO etapes (codi, nom) VALUES
  ('EI', 'Educació Infantil'),
  ('EP', 'Educació Primària'),
  ('ESO', 'Educació Secundària Obligatòria');
```

#### 3.2. Grups
```sql
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
```

#### 3.3. Docents (23 docents)
```sql
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
```

#### 3.4. Rols
Tots els docents tenen el rol "docent". A més:
```sql
-- Tothom té rol docent
INSERT INTO docent_rols (docent_id, rol)
SELECT id, 'docent' FROM docents;

-- Vanessa Roma: Coordinadora d'infantil + Cap de personal
INSERT INTO docent_rols (docent_id, rol, etapa_id, nom_carrec) VALUES
  ((SELECT id FROM docents WHERE email = 'vanessa.roma@noupatufet.coop'), 'coordinacio_etapa', (SELECT id FROM etapes WHERE codi = 'EI'), 'Coordinadora d''infantil');
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
```

#### 3.5. Docent-etapes
```sql
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

-- Multi-etapa: Laia Pantinat (EI, EP, ESO)
INSERT INTO docent_etapes (docent_id, etapa_id)
SELECT d.id, e.id FROM docents d, etapes e
WHERE d.nom = 'Laia Pantinat';

-- Multi-etapa: Jordi Pere Tàrraga (EP, ESO)
INSERT INTO docent_etapes (docent_id, etapa_id)
SELECT d.id, e.id FROM docents d, etapes e
WHERE d.nom = 'Jordi Pere Tàrraga' AND e.codi IN ('EP', 'ESO');
```

#### 3.6. Franges horàries i horari setmanal
Les franges horàries i l'horari setmanal s'han de carregar a partir del fitxer `horaris_normalitzats.json` (684 entrades). Crea un script Node.js o una migració que:
1. Llegeixi el JSON
2. Extregui les franges úniques per etapa i les insereixi a `franges_horaries`
3. Per a cada entrada, trobi el `docent_id`, `franja_id`, `grup_id` (si aplica) i `parella_docent_id` (si aplica) i insereixi a `horari_setmanal`

El fitxer JSON té aquest format per entrada:
```json
{
  "docent": "Laia Canal",
  "dia": "dilluns",
  "hora_inici": "08:00",
  "hora_fi": "09:00",
  "tipus": "classe",
  "grup": "4t ESO",
  "materia": "Mates",
  "etapa": "ESO",
  "parella_amb": "Cesc",
  "tipus_parella": "codocencia",
  "aula": null
}
```

Nota: el camp `parella_amb` pot contenir noms curts ("Cesc", "Laia C.", "Àgata", "Júlia", "Sol", "Josep", "Jordi Pere") que cal mapejar als noms complets de la taula `docents`.

### Pas 4: Configurar RLS (Row Level Security)

Activa RLS a totes les taules i crea les polítiques. Criteris principals:
- Cada docent veu les seves dades i les dades bàsiques del claustre
- La coordinació d'etapa veu i gestiona les absències/substitucions de la seva etapa
- Cap de personal aprova dies personals i veu tot
- Horaris: lectura per tothom, escriptura només admin

### Pas 5: Implementar l'autenticació

Configura el flux de login amb Google OAuth:
- Pàgina de login amb botó "Entra amb Google"
- Middleware de Next.js per protegir les rutes
- Callback handler a `/auth/callback`
- Lògica per vincular l'usuari de Supabase Auth amb el docent de la taula `docents` (per email)

### Pas 6: Deploy a Vercel

```bash
git add .
git commit -m "feat: initial setup with Supabase, auth, and seeds"
git push origin main
```

Després connecta el repo a Vercel i configura les variables d'entorn.

## Regles de negoci importants

1. **Codocència vs desdoblament**: si `tipus_parella = 'codocencia'` i un dels dos docents falta, NO cal substitut (l'altre cobreix). Si `tipus_parella = 'desdoblament'`, SÍ cal substitut.

2. **Ordre de prioritat per proposar substituts**:
   - Docents alliberats per una sortida (prioritat màxima)
   - Docents de guàrdia en aquella franja
   - Docents amb permanència en aquella franja
   - Docents amb HNL (hora no lectiva) en aquella franja
   - Restricció: el substitut ha de treballar a l'etapa del docent absent

3. **Flux d'absències**:
   - Mèdic → aprovació automàtica → genera substitucions
   - Dia personal → pendent d'aprovació per cap de personal → genera substitucions
   - Formació → aprovació automàtica → genera substitucions

4. **Efecte cascada de sortides**: quan s'aprova una sortida, els docents que tenien classe amb els grups que surten queden alliberats i passen a ser prioritaris per substituir.

5. **Coordinació d'etapa**: hi ha tres figures (Coordinadora d'infantil, Cap d'estudis EP, Cap d'estudis ESO). Cada una gestiona les substitucions de la seva etapa.

## Fase 1 (MVP) — Què ha de funcionar

- Login amb Google (@noupatufet.coop)
- Un docent comunica absència (data, franja, motiu)
- El sistema mostra les classes afectades (distingint codocència/desdoblament)
- El docent deixa feina per al substitut
- El sistema proposa substituts (ordre de prioritat)
- La coordinació d'etapa confirma l'assignació
- Notificació per correu al substitut
- Dashboard personal: substitucions fetes, dies d'absència acumulats

## Fitxers adjunts

Trobaràs a la carpeta del projecte:
- `docs/SubsCoop_Requisits_Funcionals_v1.docx` — Document complet de requisits
- `docs/SubsCoop_Model_Dades_v1.docx` — Model de dades amb totes les taules
- `docs/SubsCoop_Guia_Configuracio_v1.docx` — Guia de configuració
- `data/horaris_normalitzats.json` — 684 entrades d'horari parsejades
- `scripts/parseja_horaris.py` — Script per regenerar el JSON cada curs

## Directrius de disseny visual

### Identitat
SubsCoop és una eina interna de l'Escola Cooperativa Nou Patufet (noupatufet.coop). El disseny ha de ser càlid, proper i funcional — no corporatiu ni fred. Els docents la faran servir entre classes, sovint des del mòbil.

### Paleta de colors (basada en la identitat del centre — blaus)
```
--color-primary: #1B3A4B;        /* Blau fosc Nou Patufet — color principal del logo */
--color-primary-light: #E8EFF3;  /* Blau molt suau — fons de targetes, hover */
--color-primary-dark: #122A38;   /* Blau molt fosc — headers, sidebar */
--color-accent: #7FB5D5;         /* Blau cel — il·lustració del logo, accents suaus */
--color-accent-light: #EDF5FA;   /* Blau cel molt suau — fons d'informació */
--color-secondary: #F5A623;      /* Taronja càlid — accents, badges pendents */
--color-secondary-light: #FFF3E0; /* Taronja molt suau — fons d'avisos */
--color-bg: #F8FAFB;             /* Fons general — blanc trencat lleugerament blau */
--color-surface: #FFFFFF;        /* Targetes i cards */
--color-text: #1B3A4B;           /* Text principal — mateix blau del logo */
--color-text-secondary: #5A7D8A; /* Text secundari */
--color-border: #D8E3E8;         /* Vores suaus */
--color-danger: #E74C3C;         /* Errors i rebutjats */
--color-success: #27AE60;        /* Confirmats i aprovats */
--color-warning: #F39C12;        /* Pendents */
--color-info: #7FB5D5;           /* Informació i links — blau cel del logo */
```

### Tipografia
- Font principal: Inter (Google Fonts) — neta, llegible a mòbil
- Mida base: 16px
- Títols: semibold, no bold agressiu

### Principis de disseny
1. **Mobile-first**: els docents consultaran l'app entre classes des del mòbil. Tot ha de funcionar bé a 375px d'ample.
2. **Tons suaus**: res de colors plans i saturats. Tot amb opacitat reduïda, ombres subtils, cantonades arrodonides (border-radius: 12px per targetes, 8px per botons).
3. **Espai en blanc generós**: padding de 16-24px, separació clara entre elements.
4. **Estats visuals clars**: els estats de les substitucions i absències han de ser immediatament recognoscibles per color (verd = confirmat, taronja = pendent, vermell = rebutjat).
5. **Navegació simple**: barra inferior al mòbil amb 4-5 icones (Inici, Absències, Substitucions, Calendari, Perfil). Sidebar al desktop.
6. **Accessibilitat**: contrast mínim 4.5:1, mida tàctil mínima 44x44px, labels als formularis.
7. **Idioma**: tota la interfície en català.

### Components principals
- **Targetes (cards)**: fons blanc, border-radius 12px, ombra subtil (0 2px 8px rgba(0,0,0,0.06)), padding 16px.
- **Botons primaris**: fons blau primari, text blanc, border-radius 8px, padding 12px 24px.
- **Botons secundaris**: fons transparent, border blau, text blau.
- **Badges d'estat**: pastilles arrodonides amb fons suau del color corresponent i text del color fosc.
- **Formularis**: inputs amb border suau, border-radius 8px, focus amb ring blau.
- **Calendari**: vista setmanal com a default, amb targetes de color per tipus (substitució, sortida, absència).

### Layout
- **Mòbil**: una columna, navegació inferior fixa
- **Tablet**: dues columnes on tingui sentit
- **Desktop**: sidebar fixa a l'esquerra (240px) + àrea de contingut