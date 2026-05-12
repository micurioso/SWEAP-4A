# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Internal web app for **DSWD FO IV-A · SWEAP CALABARZON** to manage member burial-assistance enrollment records originally collected via Google Forms. Live at https://github.com/micurioso/SWEAP-4A, deployed on Vercel.

## Commands

```bash
npm install              # install deps
npm run dev              # local dev server (http://localhost:3000, falls back to 3001)
npm run build            # production build (also what Vercel runs)
npm run lint             # next lint
npm run seed             # one-time: load data.csv into Supabase via service role
```

There is no test runner configured. The data file `data.csv` is gitignored (real PII); only `data.sample.csv` is committed.

## Environment

`.env.local` (and Vercel project env) must define:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     # server-only, never imported from client components
```

When middleware fails in production with `MIDDLEWARE_INVOCATION_FAILED`, missing env vars on Vercel are the typical cause — they must be set for the **Production** environment specifically and require a redeploy (not just a new commit) to take effect.

## Architecture

### Auth model — username, not email
Supabase Auth requires an email under the hood, but users log in with a **username**. Two flows produce that:

- **New accounts** (created via `/admin/users`): admin enters a username; the API synthesizes `<username>@sweap.local` as the auth email and stores `username` on `profiles`.
- **Pre-existing accounts** (e.g. the bootstrap admin created in the Supabase dashboard with a real Gmail): keep their real email; the `profiles.username` column is populated separately.

The login page accepts whatever the user types. If it contains `@` it's used directly; otherwise `app/api/auth/resolve-username/route.ts` (service-role lookup) maps `username → email`, then `signInWithPassword` runs with the resolved email. **This route must remain unauthenticated** — `middleware.ts` whitelists `/api/auth/*` alongside `/login`.

Public sign-up is disabled in Supabase. All accounts are admin-managed.

### Authorization — defense in depth
Three roles: `admin`, `encoder`, `viewer` (Postgres `user_role` enum, defined in `0001_init.sql`, extended in `0006_encoder_role.sql`).
- `admin` — full access including all four `/admin/*` pages (Data Management, Users, Manage Forms, Audit).
- `encoder` — can read members, write to member tables (create / edit profile, toggle Employee + Dependent status), and **manage SWEAP forms** (upload/delete PDFs at `/admin/forms`). Blocked from Data Management, Users, and Audit.
- `viewer` — read-only; the Members list is search-only (no enumeration).

Every write path is gated **twice**:

1. **`middleware.ts`** — checks the session on every request, redirects unauthenticated users to `/login`. The admin gate is split three ways: `/admin/forms` and any path ending in `/edit` or `/new` require `role IN ('admin','encoder')`; every other `/admin/*` path requires `role = 'admin'`.
2. **Postgres RLS** — `sweap_members`, `member_dependents`, `member_claimants` use the `public.is_member_editor()` SQL helper (admin or encoder). `profiles` and `audit_log` keep their `public.is_admin()` gate so encoders cannot change roles or read audit history. `sweap_forms` writes go through the service-role client server-side, so its RLS still names `is_admin()` for defense in depth but practical access is controlled by `requireMemberEditor()` in the API.

API route handlers under `app/api/**` call `requireAdmin()` (for `/api/admin/users/**`, `/api/admin/erase-members`, `/api/admin/clear-audit`, `/api/import`, `/api/export`) or `requireMemberEditor()` (for member-status PATCH routes and `/api/admin/forms/**`) from `lib/auth-guard.ts` before doing anything.

The service-role client (`lib/supabase/admin.ts`) is **only** used inside server-side route handlers and the seed script. Importing it from a client component will leak the key.

### Data model — preserved positional slots
Up to 4 declared **dependents** (A.1–A.4, 3 columns each: name/relationship/status) and up to 4 declared **claimants** (B.1–B.4, 2 columns each: name/relationship).

These are normalized into `member_dependents` and `member_claimants` tables with a `slot smallint (1..4)` column and a `UNIQUE (employee_number, slot)` constraint, so re-imports overwrite the same slot rather than creating duplicates. Whenever rendering a profile, querying by `slot` preserves the A.1/A.2/A.3/A.4 ordering. (`member_dependents` also has legacy `amount_claimed`, `check_voucher_number`, `claimant_name` columns that hold data carried over from the original Google Form imports; these are no longer collected by the public registration form or surfaced in the import template / export.)

### Validation rules
- **`employee_number`** must contain at least one digit (`/\d/`). This rejects rows where a name accidentally landed in the Emp # column without breaking codes like `Apr-51` or `04-12096`. Enforced in three places: `lib/csv.ts` (CSV import skip), `lib/schemas.ts` Zod (server-side `/api/import` and `/api/members`), and `components/member-form.tsx` (HTML `pattern=".*\d.*"`). Uniqueness is enforced by the Postgres PK.
- **Dates** (`parseDate`/`parseTimestamp` in `lib/utils.ts`) are clamped to year 1900–2100. Out-of-range dates return `null` instead of producing the `time zone displacement out of range` error that bulk inserts used to throw on Excel-mangled birthdates.
- **CSV encoding** is auto-detected: `decodeFile()` in `components/import-section.tsx` and `scripts/seed.ts` decode UTF-8 strictly first, then fall back to Windows-1252 if that throws. Excel-saved CSVs default to cp1252 and would otherwise show `�` for `ñ`/`Ñ`.

### CSV ↔ DB mapping is positional, not by header name
`lib/csv.ts` is the **single source of truth** for the 45-column CSV layout shared by both the import template and the export. The order matches the public registration form at `/register` exactly so an exported CSV roundtrips through import without column reshuffling. It's consumed by:

- The Import tab inside `/admin/data-management` (PapaParse → dry-run preview → POST to `/api/import`) and the "Download template" button
- `/api/export` (joins members + child rows → `memberToExportRow` (aliased to `memberToRow`) → CSV)
- `scripts/seed.ts` (one-time bulk load of `data.csv`)

`EXPORT_HEADERS`/`memberToExportRow` are kept as re-exports of `CSV_HEADERS`/`memberToRow` so older imports keep compiling, but they refer to the same constant/function.

Headers like "Relationship to dependent A.1" make every column unique now, but `rowToMember`/`memberToRow` still work **by column index** (`IDX` constants in `lib/csv.ts`). Any column reorder requires updating those indexes.

### Import pipeline (lib/import.ts + components/import-section.tsx)
The import is **chunked client-side and bulk-batched server-side** to handle ~2k-row CSVs in seconds rather than minutes.

**Client (`components/import-section.tsx`)**:
1. PapaParse the file (after `decodeFile()` UTF-8/cp1252 fallback). Drop rows missing emp #, name, or whose emp # has no digit. Drop in-CSV duplicates (first wins).
2. Live-tag each preview row as **New**, **Skip**, or **Overwrite** by querying which employee numbers already exist.
3. On commit, split rows into **200-row chunks** and run **4 chunks in parallel** via a worker pool. The progress bar updates as each chunk completes; results are aggregated client-side. If any chunk errors, the others still finish and the first error is surfaced.

**Server (`lib/import.ts` `importMembers`)**, called once per chunk by `/api/import`:
1. In-CSV dedupe (defense in depth — the client also dedupes).
2. One `IN` query to find which `employee_number`s already exist; partition into skip/write.
3. **Bulk** `upsert(members[], { onConflict: "employee_number" })` for the entire chunk.
4. Two **parallel** bulk `delete().in("employee_number", ...)` calls to wipe any prior child rows for the touched emp #s.
5. Two **parallel** bulk `insert(...)` calls to write the new dependents / claimants.

So each chunk is ~5 round-trips to Supabase regardless of chunk size, vs the old ~5×N. Trade-off: if a single bad row in a chunk fails the bulk upsert, the **whole chunk** is reported as errors (not just that row).

`scripts/seed.ts` is pinned to `"overwrite"`. The default mode for `/api/import` is `"skip-existing"`; the UI exposes an "Overwrite existing records" checkbox to switch.

### Audit
Every `INSERT/UPDATE/DELETE` on `sweap_members` fires a `SECURITY DEFINER` trigger that writes to `audit_log` with the actor and a JSONB diff. The `audit_action` enum is `('insert','update','delete','import','export','login')` — keep new actions inside this set or extend the enum in a new migration. `audit_log` is read-only to admins via RLS; clients cannot forge entries.

Note: imports run as multiple parallel chunks, so a single CSV import produces N per-row audit entries (one per inserted/updated row via the trigger). There is no longer a single consolidated "import" audit row.

### Danger Zone
Admin-only destructive actions live in the third tab of `/admin/data-management`:

- **Erase all members** (`POST /api/admin/erase-members`) — deletes every row from `sweap_members`. Child tables cascade via the `ON DELETE CASCADE` FK on `employee_number`. The per-row audit trigger records each delete in `audit_log`.
- **Clear audit log** (`POST /api/admin/clear-audit`) — wipes `audit_log` (typically used after the bulk-erase above to discard the resulting audit spam).

Both routes require a typed-confirmation phrase in the modal (`"ERASE ALL MEMBERS"` / `"CLEAR AUDIT LOG"`) and are gated by `requireAdmin()`.

### Viewer experience — search-only Members tab
For non-admin (`viewer`) accounts, `/members` does **not** render the table on initial load — only the search bar is visible, with the hint "Enter an Employee Number to search." The Supabase query is also skipped server-side until a query is provided, so viewers can't enumerate the full member list. Admins see the full paginated table as before. Logic lives in `app/(app)/members/page.tsx` (`showTable = isAdmin || hasQuery`).

### SWEAP Forms (PDF library)
Admins upload PDFs at `/admin/forms`; all authenticated users see them in the sidebar's "SWEAP Forms" dropdown and click a name to download.

- Files live in the **private** Supabase Storage bucket `sweap-forms` (created by `0003_sweap_forms.sql`). The bucket is non-public — direct URLs won't work; downloads must go through the API.
- `app/api/admin/forms/route.ts` (POST) accepts multipart `name` + PDF `file`, uploads via the **service-role** client, and inserts a row in `sweap_forms`. Admin-gated.
- `app/api/forms/[id]/download/route.ts` streams the bytes back with `Content-Disposition: attachment` so the browser downloads instead of navigating. Available to any signed-in user; uses the service-role client server-side to read the private bucket.
- `app/api/forms/route.ts` returns `{id, name}` for the sidebar; the sidebar fetches it client-side on mount.

### Life status columns
- **`sweap_members.employee_status`** — `'active' | 'separated' | 'deceased'`, added in migration `0004_employee_status.sql`. Lowercase enum enforced by a CHECK constraint. When `deceased`, the profile view applies `pointer-events-none opacity-60 grayscale` to the detail grid and hides the Edit link. Updated via `PATCH /api/members/[employeeNumber]/status` (admin-gated) when toggled from the profile view; the member-form also submits it as part of the full record on save.
- **`member_dependents.status`** — pre-existing CSV column (`"Active" | "Deceased"`, capitalized to match form imports). Updated via `PATCH /api/members/[employeeNumber]/dependents/[slot]/status` (admin-gated) from the dependents table on the profile view.

The dashboard's "Staff (deceased)" / "Dependents (deceased)" cards count these directly. Earlier versions of the app stored both in `localStorage` (`employee-status:<empNo>` and `dependent-status:<empNo>` keys) — those keys are no longer read or written, and any per-device selections made before migration `0004` ran are not preserved.

### Routing
- `app/(app)/**` — authenticated app shell with sidebar (`components/sidebar.tsx`); the layout fetches the session + profile via `getSessionAndProfile()` and redirects to `/login` if missing.
- `app/(app)/admin/data-management/**` — Import + Export + Danger Zone tabs (admin-only). Old `/import` and `/export` top-level routes have been removed; `/api/import` and `/api/export` remain unchanged.
- `app/login/**` — the page is a server-component Suspense wrapper; the actual form is in `login-form.tsx` because `useSearchParams()` requires a Suspense boundary in Next.js 14 strict static-prerender.
- `app/api/**` — JSON route handlers, admin-gated except `/api/auth/resolve-username`, `/api/forms` (list), and `/api/forms/[id]/download` (any signed-in user).

### Admin user management
- `app/(app)/admin/users/page.tsx` fetches profiles plus enriches each row with `last_sign_in_at` from `auth.admin.listUsers()` (paged at 200) and renders `components/users-manager.tsx`.
- All actions (Create / Edit / Reset password / Delete) are modal-based with show/hide password toggles. `Reset password` requires the admin to type a new password (min 6 chars); there is no auto-generated temp password.
- `DELETE /api/admin/users/[id]` removes the auth user and the profile row.

## Migrations

`supabase/migrations/*.sql` is run **manually in the Supabase SQL editor** (no Supabase CLI is wired up). Migrations are numbered:

- `0001_init.sql` — schema, enums, indexes, RLS, `is_admin()`, profile + audit triggers
- `0002_add_username.sql` — adds the `username` column and back-fills it from existing emails
- `0003_sweap_forms.sql` — `sweap_forms` table + private `sweap-forms` storage bucket with RLS (authenticated read, admin write) for the PDF form library

When introducing schema changes, write a new numbered file; do not edit prior ones in place.

## Deployment

Vercel auto-deploys `main`. The build also runs `tsc` strict — common build-only failures we've already fixed and should not regress:

- `XLSX.write` returning a `Buffer` rejected by `NextResponse` body type → use `type: "array"` (returns `ArrayBuffer`).
- `setAll(cookiesToSet)` callbacks for `@supabase/ssr` need an explicit `CookieOptions[]` parameter type — implicit `any` fails strict mode.
- `useSearchParams()` must be inside a `<Suspense>` boundary or Next.js refuses to prerender.
