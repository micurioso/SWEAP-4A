"use client";

import Link from "next/link";
import { useState } from "react";
import DependentsTable from "./dependents-table";

type EmployeeStatus = "active" | "separated" | "deceased";

type Member = {
  employee_number: string;
  full_name: string;
  position?: string | null;
  division?: string | null;
  email_address?: string | null;
  contact_number?: string | null;
  birthdate?: string | null;
  sex?: string | null;
  civil_status?: string | null;
  religion?: string | null;
  sector?: string | null;
  ip_affiliation?: string | null;
  permanent_address?: string | null;
  current_address?: string | null;
  chapter_base?: string | null;
  status_of_employment?: string | null;
  employee_status?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_relationship?: string | null;
  consent_signed?: boolean | null;
  consent_text?: string | null;
};

type Dependent = { slot: number; name?: string | null; relationship?: string | null; status?: string | null };
type Claimant = { slot: number; name?: string | null; relationship?: string | null };

function Field({ label, value, right }: { label: string; value: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 flex items-center justify-between gap-3 text-slate-800">
        <span>{value || <span className="text-slate-300">—</span>}</span>
        {right}
      </dd>
    </div>
  );
}

function formatBirthdate(s?: string | null): { display: string; age: number | null } {
  if (!s) return { display: "", age: null };
  const d = new Date(s);
  if (isNaN(d.getTime())) return { display: s, age: null };
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const display = `${month} ${d.getDate()}, ${d.getFullYear()}`;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return { display, age };
}

export default function ProfileView({
  member,
  dependents,
  claimants,
  canEdit
}: {
  member: Member;
  dependents: Dependent[];
  claimants: Claimant[];
  canEdit: boolean;
}) {
  const initialStatus: EmployeeStatus =
    member.employee_status === "separated" || member.employee_status === "deceased"
      ? member.employee_status
      : "active";
  const [status, setStatus] = useState<EmployeeStatus>(initialStatus);
  const [saving, setSaving] = useState(false);

  async function update(next: EmployeeStatus) {
    const prev = status;
    setStatus(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(member.employee_number)}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employee_status: next })
      });
      if (!res.ok) setStatus(prev);
    } catch {
      setStatus(prev);
    } finally {
      setSaving(false);
    }
  }

  const frozen = status === "deceased";
  const bd = formatBirthdate(member.birthdate);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-slate-400">{member.employee_number}</div>
          <h1 className="text-2xl font-semibold text-slate-800">{member.full_name}</h1>
          <div className="mt-1 text-sm text-slate-500">
            {member.position} · {member.division}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/members" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
            Back
          </Link>
          {canEdit && !frozen && (
            <Link
              href={`/members/${encodeURIComponent(member.employee_number)}/edit`}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className={`grid gap-5 lg:grid-cols-2 ${frozen ? "pointer-events-none opacity-60 grayscale" : ""}`}>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Personal</h2>
          <dl className="divide-y divide-slate-100">
            <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
              <dt className="text-slate-500">Employee Status</dt>
              <dd className="col-span-2 text-slate-800">
                {canEdit ? (
                  <select
                    value={status}
                    disabled={saving}
                    onChange={(e) => update(e.target.value as EmployeeStatus)}
                    className="pointer-events-auto rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-60"
                  >
                    <option value="active">Active</option>
                    <option value="separated">Separated</option>
                    <option value="deceased">Deceased</option>
                  </select>
                ) : (
                  <span className="capitalize">{status}</span>
                )}
              </dd>
            </div>
            <Field label="Email" value={member.email_address} />
            <Field label="Contact number" value={member.contact_number} />
            <Field
              label="Birthdate"
              value={bd.display || <span className="text-slate-300">—</span>}
              right={bd.age !== null ? <span className="text-xs text-slate-500">Age: {bd.age}</span> : null}
            />
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
          <h3 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Emergency Contact</h3>
          <dl className="divide-y divide-slate-100">
            <Field label="Name" value={member.emergency_contact_name} />
            <Field label="Number" value={member.emergency_contact_number} />
            <Field label="Relationship" value={member.emergency_contact_relationship} />
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Dependents</h2>
          <DependentsTable employeeNumber={member.employee_number} dependents={dependents} canEdit={canEdit} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Claimants</h2>
          <ol className="space-y-2 text-sm">
            {[1, 2, 3, 4].map((slot) => {
              const c = claimants.find((x) => x.slot === slot);
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

      </div>
    </div>
  );
}
