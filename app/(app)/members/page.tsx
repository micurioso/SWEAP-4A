import Link from "next/link";
import { ArrowUpRight, Briefcase, Building2, ChevronLeft, ChevronRight, MapPin, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { createClient, getSessionAndProfile } from "@/lib/supabase/server";

type MemberSearchParams = {
  q?: string;
  name?: string;
  chapter?: string;
  division?: string;
  position?: string;
  status?: string;
  page?: string;
};

type FilterOptionRow = {
  division?: string | null;
  position?: string | null;
  status_of_employment?: string | null;
};

const FILTER_FIELDS = [
  { name: "name", label: "Member name", placeholder: "e.g. Juan Dela Cruz" },
  { name: "chapter", label: "Chapter", placeholder: "Search chapter" },
  { name: "division", label: "Division", placeholder: "Search division" },
  { name: "position", label: "Position", placeholder: "Search position" },
  { name: "status", label: "Employment status", placeholder: "e.g. Permanent" }
] as const;

function cleanFilter(value?: string) {
  return value?.trim().slice(0, 160) ?? "";
}

function cleanNameFilter(value?: string) {
  return cleanFilter(value)
    .replace(/[^\p{L}\p{N}'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueValues(rows: FilterOptionRow[], key: keyof FilterOptionRow) {
  const values = new Map<string, string>();

  rows.forEach(row => {
    const value = row[key]?.trim();
    if (value && !values.has(value.toLocaleLowerCase())) {
      values.set(value.toLocaleLowerCase(), value);
    }
  });

  return Array.from(values.values()).sort((left, right) => left.localeCompare(right));
}

async function loadFilterOptions(supabase: ReturnType<typeof createClient>) {
  const rows: FilterOptionRow[] = [];
  const batchSize = 1000;

  for (let offset = 0; offset < 10000; offset += batchSize) {
    const { data, error } = await supabase
      .from("sweap_members")
      .select("division, position, status_of_employment")
      .range(offset, offset + batchSize - 1);

    if (error) break;

    const batch = (data ?? []) as FilterOptionRow[];
    rows.push(...batch);
    if (batch.length < batchSize) break;
  }

  return {
    divisions: uniqueValues(rows, "division"),
    positions: uniqueValues(rows, "position"),
    employmentStatuses: uniqueValues(rows, "status_of_employment")
  };
}

function memberInitials(name?: string | null) {
  const parts = (name || "")
    .replace(",", " ")
    .split(/\s+/)
    .filter(Boolean);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase() || "M";
}

function pageHref(searchParams: MemberSearchParams, page: number) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (key !== "page" && typeof value === "string" && value.trim()) {
      params.set(key, value.trim());
    }
  });
  params.set("page", String(page));
  return `?${params.toString()}`;
}

export default async function MembersListPage({ searchParams }: { searchParams: MemberSearchParams }) {
  const supabase = createClient();
  const { profile } = await getSessionAndProfile();
  const isEditor = profile?.role === "admin" || profile?.role === "encoder";

  const filters = {
    q: cleanFilter(searchParams.q),
    name: cleanNameFilter(searchParams.name),
    chapter: cleanFilter(searchParams.chapter),
    division: cleanFilter(searchParams.division),
    position: cleanFilter(searchParams.position),
    status: cleanFilter(searchParams.status)
  };
  const filterOptions = await loadFilterOptions(supabase);
  const dropdownOptions: Record<string, string[]> = {
    division: filterOptions.divisions,
    position: filterOptions.positions,
    status: filterOptions.employmentStatuses
  };
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const hasAdvancedQuery = Boolean(
    filters.name || filters.chapter || filters.division || filters.position || filters.status
  );
  const hasQuery = Boolean(filters.q || hasAdvancedQuery);
  const showTable = isEditor || hasQuery;

  let data: any[] | null = null;
  let count = 0;
  let error: { message: string } | null = null;

  if (showTable) {
    let query = supabase
      .from("sweap_members")
      .select("employee_number, full_name, chapter_base, division, position, status_of_employment", { count: "exact" })
      .order("full_name", { ascending: true })
      .range(from, to);

    if (filters.q) query = query.ilike("employee_number", `%${filters.q}%`);
    if (filters.name) {
      for (const token of filters.name.split(" ").filter(Boolean).slice(0, 8)) {
        query = query.ilike("full_name", `%${token}%`);
      }
    }
    if (filters.chapter) query = query.ilike("chapter_base", `%${filters.chapter}%`);
    if (filters.division) query = query.eq("division", filters.division);
    if (filters.position) query = query.eq("position", filters.position);
    if (filters.status) query = query.eq("status_of_employment", filters.status);

    const res = await query;
    data = res.data;
    count = res.count || 0;
    error = res.error;
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Members</h1>
        {showTable
          ? <p className="text-sm text-slate-500">{count.toLocaleString()} record{count === 1 ? "" : "s"}</p>
          : <p className="text-sm text-slate-500">Search for a member using any field below.</p>}
      </div>

      <form autoComplete="off" className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label htmlFor="member-search-employee" className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Employee number
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="member-search-employee"
                name="q"
                defaultValue={filters.q}
                placeholder="Search employee number"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </label>
          <div className="flex gap-2">
            <button className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-brand-700 sm:flex-none">
              <Search className="h-4 w-4" />
              Search
            </button>
            {hasQuery && (
              <Link
                href="/members"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Clear
              </Link>
            )}
          </div>
        </div>

        <details open={hasAdvancedQuery} className="mt-3 border-t border-slate-100 pt-3">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-slate-700 marker:content-none">
            <SlidersHorizontal className="h-4 w-4 text-brand-700" />
            Advanced search
            <span className="basis-full pl-6 font-normal text-slate-500 sm:basis-auto sm:pl-0">
              Name, chapter, division, position, or status
            </span>
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {FILTER_FIELDS.map(field => {
              const options = dropdownOptions[field.name] ?? [];
              const isDropdown = options.length > 0;
              const emptyLabel = field.name === "status"
                ? "All employment statuses"
                : `All ${field.name}s`;

              return (
                <label key={field.name} htmlFor={`member-search-${field.name}`} className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">{field.label}</span>
                  {isDropdown ? (
                    <select
                      id={`member-search-${field.name}`}
                      name={field.name}
                      defaultValue={filters[field.name]}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="">{emptyLabel}</option>
                      {options.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input
                      id={`member-search-${field.name}`}
                      name={field.name}
                      defaultValue={filters[field.name]}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  )}
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Name and chapter support partial matches. Use the dropdowns to narrow division, position, or employment status.
          </p>
        </details>
      </form>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error.message}</div>}

      {showTable && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-blue-300">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-800">Member directory</h2>
                <p className="text-xs text-slate-500">Select an employee number or name to view the complete profile.</p>
              </div>
            </div>
            <span className="pl-[52px] text-xs font-medium text-slate-500 sm:pl-0">
              {count === 0 ? "No results" : `Showing ${from + 1}–${Math.min(to + 1, count)} of ${count.toLocaleString()}`}
            </span>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="w-32 px-5 py-3.5">Employee No.</th>
                  <th className="min-w-64 px-5 py-3.5">Member</th>
                  <th className="px-5 py-3.5">Chapter</th>
                  <th className="px-5 py-3.5">Division</th>
                  <th className="px-5 py-3.5">Position</th>
                  <th className="w-36 px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data || []).map((member: any) => {
                  const profileHref = `/members/${encodeURIComponent(member.employee_number)}`;
                  return (
                    <tr key={member.employee_number} className="group transition-colors hover:bg-brand-50/40 dark:hover:bg-slate-800/60">
                      <td className="px-5 py-4 align-middle">
                        <Link
                          href={profileHref}
                          className="inline-flex rounded-md border border-brand-100 bg-brand-50 px-2.5 py-1 font-mono text-[13px] font-semibold text-brand-700 transition hover:border-brand-500 hover:bg-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                        >
                          {member.employee_number}
                        </Link>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <Link href={profileHref} className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-slate-800">
                            {memberInitials(member.full_name)}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 font-semibold text-slate-800 group-hover:text-brand-700 dark:group-hover:text-blue-300">
                              <span className="truncate">{member.full_name}</span>
                              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">View member profile</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-4 align-middle text-slate-600">{member.chapter_base || "—"}</td>
                      <td className="max-w-72 px-5 py-4 align-middle leading-5 text-slate-600">{member.division || "—"}</td>
                      <td className="max-w-72 px-5 py-4 align-middle leading-5 text-slate-600">{member.position || "—"}</td>
                      <td className="px-5 py-4 align-middle">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {member.status_of_employment || "Not set"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(data || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-slate-400">
                      No members match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {(data || []).map((member: any) => {
              const profileHref = `/members/${encodeURIComponent(member.employee_number)}`;
              return (
                <Link key={member.employee_number} href={profileHref} className="block p-4 transition-colors hover:bg-brand-50/40 dark:hover:bg-slate-800/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700 dark:bg-slate-800 dark:text-blue-300">
                        {memberInitials(member.full_name)}
                      </span>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-slate-800">{member.full_name}</p>
                        <p className="mt-1 inline-flex rounded-md bg-brand-50 px-2 py-1 font-mono text-[13px] font-semibold text-brand-700 dark:bg-slate-800 dark:text-blue-300">
                          {member.employee_number}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-400" />
                  </div>
                  <div className="mt-4 grid gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{member.chapter_base || "Chapter not set"}</span>
                    <span className="flex items-start gap-2"><Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />{member.division || "Division not set"}</span>
                    <span className="flex items-start gap-2"><Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0" />{member.position || "Position not set"}</span>
                  </div>
                  <span className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {member.status_of_employment || "Status not set"}
                  </span>
                </Link>
              );
            })}
            {(data || []).length === 0 && (
              <div className="px-5 py-14 text-center text-sm text-slate-400">No members match your filters.</div>
            )}
          </div>
        </div>
      )}

      {showTable && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-slate-500">
            Page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(searchParams, page - 1)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 sm:flex-none">
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(searchParams, page + 1)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 sm:flex-none">
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
