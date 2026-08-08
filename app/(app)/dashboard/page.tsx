import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Building2,
  HeartPulse,
  MapPin,
  UserCheck,
  UserMinus,
  UsersRound
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Tone = "emerald" | "slate" | "rose" | "violet";

const TONE_STYLES: Record<Tone, { bar: string; icon: string; value: string }> = {
  emerald: {
    bar: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-700",
    value: "text-emerald-600"
  },
  slate: {
    bar: "bg-slate-400",
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-600"
  },
  rose: {
    bar: "bg-rose-500",
    icon: "bg-red-50 text-red-700",
    value: "text-rose-600"
  },
  violet: {
    bar: "bg-violet-500",
    icon: "bg-violet-50 text-violet-700",
    value: "text-violet-600"
  }
};

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone
}: {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 ${styles.bar}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
          <div className={`mt-2 text-3xl font-bold tracking-tight ${styles.value}`}>{value}</div>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

function BreakdownCard({
  title,
  description,
  entries,
  maximum,
  icon: Icon,
  barClassName
}: {
  title: string;
  description: string;
  entries: Array<[string, number]>;
  maximum: number;
  icon: LucideIcon;
  barClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <div className="p-5">
        {entries.length === 0 ? (
          <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-400">
            No data available yet
          </div>
        ) : (
          <ul className="max-h-80 space-y-3 overflow-y-auto pr-1 text-sm">
            {entries.map(([label, count]) => (
              <li key={label}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-slate-600" title={label}>{label}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-500">
                    {count}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${barClassName}`}
                    style={{ width: `${(count / maximum) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient();

  const [
    { count: staffActiveCount },
    { count: staffSeparatedCount },
    { count: staffDeceasedCount },
    { count: dependentsDeceasedCount },
    { data: chapterRows }
  ] = await Promise.all([
    supabase.from("sweap_members").select("*", { count: "exact", head: true }).eq("employee_status", "active"),
    supabase.from("sweap_members").select("*", { count: "exact", head: true }).eq("employee_status", "separated"),
    supabase.from("sweap_members").select("*", { count: "exact", head: true }).eq("employee_status", "deceased"),
    supabase.from("member_dependents").select("*", { count: "exact", head: true }).ilike("status", "deceased"),
    supabase.from("sweap_members").select("chapter_base, division, status_of_employment")
  ]);

  const chapterCounts: Record<string, number> = {};
  const divisionCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  for (const row of chapterRows || []) {
    const chapter = row.chapter_base || "Not specified";
    const division = row.division || "Not specified";
    const status = row.status_of_employment || "Not specified";
    chapterCounts[chapter] = (chapterCounts[chapter] || 0) + 1;
    divisionCounts[division] = (divisionCounts[division] || 0) + 1;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  const chapterEntries = Object.entries(chapterCounts).sort((a, b) => b[1] - a[1]);
  const divisionEntries = Object.entries(divisionCounts).sort((a, b) => b[1] - a[1]);
  const statusEntries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  const maxChapter = Math.max(1, ...chapterEntries.map(([, count]) => count));
  const maxDivision = Math.max(1, ...divisionEntries.map(([, count]) => count));
  const maxStatus = Math.max(1, ...statusEntries.map(([, count]) => count));
  return (
    <div className="space-y-6">
      {searchParams.error === "forbidden" && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          <Activity className="h-4 w-4 shrink-0" />
          You don&apos;t have permission to access that page.
        </div>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Membership summary</h2>
            <p className="mt-0.5 text-xs text-slate-400">Current record status across staff and dependents</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active staff"
            value={staffActiveCount ?? 0}
            description="Employees currently marked as active"
            icon={UserCheck}
            tone="emerald"
          />
          <StatCard
            label="Separated staff"
            value={staffSeparatedCount ?? 0}
            description="Employees with separated status"
            icon={UserMinus}
            tone="slate"
          />
          <StatCard
            label="Deceased staff"
            value={staffDeceasedCount ?? 0}
            description="Employee records marked as deceased"
            icon={HeartPulse}
            tone="rose"
          />
          <StatCard
            label="Deceased dependents"
            value={dependentsDeceasedCount ?? 0}
            description="Declared dependents marked as deceased"
            icon={UsersRound}
            tone="violet"
          />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-800">Organization breakdown</h2>
          <p className="mt-0.5 text-xs text-slate-400">Explore how member records are distributed</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Employment status</h2>
                <p className="mt-0.5 text-xs text-slate-400">Distribution across employment classifications</p>
              </div>
            </div>
            <div className="p-5">
              {statusEntries.length === 0 ? (
                <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-400">
                  No data available yet
                </div>
              ) : (
                <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                  {statusEntries.map(([status, count]) => (
                    <li key={status}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate font-medium text-slate-600" title={status}>{status}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-500">{count}</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${(count / maxStatus) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <BreakdownCard
            title="Members by chapter"
            description="Record count for each chapter base"
            entries={chapterEntries}
            maximum={maxChapter}
            icon={MapPin}
            barClassName="bg-brand-500"
          />
          <BreakdownCard
            title="Members by division"
            description="Record count for each organizational division"
            entries={divisionEntries}
            maximum={maxDivision}
            icon={Building2}
            barClassName="bg-emerald-500"
          />
        </div>
      </section>
    </div>
  );
}
