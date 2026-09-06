"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Briefcase,
  Check,
  HeartHandshake,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  UserRound,
  Users,
  X
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import EmploymentStatusSelect from "@/components/employment-status-select";
import type { MemberWithRelations } from "@/lib/schemas";

const empty: MemberWithRelations = {
  employee_number: "",
  full_name: "",
  dependents: [],
  claimants: []
};

type Props = {
  initial?: MemberWithRelations;
  mode: "create" | "edit";
  cancelHref?: string;
};

type EmployeeStatus = "active" | "separated" | "deceased";

type NameParts = {
  lastName: string;
  firstName: string;
  middleName: string;
};

function splitMemberName(fullName: string): NameParts {
  const normalized = fullName.trim();
  if (!normalized) return { lastName: "", firstName: "", middleName: "" };

  if (normalized.includes(",")) {
    const [lastName, ...givenNameParts] = normalized.split(",");
    const givenNames = givenNameParts.join(",").trim().split(/\s+/).filter(Boolean);
    return {
      lastName: lastName.trim(),
      firstName: givenNames.shift() || "",
      middleName: givenNames.join(" ")
    };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { lastName: parts[0], firstName: "", middleName: "" };
  return {
    lastName: parts.pop() || "",
    firstName: parts.shift() || "",
    middleName: parts.join(" ")
  };
}

function combineMemberName({ lastName, firstName, middleName }: NameParts) {
  const familyName = lastName.trim();
  const givenNames = [firstName.trim(), middleName.trim()].filter(Boolean).join(" ");
  return familyName && givenNames ? `${familyName}, ${givenNames}` : familyName || givenNames;
}

const inputCls =
  "mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

function FormField({
  label,
  htmlFor,
  required,
  hint,
  className = "",
  children
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && <div className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</div>}
    </div>
  );
}

function FormSection({
  step,
  icon,
  title,
  description,
  children
}: {
  step: string;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-blue-300">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-800">{title}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {step}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function MemberForm({ initial, mode, cancelHref }: Props) {
  const router = useRouter();
  const [member, setMember] = useState<MemberWithRelations>(initial || empty);
  const initialName = splitMemberName((initial || empty).full_name);
  const [lastName, setLastName] = useState(initialName.lastName);
  const [firstName, setFirstName] = useState(initialName.firstName);
  const [middleName, setMiddleName] = useState(initialName.middleName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialClaimantCount = Math.max(
    1,
    (initial?.claimants || []).filter((claimant) => claimant.name && claimant.name.trim()).length
  );
  const [claimantCount, setClaimantCount] = useState<number>(initialClaimantCount);
  const initialDependentCount = Math.max(
    1,
    (initial?.dependents || []).filter((dependent) => dependent.name && dependent.name.trim()).length
  );
  const [dependentCount, setDependentCount] = useState<number>(initialDependentCount);
  const initialEmployeeStatus: EmployeeStatus =
    initial?.employee_status === "separated" || initial?.employee_status === "deceased"
      ? initial.employee_status
      : "active";
  const [employeeStatus, setEmployeeStatus] = useState<EmployeeStatus>(initialEmployeeStatus);
  const [employeeNumberTaken, setEmployeeNumberTaken] = useState(false);
  const [checkingEmployeeNumber, setCheckingEmployeeNumber] = useState(false);

  function setField<K extends keyof MemberWithRelations>(key: K, value: MemberWithRelations[K]) {
    setMember((previous) => ({ ...previous, [key]: value }));
  }

  function setDependent(slot: number, key: string, value: string) {
    setMember((previous) => {
      const others = previous.dependents.filter((dependent) => dependent.slot !== slot);
      const current = previous.dependents.find((dependent) => dependent.slot === slot) || { slot };
      return {
        ...previous,
        dependents: [...others, { ...current, [key]: value }].sort((a, b) => a.slot - b.slot)
      };
    });
  }

  function setClaimant(slot: number, key: string, value: string) {
    setMember((previous) => {
      const others = previous.claimants.filter((claimant) => claimant.slot !== slot);
      const current = previous.claimants.find((claimant) => claimant.slot === slot) || { slot };
      return {
        ...previous,
        claimants: [...others, { ...current, [key]: value }].sort((a, b) => a.slot - b.slot)
      };
    });
  }

  function removeDependent(slot: number) {
    setMember((previous) => {
      const remaining = previous.dependents
        .filter((dependent) => dependent.slot !== slot)
        .map((dependent) => (dependent.slot > slot ? { ...dependent, slot: dependent.slot - 1 } : dependent))
        .sort((a, b) => a.slot - b.slot);
      return { ...previous, dependents: remaining };
    });
    setDependentCount((count) => Math.max(1, count - 1));
  }

  function removeClaimant(slot: number) {
    setMember((previous) => {
      const remaining = previous.claimants
        .filter((claimant) => claimant.slot !== slot)
        .map((claimant) => (claimant.slot > slot ? { ...claimant, slot: claimant.slot - 1 } : claimant))
        .sort((a, b) => a.slot - b.slot);
      return { ...previous, claimants: remaining };
    });
    setClaimantCount((count) => Math.max(1, count - 1));
  }

  function dependentValue(slot: number, key: string) {
    return (member.dependents.find((dependent) => dependent.slot === slot) as any)?.[key] || "";
  }

  function claimantValue(slot: number, key: string) {
    return (member.claimants.find((claimant) => claimant.slot === slot) as any)?.[key] || "";
  }

  async function checkEmployeeNumber() {
    if (mode !== "create") return;
    const value = member.employee_number.trim();
    if (!value) {
      setEmployeeNumberTaken(false);
      return;
    }
    setCheckingEmployeeNumber(true);
    const { data } = await createClient()
      .from("sweap_members")
      .select("employee_number")
      .eq("employee_number", value)
      .maybeSingle();
    setEmployeeNumberTaken(Boolean(data));
    setCheckingEmployeeNumber(false);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = {
        ...member,
        full_name: combineMemberName({ lastName, firstName, middleName }),
        employee_status: employeeStatus
      };
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, data })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 409) setEmployeeNumberTaken(true);
        setError(result?.error ?? "Could not save the member record.");
        return;
      }
      router.push(`/members/${encodeURIComponent(member.employee_number)}`);
      router.refresh();
    } catch {
      setError("Could not connect to the server. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <FormSection
        step="Step 1"
        icon={<UserRound className="h-5 w-5" />}
        title="Personal information"
        description="Identity, contact details, and personal profile"
      >
        <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
          <FormField
            label="Employee number"
            htmlFor="employee-number"
            required
            hint={
              mode === "create" ? (
                <span className={employeeNumberTaken ? "text-red-600" : undefined}>
                  {checkingEmployeeNumber
                    ? "Checking availability…"
                    : employeeNumberTaken
                      ? "This employee number is already taken."
                      : "Must contain at least one digit and be unique."}
                </span>
              ) : (
                "The employee number cannot be changed after creation."
              )
            }
          >
            <input
              id="employee-number"
              className={`${inputCls} ${employeeNumberTaken ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              value={member.employee_number}
              disabled={mode === "edit"}
              required
              pattern=".*\d.*"
              title="Must contain at least one digit"
              onChange={(event) => {
                setField("employee_number", event.target.value);
                if (employeeNumberTaken) setEmployeeNumberTaken(false);
              }}
              onBlur={checkEmployeeNumber}
            />
          </FormField>

          <FormField label="Employee status" htmlFor="employee-status">
            <select id="employee-status" className={inputCls} value={employeeStatus} onChange={(event) => setEmployeeStatus(event.target.value as EmployeeStatus)}>
              <option value="active">Active</option>
              <option value="separated">Separated</option>
              <option value="deceased">Deceased</option>
            </select>
          </FormField>

          <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 md:col-span-2 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Last name" htmlFor="last-name" required>
              <input
                id="last-name"
                autoComplete="family-name"
                className={inputCls}
                value={lastName}
                required
                onChange={(event) => {
                  const value = event.target.value;
                  setLastName(value);
                  setField("full_name", combineMemberName({ lastName: value, firstName, middleName }));
                }}
              />
            </FormField>
            <FormField label="First name" htmlFor="first-name" required>
              <input
                id="first-name"
                autoComplete="given-name"
                className={inputCls}
                value={firstName}
                required
                onChange={(event) => {
                  const value = event.target.value;
                  setFirstName(value);
                  setField("full_name", combineMemberName({ lastName, firstName: value, middleName }));
                }}
              />
            </FormField>
            <FormField
              label="Middle name"
              htmlFor="middle-name"
              className="sm:col-span-2 lg:col-span-1"
            >
              <input
                id="middle-name"
                autoComplete="additional-name"
                className={inputCls}
                value={middleName}
                onChange={(event) => {
                  const value = event.target.value;
                  setMiddleName(value);
                  setField("full_name", combineMemberName({ lastName, firstName, middleName: value }));
                }}
              />
            </FormField>
          </div>

          <FormField label="Email address" htmlFor="email-address">
            <input id="email-address" type="email" className={inputCls} value={member.email_address || ""} onChange={(event) => setField("email_address", event.target.value)} />
          </FormField>
          <FormField label="Contact number" htmlFor="contact-number">
            <input id="contact-number" inputMode="tel" className={inputCls} value={member.contact_number || ""} onChange={(event) => setField("contact_number", event.target.value)} />
          </FormField>
          <FormField label="Birthdate" htmlFor="birthdate">
            <input id="birthdate" type="date" className={inputCls} value={member.birthdate || ""} onChange={(event) => setField("birthdate", event.target.value)} />
          </FormField>
          <FormField label="Sex" htmlFor="sex">
            <input id="sex" className={inputCls} value={member.sex || ""} onChange={(event) => setField("sex", event.target.value)} />
          </FormField>
          <FormField label="Civil status" htmlFor="civil-status">
            <input id="civil-status" className={inputCls} value={member.civil_status || ""} onChange={(event) => setField("civil_status", event.target.value)} />
          </FormField>
          <FormField label="Religion" htmlFor="religion">
            <input id="religion" className={inputCls} value={member.religion || ""} onChange={(event) => setField("religion", event.target.value)} />
          </FormField>
          <FormField label="Sector" htmlFor="sector">
            <input id="sector" className={inputCls} value={member.sector || ""} onChange={(event) => setField("sector", event.target.value)} />
          </FormField>
          <FormField label="IP affiliation" htmlFor="ip-affiliation">
            <input id="ip-affiliation" className={inputCls} value={member.ip_affiliation || ""} onChange={(event) => setField("ip_affiliation", event.target.value)} />
          </FormField>
          <FormField label="Permanent address" htmlFor="permanent-address" className="md:col-span-2">
            <textarea
              id="permanent-address"
              rows={2}
              className={`${inputCls} h-auto min-h-20 py-3`}
              value={member.permanent_address || ""}
              onChange={(event) => setField("permanent_address", event.target.value)}
            />
          </FormField>
          <FormField label="Current address" htmlFor="current-address" className="md:col-span-2">
            <textarea
              id="current-address"
              rows={2}
              className={`${inputCls} h-auto min-h-20 py-3`}
              value={member.current_address || ""}
              onChange={(event) => setField("current_address", event.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      <div className="grid gap-5 xl:grid-cols-3">
        <FormSection
          step="Step 2"
          icon={<Briefcase className="h-5 w-5" />}
          title="Employment"
          description="Current chapter and work assignment"
        >
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
            <FormField label="Chapter base" htmlFor="chapter-base">
              <input id="chapter-base" className={inputCls} value={member.chapter_base || ""} onChange={(event) => setField("chapter_base", event.target.value)} />
            </FormField>
            <FormField label="Division" htmlFor="division">
              <input id="division" className={inputCls} value={member.division || ""} onChange={(event) => setField("division", event.target.value)} />
            </FormField>
            <FormField label="Position" htmlFor="position">
              <input id="position" className={inputCls} value={member.position || ""} onChange={(event) => setField("position", event.target.value)} />
            </FormField>
            <FormField label="Employment status" htmlFor="employment-status">
              <EmploymentStatusSelect
                id="employment-status"
                className={inputCls}
                value={member.status_of_employment || ""}
                onChange={(event) => setField("status_of_employment", event.target.value)}
              />
            </FormField>
          </div>
        </FormSection>

        <div className="xl:col-span-2">
          <FormSection
            step="Step 3"
            icon={<HeartHandshake className="h-5 w-5" />}
            title="Emergency contact"
            description="Person to contact when urgent assistance is needed"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Contact name" htmlFor="emergency-contact-name" className="sm:col-span-2">
                <input id="emergency-contact-name" className={inputCls} value={member.emergency_contact_name || ""} onChange={(event) => setField("emergency_contact_name", event.target.value)} />
              </FormField>
              <FormField label="Contact number" htmlFor="emergency-contact-number">
                <input id="emergency-contact-number" inputMode="tel" className={inputCls} value={member.emergency_contact_number || ""} onChange={(event) => setField("emergency_contact_number", event.target.value)} />
              </FormField>
              <FormField label="Relationship" htmlFor="emergency-contact-relationship">
                <input id="emergency-contact-relationship" className={inputCls} value={member.emergency_contact_relationship || ""} onChange={(event) => setField("emergency_contact_relationship", event.target.value)} />
              </FormField>
            </div>
          </FormSection>
        </div>
      </div>

      <FormSection
        step="Step 4"
        icon={<Users className="h-5 w-5" />}
        title="Declared dependents"
        description="Add up to four eligible dependents"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: dependentCount }, (_, index) => index + 1).map((slot) => (
            <div key={slot} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-mono text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-blue-300">
                    A.{slot}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">Dependent {slot}</span>
                </div>
                {dependentCount > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDependent(slot)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-700"
                    aria-label={`Remove dependent A.${slot}`}
                    title="Remove dependent"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" htmlFor={`dependent-${slot}-name`} className="sm:col-span-2">
                  <input id={`dependent-${slot}-name`} className={inputCls} value={dependentValue(slot, "name")} onChange={(event) => setDependent(slot, "name", event.target.value)} />
                </FormField>
                <FormField label="Relationship" htmlFor={`dependent-${slot}-relationship`}>
                  <input id={`dependent-${slot}-relationship`} className={inputCls} value={dependentValue(slot, "relationship")} onChange={(event) => setDependent(slot, "relationship", event.target.value)} />
                </FormField>
                <FormField label="Status" htmlFor={`dependent-${slot}-status`}>
                  <select id={`dependent-${slot}-status`} className={inputCls} value={dependentValue(slot, "status") || "Active"} onChange={(event) => setDependent(slot, "status", event.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Deceased">Deceased</option>
                  </select>
                </FormField>
              </div>
            </div>
          ))}
        </div>
        {dependentCount < 4 && (
          <button
            type="button"
            onClick={() => setDependentCount((count) => Math.min(4, count + 1))}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add dependent
          </button>
        )}
      </FormSection>

      <FormSection
        step="Step 5"
        icon={<Check className="h-5 w-5" />}
        title="Declared claimants"
        description="Add up to four designated claimants"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: claimantCount }, (_, index) => index + 1).map((slot) => (
            <div key={slot} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-mono text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-blue-300">
                    B.{slot}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">Claimant {slot}</span>
                </div>
                {claimantCount > 1 && (
                  <button
                    type="button"
                    onClick={() => removeClaimant(slot)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-700"
                    aria-label={`Remove claimant B.${slot}`}
                    title="Remove claimant"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" htmlFor={`claimant-${slot}-name`}>
                  <input id={`claimant-${slot}-name`} className={inputCls} value={claimantValue(slot, "name")} onChange={(event) => setClaimant(slot, "name", event.target.value)} />
                </FormField>
                <FormField label="Relationship" htmlFor={`claimant-${slot}-relationship`}>
                  <input id={`claimant-${slot}-relationship`} className={inputCls} value={claimantValue(slot, "relationship")} onChange={(event) => setClaimant(slot, "relationship", event.target.value)} />
                </FormField>
              </div>
            </div>
          ))}
        </div>
        {claimantCount < 4 && (
          <button
            type="button"
            onClick={() => setClaimantCount((count) => Math.min(4, count + 1))}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add claimant
          </button>
        )}
      </FormSection>

      <div className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:bg-slate-900/95 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {mode === "edit" ? "Save to apply all profile changes." : "Complete the required fields to create this member."}
          </p>
          <div className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => router.push(cancelHref || "/members")}
              disabled={saving}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:flex-none"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (mode === "create" && employeeNumberTaken)}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : mode === "create" ? "Create member" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
