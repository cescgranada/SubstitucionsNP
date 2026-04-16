# SubsCoop

Aplicació web per gestionar les substitucions docents, absències i sortides escolars de l'Escola Cooperativa Nou Patufet (Barcelona).

**Stack**: Next.js 16 · TypeScript · Tailwind CSS v4 · Supabase · Vercel

---

## Posada en marxa

### 1. Variables d'entorn

Copia `.env.example` a `.env.local` i omple els valors:

```bash
cp .env.example .env.local
```

| Variable | On trobar-la |
|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `RESEND_API_KEY` | [resend.com](https://resend.com) (pla gratuït: 3.000 emails/mes) |
| `RESEND_FROM` | `SubsCoop <noreply@noupatufet.coop>` (cal verificar el domini a Resend) |

> Les notificacions per correu funcionen sense `RESEND_API_KEY` (es registra un avís a la consola però no bloqueja cap operació).

---

### 2. Base de dades Supabase

Executa els fitxers SQL en ordre al **SQL Editor** del Supabase Dashboard:

```
supabase/migrations/001_schema.sql   ← taules + índexs
supabase/migrations/002_seeds.sql    ← etapes, grups, 23 docents, rols
supabase/migrations/003_rls.sql      ← Row Level Security
```

---

### 3. Carregar els horaris

Col·loca el fitxer `horaris_normalitzats.json` (684 entrades) a la carpeta `data/` i executa:

```bash
npm run load-horaris
```

> Necessita `NEXT_PUBLIC_SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` al `.env.local`.

---

### 4. Autenticació Google OAuth

Al Supabase Dashboard → Authentication → Providers → Google:
- Activa el provider Google
- Afegeix com a **Redirect URL** autoritzada:
  - Producció: `https://el-teu-domini.vercel.app/auth/callback`
  - Local: `http://localhost:3000/auth/callback`

---

### 5. Desenvolupament local

```bash
npm install
npm run dev
```

Obre [http://localhost:3000](http://localhost:3000).

---

### 6. Desplegament a Vercel

```bash
git push origin main
```

A Vercel:
1. Connecta el repositori GitHub
2. Afegeix les variables d'entorn (les mateixes que `.env.local`)
3. Afegeix la URL de producció com a Redirect URL a Supabase

---

## Estructura del projecte

```
src/
  app/
    (app)/              ← rutes protegides (requereixen login)
      page.tsx          ← dashboard principal
      absencies/        ← comunicar i gestionar absències
      substitucions/    ← confirmar i veure substitucions
      sortides/         ← proposar i aprovar sortides
      horari/           ← horari setmanal personal
      perfil/           ← dades i estadístiques del docent
    login/              ← pàgina de login Google OAuth
    auth/               ← callback i signout
  lib/
    supabase/           ← clients server-side i client-side
    actions/            ← Server Actions (absències, substitucions, sortides)
    email.ts            ← notificacions via Resend
    types.ts            ← tipus TypeScript del model de dades
  components/
    layout/             ← Sidebar (desktop) + BottomNav (mòbil)
supabase/
  migrations/           ← SQL: schema, seeds, RLS
scripts/
  load-horaris.ts       ← carrega horaris_normalitzats.json
data/
  horaris_normalitzats.json   ← (no inclòs al repo, afegir manualment)
```

---

## Rols i permisos

| Rol | Permisos |
|-----|----------|
| `docent` | Comunicar absències pròpies, veure horari i substitucions, proposar sortides |
| `coordinacio_etapa` | + Aprovar/confirmar substitucions de la seva etapa, aprovar sortides |
| `cap_personal` | + Aprovar dies personals |
| `sotsdirector` / `director` | Accés complet |

---

## Regles de negoci principals

- **Mèdic / Formació** → aprovació automàtica → es generen substitucions
- **Dia personal** → pendent d'aprovació per cap de personal → es generen substitucions en aprovar
- **Codocència**: si un docent falta, l'altre cobreix (no cal substitut extern)
- **Desdoblament**: cal substitut
- **Prioritat de substituts**: guàrdia > permanència > HNL (restringit a l'etapa del docent absent)
