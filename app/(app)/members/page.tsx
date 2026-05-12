import Link from "next/link";
import { createClient, getSessionAndProfile } from "@/lib/supabase/server";

export default async function MembersListPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const supabase = createClient();
  const { profile } = await getSessionAndProfile();
  const isEditor = profile?.role === "admin" || profile?.role === "encoder";

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const hasQuery = !!searchParams.q;
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
    if (searchParams.q) query = query.ilike("employee_number", `%${searchParams.q}%`);
    const res = await query;
    data = res.data;
    count = res.count || 0;
    error = res.error;
  }

  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Members</h1>
        {showTable
          ? <p className="text-sm text-slate-500">{count} record{count === 1 ? "" : "s"}</p>
          : <p className="text-sm text-slate-500">Enter an Employee Number to search.</p>}
      </div>

      <form className="mr-auto flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm md:w-1/2">
        <input name="q" defaultValue={searchParams.q || ""} placeholder="Employee No.…" className="flex-1 rounded-md border border-slate-300 px-3 py-1.5" />
        <button className="rounded-md bg-slate-800 px-4 py-1.5 text-white">Search</button>
      </form>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error.message}</div>}

      {showTable && (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Employee No.</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Chapter</th>
              <th className="px-4 py-2">Division</th>
              <th className="px-4 py-2">Position</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((m: any) => (
              <tr key={m.employee_number} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-xs">
                  <Link href={`/members/${encodeURIComponent(m.employee_number)}`} className="text-brand-700 hover:underline">
                    {m.employee_number}
                  </Link>
                </td>
                <td className="px-4 py-2 font-medium">{m.full_name}</td>
                <td className="px-4 py-2">{m.chapter_base || "—"}</td>
                <td className="px-4 py-2">{m.division || "—"}</td>
                <td className="px-4 py-2">{m.position || "—"}</td>
                <td className="px-4 py-2">{m.status_of_employment || "—"}</td>
              </tr>
            ))}
            {(data || []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No members match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {showTable && (
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          {page > 1 && <Link href={`?${new URLSearchParams({ ...(searchParams as any), page: String(page - 1) }).toString()}`} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100">Prev</Link>}
          {page < totalPages && <Link href={`?${new URLSearchParams({ ...(searchParams as any), page: String(page + 1) }).toString()}`} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100">Next</Link>}
        </div>
      </div>
      )}
    </div>
  );
}
