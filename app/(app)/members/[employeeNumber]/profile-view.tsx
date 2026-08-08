"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  Users
} from "lucide-react";
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

const statusStyles: Record<EmployeeStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70",
  separated: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70",
  deceased: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70"
};

function displayValue(value?: string | null) {
  return value?.trim() || null;
}

function initials(name: string) {
  const parts = name
    .replace(",", " ")
    .split(/\s+/)
    .filter(Boolean);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase() || "M";
}

function DetailCard({
  icon,
  label,
  value,
  className = ""
}: {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
  className?: string;
}) {
  const hasValue = value !== null && value !== undefined && value !== "";
  return (
    <div className={`min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 p-4 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <span className="text-brand-600 dark:text-blue-400">{icon}</span>
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium leading-6 text-slate-800">
        {hasValue ? value : <span className="font-normal text-slate-400">Not provided</span>}
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
  className = ""
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-blue-300">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
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
  const activeDependents = dependents.filter((dependent) => displayValue(dependent.name)).length;
  const activeClaimants = claimants.filter((claimant) => displayValue(claimant.name)).length;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-sky-50 p-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-100/60 blur-3xl dark:bg-blue-900/20" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-semibold text-white shadow-lg shadow-brand-600/20">
              {initials(member.full_name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-brand-200 bg-white/80 px-2.5 py-1 font-mono text-xs font-medium text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-300">
                  {member.employee_number}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {status}
                </span>
              </div>
              <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {member.full_name}
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  {displayValue(member.position) || "Position not provided"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {displayValue(member.division) || "Division not provided"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end xl:justify-end">
            <div>
              <label htmlFor="employee-status" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Employee status
              </label>
              {canEdit ? (
                <div className="relative">
                  <select
                    id="employee-status"
                    value={status}
                    disabled={saving}
                    onChange={(event) => update(event.target.value as EmployeeStatus)}
                    className="h-10 min-w-36 rounded-lg border border-slate-300 bg-white px-3 pr-9 text-sm font-medium capitalize text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-wait disabled:opacity-60"
                  >
                    <option value="active">Active</option>
                    <option value="separated">Separated</option>
                    <option value="deceased">Deceased</option>
                  </select>
                  {saving && <Clock3 className="absolute right-8 top-3 h-4 w-4 animate-spin text-slate-400" />}
                </div>
              ) : (
                <div className={`flex h-10 items-center rounded-lg border px-3 text-sm font-semibold capitalize ${statusStyles[status]}`}>
                  {status}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href="/members"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              {canEdit && !frozen && (
                <Link
                  href={`/members/${encodeURIComponent(member.employee_number)}/edit`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  <Pencil className="h-4 w-4" />
                  Edit profile
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-brand-100 pt-5 dark:border-slate-700 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Chapter</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800">{displayValue(member.chapter_base) || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Employment</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800">{displayValue(member.status_of_employment) || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Dependents</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{activeDependents} declared</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Claimants</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{activeClaimants} declared</p>
          </div>
        </div>
      </section>

      {frozen && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>This record is marked as deceased. Editing and dependent status changes are disabled.</p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard
          icon={<UserRound className="h-5 w-5" />}
          title="Personal information"
          description="Contact details and personal profile"
          className="xl:col-span-2"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard icon={<Mail className="h-4 w-4" />} label="Email address" value={displayValue(member.email_address)} />
            <DetailCard icon={<Phone className="h-4 w-4" />} label="Contact number" value={displayValue(member.contact_number)} />
            <DetailCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Birthdate"
              value={bd.display ? `${bd.display}${bd.age !== null ? ` · ${bd.age} years old` : ""}` : null}
            />
            <DetailCard icon={<UserRound className="h-4 w-4" />} label="Sex" value={displayValue(member.sex)} />
            <DetailCard icon={<HeartHandshake className="h-4 w-4" />} label="Civil status" value={displayValue(member.civil_status)} />
            <DetailCard icon={<ShieldCheck className="h-4 w-4" />} label="Religion" value={displayValue(member.religion)} />
            <DetailCard icon={<Users className="h-4 w-4" />} label="Sector" value={displayValue(member.sector)} />
            <DetailCard icon={<Users className="h-4 w-4" />} label="IP affiliation" value={displayValue(member.ip_affiliation)} />
            <DetailCard icon={<MapPin className="h-4 w-4" />} label="Permanent address" value={displayValue(member.permanent_address)} className="sm:col-span-2" />
            <DetailCard icon={<MapPin className="h-4 w-4" />} label="Current address" value={displayValue(member.current_address)} className="sm:col-span-2" />
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard icon={<Briefcase className="h-5 w-5" />} title="Employment" description="Current work assignment">
            <dl className="space-y-4">
              {[
                ["Chapter base", member.chapter_base],
                ["Division", member.division],
                ["Position", member.position],
                ["Employment status", member.status_of_employment]
              ].map(([label, value]) => (
                <div key={label} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-semibold leading-6 text-slate-800">
                    {displayValue(value) || <span className="font-normal text-slate-400">Not provided</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard icon={<Phone className="h-5 w-5" />} title="Emergency contact" description="Person to contact when needed">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="font-semibold text-slate-800">{displayValue(member.emergency_contact_name) || "Not provided"}</p>
              <p className="mt-1 text-sm text-slate-500">{displayValue(member.emergency_contact_relationship) || "Relationship not provided"}</p>
              {displayValue(member.emergency_contact_number) && (
                <a
                  href={`tel:${member.emergency_contact_number}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-blue-300"
                >
                  <Phone className="h-4 w-4" />
                  {member.emergency_contact_number}
                </a>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        icon={<Users className="h-5 w-5" />}
        title="Declared dependents"
        description={`${activeDependents} of 4 dependent slots completed`}
      >
        <DependentsTable employeeNumber={member.employee_number} dependents={dependents} canEdit={canEdit && !frozen} />
      </SectionCard>

      <SectionCard
        icon={<CheckCircle2 className="h-5 w-5" />}
        title="Declared claimants"
        description={`${activeClaimants} of 4 claimant slots completed`}
      >
        <ol className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((slot) => {
            const claimant = claimants.find((item) => item.slot === slot);
            const name = displayValue(claimant?.name);
            return (
              <li
                key={slot}
                className={`flex min-w-0 items-start gap-3 rounded-xl border p-4 ${
                  name ? "border-slate-200 bg-slate-50/50" : "border-dashed border-slate-200 bg-slate-50/30"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white font-mono text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-blue-300">
                  B.{slot}
                </span>
                <div className="min-w-0">
                  <p className={`break-words text-sm font-semibold ${name ? "text-slate-800" : "text-slate-400"}`}>
                    {name || "No claimant declared"}
                  </p>
                  {displayValue(claimant?.relationship) && (
                    <p className="mt-1 break-words text-xs leading-5 text-slate-500">{claimant?.relationship}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </SectionCard>
    </div>
  );
}
