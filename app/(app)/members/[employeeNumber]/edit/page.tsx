import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, PencilLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import MemberForm from "@/components/member-form";
import type { MemberWithRelations } from "@/lib/schemas";

function initials(name: string) {
  const parts = name
    .replace(",", " ")
    .split(/\s+/)
    .filter(Boolean);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase() || "M";
}

export default async function EditMemberPage({ params }: { params: { employeeNumber: string } }) {
  const employeeNumber = decodeURIComponent(params.employeeNumber);
  const supabase = createClient();
  const [{ data: member }, { data: dependents }, { data: claimants }] = await Promise.all([
    supabase.from("sweap_members").select("*").eq("employee_number", employeeNumber).maybeSingle(),
    supabase.from("member_dependents").select("*").eq("employee_number", employeeNumber).order("slot"),
    supabase.from("member_claimants").select("*").eq("employee_number", employeeNumber).order("slot")
  ]);
  if (!member) notFound();

  const initial: MemberWithRelations = {
    ...(member as any),
    dependents: (dependents || []) as any,
    claimants: (claimants || []) as any
  };
  const profileHref = `/members/${encodeURIComponent(employeeNumber)}`;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-sky-50 p-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-100/60 blur-3xl dark:bg-blue-900/20" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-xl font-semibold text-white shadow-lg shadow-brand-600/20">
              {initials(member.full_name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-brand-200 bg-white/80 px-2.5 py-1 font-mono text-xs font-medium text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-300">
                  {employeeNumber}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/70">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Member record
                </span>
              </div>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                <PencilLine className="h-5 w-5 text-brand-600 dark:text-blue-400" />
                Edit member profile
              </h1>
              <p className="mt-1 break-words text-sm text-slate-600">{member.full_name}</p>
            </div>
          </div>
          <Link
            href={profileHref}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            View profile
          </Link>
        </div>
        <div className="relative mt-5 border-t border-brand-100 pt-4 text-sm text-slate-500 dark:border-slate-700">
          Review each section below. Changes are applied only when you select <span className="font-semibold text-slate-700">Save changes</span>.
        </div>
      </section>

      <MemberForm mode="edit" initial={initial} cancelHref={profileHref} />
    </div>
  );
}
