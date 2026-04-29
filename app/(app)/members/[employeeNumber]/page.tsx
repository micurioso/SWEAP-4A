import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getSessionAndProfile } from "@/lib/supabase/server";
import DependentsTable from "./dependents-table";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-800">{value || <span className="text-slate-300">—</span>}</dd>
    </div>
  );
}

function YN(b?: boolean | null) { return b === null || b === undefined ? "—" : b ? "Yes" : "No"; }

export default async function MemberProfile({ params }: { params: { employeeNumber: string } }) {
  const employeeNumber = decodeURIComponent(params.employeeNumber);
  const supabase = createClient();
  const { profile } = await getSessionAndProfile();
  const isAdmin = profile?.role === "admin";

  const [{ data: member }, { data: dependents }, { data: claimants }] = await Promise.all([
    supabase.from("sweap_members").select("*").eq("employee_number", employeeNumber).maybeSingle(),
    supabase.from("member_dependents").select("*").eq("employee_number", employeeNumber).order("slot"),
    supabase.from("member_claimants").select("*").eq("employee_number", employeeNumber).order("slot")
  ]);

  if (!member) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-slate-400">{member.employee_number}</div>
          <h1 className="text-2xl font-semibold text-slate-800">{member.full_name}</h1>
          <div className="mt-1 text-sm text-slate-500">{member.position} · {member.division}</div>
        </div>
        <div className="flex gap-2">
          <Link href="/members" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">Back</Link>
          {isAdmin && (
            <Link href={`/members/${encodeURIComponent(employeeNumber)}/edit`} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Personal</h2>
          <dl className="divide-y divide-slate-100">
            <Field label="Email" value={member.email_address} />
            <Field label="Contact number" value={member.contact_number} />
            <Field label="Birthdate" value={member.birthdate} />
            <Field label="Sex" value={member.sex} />
            <Field label="Civil Status" value={member.civil_status} />
            <Field label="Religion" value={member.religion} />
            <Field label="Sector" value={member.sector} />
            <Field label="IP Affiliation" value={member.ip_affiliation} />
            <Field label="Permanent Address" value={member.permanent_address} />
            <Field label="Current Address" value={member.current_address} />
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Employment</h2>
          <dl className="divide-y divide-slate-100">
            <Field label="Chapter Base" value={member.chapter_base} />
            <Field label="Division" value={member.division} />
            <Field label="Position" value={member.position} />
            <Field label="Status of Employment" value={member.status_of_employment} />
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Dependents</h2>
          <DependentsTable employeeNumber={employeeNumber} dependents={(dependents || []) as any} isAdmin={isAdmin} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Claimants</h2>
          <ol className="space-y-2 text-sm">
            {[1,2,3,4].map(slot => {
              const c: any = (claimants || []).find((x: any) => x.slot === slot);
              return (
                <li key={slot} className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-slate-400">B.{slot}</span>
                  <span className="font-medium">{c?.name || <span className="text-slate-300">—</span>}</span>
                  {c?.relationship && <span className="text-xs text-slate-500">({c.relationship})</span>}
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Emergency Contact & Consent</h2>
          <dl className="divide-y divide-slate-100">
            <Field label="Contact Name" value={member.emergency_contact_name} />
            <Field label="Contact Number" value={member.emergency_contact_number} />
            <Field label="Relationship" value={member.emergency_contact_relationship} />
            <Field label="Consent Signed" value={YN(member.consent_signed)} />
          </dl>
          {member.consent_text && <p className="mt-3 text-xs text-slate-500">{member.consent_text}</p>}
        </section>
      </div>
    </div>
  );
}
