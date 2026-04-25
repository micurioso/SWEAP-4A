# SWEAP CALABARZON Member Database

Internal web app for **DSWD FO IV-A · SWEAP CALABARZON** to manage member burial-assistance enrollment records. Built with Next.js (App Router) + Supabase + Tailwind, deployed on Vercel.

## Features

- **Authentication** — email/password via Supabase Auth. **Public sign-up is disabled**; all accounts are created and managed by admins from the in-app `/admin/users` page.
- **Roles** — `viewer` (read-only) and `admin` (read + write + import + export + user management). Enforced both at middleware level and at the database level via Postgres Row-Level Security.
- **Search** — Employee Number exact match, name fuzzy match, plus filters on Chapter Base / Division / Employment Status.
- **Member profile** — full read-only view including up to 4 declared dependents (with claim history) and up to 4 declared claimants.
- **Edit / create** — admins only; consistent form for both new and existing records.
- **Import** — CSV upload mirroring the original Google Forms export. Dry-run preview, then chunked upsert (existing employees updated, new ones created).
- **Export** — XLSX download with the exact column layout of the original Google Form (admins only).
- **Audit log** — every member insert/update/delete plus import/export events are recorded with actor + timestamp + diff.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, RLS) via `@supabase/ssr`
- PapaParse (CSV) and SheetJS / `xlsx` (Excel)
- Zod for validation
- Vercel for hosting

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Provision Supabase

1. Create a Supabase project.
2. **Authentication → Providers**: enable Email; **Authentication → Settings → User Signups**: disable.
3. Open the SQL editor and run `supabase/migrations/0001_init.sql`. This creates all tables, enums, indexes, RLS policies, the `is_admin()` helper, the profile-creation trigger, and audit triggers.

### 3. Bootstrap the first admin

In the Supabase dashboard, **Authentication → Users → Add user** with an email + password. Then in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@dswd.gov.ph';
```

After this, all subsequent accounts can be created from `/admin/users` inside the app.

### 4. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only — never expose to the client
```

### 5. (Optional) Seed from `data.csv`

```bash
npm run seed
```

This reads the included `data.csv` and runs it through the same upsert pipeline used by the in-app importer. Idempotent — safe to re-run.

### 6. Run locally

```bash
npm run dev
```

Open http://localhost:3000 and log in.

## Deployment (Vercel)

1. Push the repository to GitHub.
2. Import the project on Vercel.
3. Add the three environment variables above to the Vercel project settings (production + preview).
4. Deploy. The middleware handles auth on every request — no extra config needed.

## Project structure

```
app/
  (app)/                       authenticated app (layout enforces auth + role-aware nav)
    dashboard/                 search + recent edits + counts
    members/                   list, profile, edit, new
    import/  export/           admin only
    admin/users/  audit/       admin only
  api/
    import/                    POST: bulk upsert
    export/                    GET:  XLSX stream
    admin/users/               POST: create user; PATCH/reset-password per id
  login/                       public
lib/
  csv.ts                       single source of truth for CSV ↔ DB mapping
  schemas.ts                   zod schemas
  import.ts                    upsert pipeline used by API + seed
  supabase/{client,server,admin}.ts
  auth-guard.ts
components/
  member-form.tsx, search-bar.tsx, users-manager.tsx, sign-out-button.tsx
middleware.ts                  auth gate + admin-route gate
supabase/migrations/0001_init.sql
scripts/seed.ts                one-time CSV → DB seeder
```

## Security notes

- The `SUPABASE_SERVICE_ROLE_KEY` is only used server-side in API route handlers and the seed script. It is never exposed to the browser.
- All write paths (`/api/import`, `/api/export`, `/api/admin/users/*`, the edit form, the new form) are double-gated: middleware checks the session role before the route renders, and Postgres RLS rejects writes from non-admin sessions even if the middleware were bypassed.
- The audit log is `INSERT`-only via a `SECURITY DEFINER` trigger; no client can falsify entries.
- Public sign-up is disabled in Supabase, so creating an account requires a service-role-key call — only possible from the in-app admin user manager.

## License

Internal use — DSWD FO IV-A.
