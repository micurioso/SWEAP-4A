import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient();

  const [
    { count: memberCount },
    { count: claimedCount },
    { data: dependentRows },
    { data: chapterRows }
  ] = await Promise.all([
    supabase.from("sweap_members").select("*", { count: "exact", head: true }),
    supabase.from("sweap_members").select("*", { count: "exact", head: true }).eq("claimed_burial_assistance", true),
    supabase.from("member_dependents").select("check_voucher_number"),
    supabase.from("sweap_members").select("chapter_base, division, status_of_employment")
  ]);

  const dependents = dependentRows || [];
  const processedClaims = dependents.filter((d: any) => d.check_voucher_number && String(d.check_voucher_number).trim() !== "").length;

  const chapterCounts: Record<string, number> = {};
  const divisionCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  for (const r of chapterRows || []) {
    const ch = (r as any).chapter_base || "—";
    const dv = (r as any).division || "—";
    const st = (r as any).status_of_employment || "—";
    chapterCounts[ch] = (chapterCounts[ch] || 0) + 1;
    divisionCounts[dv] = (divisionCounts[dv] || 0) + 1;
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  }
  const chapterEntries = Object.entries(chapterCounts).sort((a, b) => b[1] - a[1]);
  const divisionEntries = Object.entries(divisionCounts).sort((a, b) => b[1] - a[1]);
  const statusEntries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  const maxChapter = Math.max(1, ...chapterEntries.map(([, n]) => n));
  const maxDivision = Math.max(1, ...divisionEntries.map(([, n]) => n));
  const maxStatus = Math.max(1, ...statusEntries.map(([, n]) => n));

  return (
    <div className="space-y-6">
      {searchParams.error === "forbidden" && (
        <div className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">
          You don&apos;t have permission to access that page.
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-slate-400">Total members</div>
          <div className="mt-1 text-3xl font-bold text-slate-800">{memberCount ?? 0}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-slate-400">Burial assistance claimed</div>
          <div className="mt-1 text-3xl font-bold text-emerald-600">{claimedCount ?? 0}</div>
          <div className="mt-1 text-xs text-slate-500">members marked as claimed</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-slate-400">Claims processed</div>
          <div className="mt-1 text-3xl font-bold text-brand-700">{processedClaims}</div>
          <div className="mt-1 text-xs text-slate-500">dependents with voucher #</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="mb-3 text-xs uppercase tracking-wide text-slate-400">Members by employment status</div>
          {statusEntries.length === 0 ? (
            <div className="text-sm text-slate-400">No data yet.</div>
          ) : (
            <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {statusEntries.map(([status, n]) => (
                <li key={status}>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="truncate font-medium" title={status}>{status}</span>
                    <span className="font-mono text-slate-500">{n}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${(n / maxStatus) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 text-xs uppercase tracking-wide text-slate-400">Members by chapter</div>
          {chapterEntries.length === 0 ? (
            <div className="text-sm text-slate-400">No data yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {chapterEntries.map(([chapter, n]) => (
                <li key={chapter}>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium">{chapter}</span>
                    <span className="font-mono text-slate-500">{n}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(n / maxChapter) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 text-xs uppercase tracking-wide text-slate-400">Members by division</div>
          {divisionEntries.length === 0 ? (
            <div className="text-sm text-slate-400">No data yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {divisionEntries.map(([division, n]) => (
                <li key={division}>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium">{division}</span>
                    <span className="font-mono text-slate-500">{n}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(n / maxDivision) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </section>
    </div>
  );
}
