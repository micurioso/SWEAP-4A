import Link from "next/link";
import {
  ArrowDownRight,
  Clock3,
  Database,
  Download,
  FilePlus2,
  Filter,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
  UserRound,
  UsersRound
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;
const ACTIONS = ["insert", "update", "delete", "import", "export", "login"] as const;

type AuditSearchParams = {
  cursor?: string;
  user?: string;
  action?: string;
  area?: string;
  target?: string;
};

type AuditRow = {
  id: number;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  target_table?: string | null;
  target_id?: string | null;
  diff?: any;
  created_at: string;
};

type Profile = {
  id: string;
  email?: string | null;
  username?: string | null;
};

function clean(value?: string, max = 120) {
  return value?.trim().slice(0, max) ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fieldChanges(diff: unknown): { field: string; before: unknown; after: unknown }[] {
  if (!isRecord(diff)) return [];
  const before = diff.before;
  const after = diff.after;
  if (!isRecord(before) || !isRecord(after)) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Array.from(keys)
    .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map(field => ({ field, before: before[field], after: after[field] }));
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function fieldLabel(field: string) {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, character => character.toUpperCase());
}

function dataAreaLabel(table?: string | null) {
  const labels: Record<string, string> = {
    sweap_members: "Member",
    member_dependents: "Dependent",
    member_claimants: "Claimant",
    profiles: "User account",
    "auth.users": "Authentication account",
    sweap_forms: "SWEAP form"
  };
  return table ? labels[table] ?? fieldLabel(table) : "System";
}

function actionStyle(action: string) {
  if (action === "insert") return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  if (action === "update") return "bg-amber-50 text-amber-700 ring-amber-600/20";
  if (action === "delete") return "bg-red-50 text-red-700 ring-red-600/20";
  if (action === "import") return "bg-violet-50 text-violet-700 ring-violet-600/20";
  if (action === "export") return "bg-brand-50 text-brand-700 ring-brand-500/20";
  return "bg-slate-100 text-slate-700 ring-slate-500/20";
}

function ActionIcon({ action }: { action: string }) {
  if (action === "insert") return <FilePlus2 className="h-4 w-4" />;
  if (action === "update") return <Pencil className="h-4 w-4" />;
  if (action === "delete") return <Trash2 className="h-4 w-4" />;
  if (action === "import") return <Upload className="h-4 w-4" />;
  if (action === "export") return <Download className="h-4 w-4" />;
  return <Database className="h-4 w-4" />;
}

function AuditDetails({ row }: { row: AuditRow }) {
  const changes = fieldChanges(row.diff);

  if (row.action === "update" && changes.length > 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[minmax(110px,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <span>Field</span><span>Before</span><span>After</span>
        </div>
        {changes.map(change => (
          <div key={change.field} className="grid grid-cols-[minmax(110px,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-t border-slate-100 px-3 py-2.5 text-xs">
            <span className="font-medium text-slate-700">{fieldLabel(change.field)}</span>
            <pre className="whitespace-pre-wrap break-words font-sans text-red-700">{displayValue(change.before)}</pre>
            <pre className="whitespace-pre-wrap break-words font-sans text-emerald-700">{displayValue(change.after)}</pre>
          </div>
        ))}
      </div>
    );
  }

  if (row.action === "update" && isRecord(row.diff) && (row.diff.before !== undefined || row.diff.after !== undefined)) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-red-100 bg-red-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Before</p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-700">{displayValue(row.diff.before)}</pre>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">After</p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-700">{displayValue(row.diff.after)}</pre>
        </div>
      </div>
    );
  }

  if (isRecord(row.diff)) {
    return (
      <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(row.diff).map(([field, value]) => (
          <div key={field} className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{fieldLabel(field)}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700">{displayValue(value)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return <p className="text-xs text-slate-500">No additional details were recorded for this activity.</p>;
}

function auditHref(searchParams: AuditSearchParams, cursor?: number) {
  const params = new URLSearchParams();
  for (const key of ["user", "action", "area", "target"] as const) {
    const value = clean(searchParams[key]);
    if (value) params.set(key, value);
  }
  if (cursor) params.set("cursor", String(cursor));
  const query = params.toString();
  return query ? `?${query}` : "/admin/audit";
}

export default async function AuditPage({ searchParams }: { searchParams: AuditSearchParams }) {
  const supabase = createClient();
  const filters = {
    user: clean(searchParams.user),
    action: ACTIONS.includes(searchParams.action as typeof ACTIONS[number]) ? searchParams.action! : "",
    area: clean(searchParams.area),
    target: clean(searchParams.target)
  };
  const parsedCursor = Number.parseInt(searchParams.cursor ?? "", 10);
  const cursor = Number.isSafeInteger(parsedCursor) && parsedCursor > 0 ? parsedCursor : null;

  const { data: profiles } = await supabase.from("profiles").select("id, email, username");
  const profileRows = (profiles ?? []) as Profile[];
  const profileMap = new Map(profileRows.map(profile => [profile.id, profile]));
  const matchingActorIds = filters.user
    ? profileRows
        .filter(profile => (profile.username ?? profile.email ?? "").toLocaleLowerCase().includes(filters.user.toLocaleLowerCase()))
        .map(profile => profile.id)
    : [];
  const canQuery = !filters.user || matchingActorIds.length > 0;

  function applyFilters(query: any, includeCursor: boolean) {
    let filtered = query;
    if (filters.action) filtered = filtered.eq("action", filters.action);
    if (filters.area) filtered = filtered.ilike("target_table", `%${filters.area}%`);
    if (filters.target) filtered = filtered.ilike("target_id", `%${filters.target}%`);
    if (filters.user) filtered = filtered.in("actor_id", matchingActorIds);
    if (includeCursor && cursor) filtered = filtered.lt("id", cursor);
    return filtered;
  }

  let rows: AuditRow[] = [];
  let totalCount = 0;
  let errorMessage = "";
  if (canQuery) {
    const [rowsResult, countResult] = await Promise.all([
      applyFilters(
        supabase
          .from("audit_log")
          .select("id, actor_id, actor_email, action, target_table, target_id, diff, created_at")
          .order("id", { ascending: false })
          .limit(PAGE_SIZE + 1),
        true
      ),
      applyFilters(
        supabase.from("audit_log").select("id", { count: "exact", head: true }),
        false
      )
    ]);
    rows = (rowsResult.data ?? []) as AuditRow[];
    totalCount = countResult.count ?? 0;
    errorMessage = rowsResult.error?.message ?? countResult.error?.message ?? "";
  }

  const hasMore = rows.length > PAGE_SIZE;
  const visibleRows = rows.slice(0, PAGE_SIZE);
  const usernames = new Set(
    visibleRows.map(row => {
      const profile = row.actor_id ? profileMap.get(row.actor_id) : null;
      return profile?.username ?? row.actor_email?.split("@")[0] ?? "System";
    })
  );
  const hasFilters = Boolean(filters.user || filters.action || filters.area || filters.target);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Audit log</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
          A transparent history of data changes, including the user, affected record, timestamp, and before-and-after values.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Database className="h-4 w-4 text-brand-700" /> Matching activity
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{totalCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <ArrowDownRight className="h-4 w-4 text-brand-700" /> Entries shown
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{visibleRows.length.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <UsersRound className="h-4 w-4 text-brand-700" /> Users on this page
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{usernames.size.toLocaleString()}</p>
        </div>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[1fr_0.8fr_1fr_1fr_auto] xl:items-end">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">User</span>
          <input name="user" defaultValue={filters.user} placeholder="Search username" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Action</span>
          <select name="action" defaultValue={filters.action} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
            <option value="">All actions</option>
            {ACTIONS.map(action => <option key={action} value={action}>{fieldLabel(action)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Data area</span>
          <input name="area" defaultValue={filters.area} placeholder="e.g. members or profiles" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Target record</span>
          <input name="target" defaultValue={filters.target} placeholder="Employee no. or record ID" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </label>
        <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
          <button className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            <Filter className="h-4 w-4" /> Filter
          </button>
          {hasFilters && (
            <Link href="/admin/audit" aria-label="Clear filters" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 text-slate-600 hover:bg-slate-50">
              <RotateCcw className="h-4 w-4" />
            </Link>
          )}
        </div>
      </form>

      {errorMessage && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>}

      <div className="space-y-3">
        {visibleRows.map(row => {
          const profile = row.actor_id ? profileMap.get(row.actor_id) : null;
          const username = profile?.username ?? row.actor_email?.split("@")[0] ?? "System";
          const userDisplay = username === "System" ? "System" : `@${username}`;
          const changes = fieldChanges(row.diff);
          return (
            <details key={row.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <summary className="cursor-pointer list-none p-4 marker:content-none">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${actionStyle(row.action)}`}>
                      <ActionIcon action={row.action} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${actionStyle(row.action)}`}>
                          {row.action}
                        </span>
                        <span className="font-semibold text-slate-800">{dataAreaLabel(row.target_table)}</span>
                        {row.target_id && <span className="break-all font-mono text-xs text-slate-500">{row.target_id}</span>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> User: <strong className="font-semibold text-slate-700">{userDisplay}</strong></span>
                        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {new Date(row.created_at).toLocaleString("en-PH")}</span>
                        <span className="inline-flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> {row.target_table ?? "system"}</span>
                      </div>
                    </div>
                  </div>
                  <span className="self-start rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-brand-700 group-open:bg-brand-50 lg:self-auto">
                    {row.action === "update" && changes.length > 0
                      ? `${changes.length} field${changes.length === 1 ? "" : "s"} changed`
                      : "View full details"}
                  </span>
                </div>
              </summary>
              <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                <AuditDetails row={row} />
              </div>
            </details>
          );
        })}
        {visibleRows.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
            <Database className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">No activity matches these filters.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-slate-500">Showing newest activity first, up to {PAGE_SIZE} entries at a time.</p>
        <div className="flex gap-2">
          {cursor && <Link href={auditHref(searchParams)} className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-600 hover:bg-slate-50">Back to newest</Link>}
          {hasMore && visibleRows.length > 0 && (
            <Link href={auditHref(searchParams, visibleRows[visibleRows.length - 1].id)} className="rounded-lg bg-slate-800 px-3 py-2 font-medium text-white hover:bg-slate-700">
              Older activity
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
