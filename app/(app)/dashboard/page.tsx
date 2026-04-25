import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SearchBar from "@/components/search-bar";

export default async function DashboardPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient();
  const [{ count: memberCount }, { data: recent }] = await Promise.all([
    supabase.from("sweap_members").select("*", { count: "exact", head: true }),
    supabase.from("sweap_members")
      .select("employee_number, full_name, division, chapter_base, updated_at")
      .order("updated_at", { ascending: false })
      .limit(8)
  ]);

  return (
    <div className="space-y-6">
      {searchParams.error === "forbidden" && (
        <div className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">
          You don&apos;t have permission to access that page.
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Find a member</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search by Employee Number for an exact match, or by name to browse.
        </p>
        <div className="mt-4">
          <SearchBar />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-slate-400">Total members</div>
          <div className="mt-1 text-3xl font-bold text-slate-800">{memberCount ?? 0}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 md:col-span-2">
          <div className="mb-3 text-xs uppercase tracking-wide text-slate-400">Recently updated</div>
          <ul className="divide-y divide-slate-100 text-sm">
            {(recent || []).map((m: any) => (
              <li key={m.employee_number} className="flex items-center justify-between py-2">
                <Link href={`/members/${encodeURIComponent(m.employee_number)}`} className="font-medium text-brand-700 hover:underline">
                  {m.full_name}
                </Link>
                <div className="text-xs text-slate-500">
                  {m.employee_number} · {m.chapter_base || "—"} · {new Date(m.updated_at).toLocaleDateString()}
                </div>
              </li>
            ))}
            {(recent || []).length === 0 && <li className="py-3 text-slate-400">No records yet.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
