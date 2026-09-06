"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EmploymentStatusSelect from "@/components/employment-status-select";

const CONSENT_TEXT =
  "I hereby consent to the collection and use of my personal information by DSWD FO IV-A SWEAP CALABARZON for purposes related to member benefits, burial assistance, and other lawful SWEAP activities, in accordance with the Data Privacy Act of 2012 (RA 10173).";

const SEX_OPTIONS = ["Male", "Female", "Prefer not to say"] as const;

const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Cohabiting", "Separated", "Widowed"] as const;

const SECTOR_OPTIONS = [
  "None",
  "Senior Citizen",
  "Solo Parent",
  "Persons with Disability",
  "LGBTQIA+",
  "Indigenous People"
] as const;

const CHAPTER_OPTIONS = [
  "Field Office (RPMO)",
  "Cavite",
  "Laguna",
  "Batangas",
  "Rizal",
  "Quezon",
  "Bahay Tuluyan ng mga Bata",
  "Regional Haven for womens and girls",
  "Haven for the Elderly",
  "National Training School for Boys"
] as const;

const DIVISION_OPTIONS = [
  "Administrative Division",
  "Disaster Response Management Division",
  "Financial Management Division",
  "Human Resource Management and Development Division",
  "Office of the Regional Director",
  "Pantawid Pamilyang Pilipino Program",
  "Policy and Plans Division",
  "Promotive Services Division",
  "Protective Services Division"
] as const;

type Dependent = {
  slot: number;
  name?: string;
  relationship?: string;
};

type Claimant = {
  slot: number;
  name?: string;
  relationship?: string;
};

type FormState = {
  employee_number: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  email_address: string;
  current_address: string;
  permanent_address: string;
  contact_number: string;
  birthdate: string;
  sex: string;
  civil_status: string;
  religion: string;
  sector: string;
  ip_affiliation: string;
  chapter_base: string;
  division: string;
  position: string;
  status_of_employment: string;
  has_physical_hmo_card: "" | "yes" | "no";
  hmo_name: string;
  hmo_policy_number: string;
  claimed_burial_assistance: "" | "yes" | "no";
  emergency_contact_name: string;
  emergency_contact_number: string;
  emergency_contact_relationship: string;
  consent_signed: boolean;
};

const empty: FormState = {
  employee_number: "",
  last_name: "",
  first_name: "",
  middle_name: "",
  email_address: "",
  current_address: "",
  permanent_address: "",
  contact_number: "",
  birthdate: "",
  sex: "",
  civil_status: "",
  religion: "",
  sector: "",
  ip_affiliation: "",
  chapter_base: "",
  division: "",
  position: "",
  status_of_employment: "",
  has_physical_hmo_card: "",
  hmo_name: "",
  hmo_policy_number: "",
  claimed_burial_assistance: "",
  emergency_contact_name: "",
  emergency_contact_number: "",
  emergency_contact_relationship: "",
  consent_signed: false
};

export default function RegistrationForm() {
  const [f, setF] = useState<FormState>(empty);
  const [dependents, setDependents] = useState<Dependent[]>([{ slot: 1 }]);
  const [claimants, setClaimants] = useState<Claimant[]>([{ slot: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [empNoTaken, setEmpNoTaken] = useState(false);
  const [checkingEmpNo, setCheckingEmpNo] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const restoreDarkMode = root.classList.contains("dark");
    root.classList.remove("dark");

    return () => {
      root.classList.toggle("dark", restoreDarkMode);
    };
  }, []);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setF(prev => ({ ...prev, [k]: v }));
  }

  function fullName() {
    const lastName = f.last_name.trim();
    const givenNames = [f.first_name.trim(), f.middle_name.trim()].filter(Boolean).join(" ");
    return lastName && givenNames ? `${lastName}, ${givenNames}` : lastName || givenNames;
  }

  async function checkEmployeeNumber() {
    const v = f.employee_number.trim();
    if (!v || !/\d/.test(v)) { setEmpNoTaken(false); return; }
    setCheckingEmpNo(true);
    try {
      const res = await fetch(`/api/register/check?empNo=${encodeURIComponent(v)}`);
      const json = await res.json().catch(() => ({}));
      setEmpNoTaken(!!json.taken);
    } catch {
      setEmpNoTaken(false);
    } finally {
      setCheckingEmpNo(false);
    }
  }

  function setDep(slot: number, key: keyof Dependent, value: string) {
    setDependents(prev => prev.map(d => (d.slot === slot ? { ...d, [key]: value } : d)));
  }
  function addDep() {
    setDependents(prev => (prev.length >= 4 ? prev : [...prev, { slot: prev.length + 1 }]));
  }
  function removeDep(slot: number) {
    setDependents(prev =>
      prev.filter(d => d.slot !== slot).map((d, i) => ({ ...d, slot: i + 1 }))
    );
  }
  function setCla(slot: number, key: keyof Claimant, value: string) {
    setClaimants(prev => prev.map(c => (c.slot === slot ? { ...c, [key]: value } : c)));
  }
  function addCla() {
    setClaimants(prev => (prev.length >= 4 ? prev : [...prev, { slot: prev.length + 1 }]));
  }
  function removeCla(slot: number) {
    setClaimants(prev =>
      prev.filter(c => c.slot !== slot).map((c, i) => ({ ...c, slot: i + 1 }))
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!f.consent_signed) {
      setError("You must agree to the consent notice to register.");
      return;
    }
    if (empNoTaken) {
      setError(`Employee ID number "${f.employee_number.trim()}" is already registered.`);
      return;
    }
    setSubmitting(true);

    const payload = {
      employee_number: f.employee_number.trim(),
      full_name: fullName(),
      email_address: f.email_address.trim(),
      current_address: f.current_address.trim(),
      permanent_address: f.permanent_address.trim() || null,
      contact_number: f.contact_number.trim(),
      birthdate: f.birthdate,
      sex: f.sex,
      civil_status: f.civil_status,
      religion: f.religion.trim(),
      sector: f.sector,
      ip_affiliation: f.ip_affiliation.trim(),
      chapter_base: f.chapter_base,
      division: f.division,
      position: f.position.trim(),
      status_of_employment: f.status_of_employment,
      has_physical_inlife_card:
        f.has_physical_hmo_card === "yes"
          ? true
          : f.has_physical_hmo_card === "no"
          ? false
          : null,
      hmo_name: f.hmo_name.trim() || null,
      inlife_id_number: f.hmo_policy_number.trim() || null,
      claimed_burial_assistance:
        f.claimed_burial_assistance === "yes"
          ? true
          : f.claimed_burial_assistance === "no"
          ? false
          : null,
      emergency_contact_name: f.emergency_contact_name.trim(),
      emergency_contact_number: f.emergency_contact_number.trim(),
      emergency_contact_relationship: f.emergency_contact_relationship.trim(),
      consent_signed: true,
      consent_text: CONSENT_TEXT,
      dependents: dependents
        .filter(d => d.name && d.name.trim())
        .map(d => ({
          slot: d.slot,
          name: d.name!.trim(),
          relationship: d.relationship?.trim() || null,
          status: "Active"
        })),
      claimants: claimants
        .filter(c => c.name && c.name.trim())
        .map(c => ({
          slot: c.slot,
          name: c.name!.trim(),
          relationship: c.relationship?.trim() || null
        }))
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error || "Registration failed. Please try again.");
      return;
    }
    setDone(payload.employee_number);
  }

  const input =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-4 sm:py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sweap-logo.png" alt="SWEAP CALABARZON" className="mx-auto mb-4 h-16 w-16 rounded-full object-contain" />
          <h1 className="text-center text-2xl font-bold text-emerald-700">Registration submitted</h1>
          <p className="mt-3 text-sm text-slate-700">
            Thank you. Your registration has been received under Employee ID number{" "}
            <span className="font-mono font-semibold">{done}</span>. SWEAP administrators
            will review your record. You may close this tab.
          </p>
          <Link href="/login" className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Go to sign in
          </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-4 flex items-center gap-2.5 sm:mb-6 sm:justify-center sm:gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sweap-logo.png" alt="SWEAP CALABARZON" className="h-12 w-12 shrink-0 rounded-full object-contain sm:h-20 sm:w-20" />
          <div className="min-w-0 flex-1 sm:flex-none">
            <h1 className="text-lg font-bold leading-tight text-brand-700 sm:text-2xl">SWEAP CALABARZON Member Registration</h1>
            <p className="mt-0.5 text-xs leading-5 text-slate-500 sm:mt-1 sm:text-sm">DSWD FO IV-A · Fields marked with <span className="text-red-500">*</span> are required.</p>
          </div>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
          {error && (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Personal</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm md:col-span-2">Employee ID number (ARTA ID number) <span className="text-red-500">*</span>
                <input
                  className={`${input} ${empNoTaken ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}`}
                  required pattern=".*\d.*" title="Must contain at least one digit"
                  value={f.employee_number}
                  onChange={e => { set("employee_number", e.target.value); if (empNoTaken) setEmpNoTaken(false); }}
                  onBlur={checkEmployeeNumber}
                />
                {(checkingEmpNo || empNoTaken) && (
                  <span className={`mt-1 block text-xs ${empNoTaken ? "text-red-600" : "text-slate-400"}`}>
                    {checkingEmpNo ? "Checking…" : "This employee number is already registered."}
                  </span>
                )}
              </label>
              <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
                <label className="text-sm">Last Name <span className="text-red-500">*</span>
                  <input autoComplete="family-name" required className={input} value={f.last_name} onChange={e => set("last_name", e.target.value)} />
                </label>
                <label className="text-sm">First Name <span className="text-red-500">*</span>
                  <input autoComplete="given-name" required className={input} value={f.first_name} onChange={e => set("first_name", e.target.value)} />
                </label>
                <label className="text-sm">Middle Name
                  <input autoComplete="additional-name" className={input} value={f.middle_name} onChange={e => set("middle_name", e.target.value)} />
                </label>
              </div>
              <label className="text-sm md:col-span-2">Email address <span className="text-red-500">*</span>
                <input type="email" autoComplete="email" required className={input} value={f.email_address} onChange={e => set("email_address", e.target.value)} />
              </label>
              <label className="text-sm md:col-span-2">Current Address <span className="text-red-500">*</span>
                <input required className={input} value={f.current_address} onChange={e => set("current_address", e.target.value)} />
              </label>
              <label className="text-sm md:col-span-2">Permanent Address
                <input className={input} value={f.permanent_address} onChange={e => set("permanent_address", e.target.value)} />
              </label>
              <label className="text-sm">Contact Number <span className="text-red-500">*</span>
                <input required className={input} value={f.contact_number} onChange={e => set("contact_number", e.target.value)} />
              </label>
              <label className="text-sm">Birthdate <span className="text-red-500">*</span>
                <input type="date" required className={input} value={f.birthdate} onChange={e => set("birthdate", e.target.value)} />
              </label>
              <label className="text-sm">Sex <span className="text-red-500">*</span>
                <select required className={input} value={f.sex} onChange={e => set("sex", e.target.value)}>
                  <option value="">—</option>
                  {SEX_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="text-sm">Civil Status <span className="text-red-500">*</span>
                <select required className={input} value={f.civil_status} onChange={e => set("civil_status", e.target.value)}>
                  <option value="">—</option>
                  {CIVIL_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="text-sm">Religion <span className="text-red-500">*</span>
                <input required className={input} value={f.religion} onChange={e => set("religion", e.target.value)} />
              </label>
              <label className="text-sm">Sector <span className="text-red-500">*</span>
                <select required className={input} value={f.sector} onChange={e => set("sector", e.target.value)}>
                  <option value="">—</option>
                  {SECTOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="text-sm md:col-span-2">IP Affiliation
                <input className={input} value={f.ip_affiliation} onChange={e => set("ip_affiliation", e.target.value)} />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Employment</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">Chapter Base <span className="text-red-500">*</span>
                <select required className={input} value={f.chapter_base} onChange={e => set("chapter_base", e.target.value)}>
                  <option value="">—</option>
                  {CHAPTER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="text-sm">Division <span className="text-red-500">*</span>
                <select required className={input} value={f.division} onChange={e => set("division", e.target.value)}>
                  <option value="">—</option>
                  {DIVISION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="text-sm md:col-span-2">Position (Please do not abbreviate) <span className="text-red-500">*</span>
                <input required className={input} value={f.position} onChange={e => set("position", e.target.value)} />
              </label>
              <label className="text-sm md:col-span-2">Employment Status <span className="text-red-500">*</span>
                <EmploymentStatusSelect
                  required
                  className={input}
                  value={f.status_of_employment}
                  onChange={e => set("status_of_employment", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">HMO & Burial Assistance</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">With Physical HMO card <span className="text-red-500">*</span>
                <select required className={input} value={f.has_physical_hmo_card} onChange={e => set("has_physical_hmo_card", e.target.value as FormState["has_physical_hmo_card"])}>
                  <option value="">—</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="text-sm">Have you claimed burial assistance from previous years? <span className="text-red-500">*</span>
                <select required className={input} value={f.claimed_burial_assistance} onChange={e => set("claimed_burial_assistance", e.target.value as FormState["claimed_burial_assistance"])}>
                  <option value="">—</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="text-sm">Name of HMO (N/A if no HMO) <span className="text-red-500">*</span>
                <input required className={input} value={f.hmo_name} onChange={e => set("hmo_name", e.target.value)} />
              </label>
              <label className="text-sm">Policy / Card number of HMO <span className="text-red-500">*</span>
                <input required className={input} value={f.hmo_policy_number} onChange={e => set("hmo_policy_number", e.target.value)} />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Dependents (up to 4)</h2>
                <p className="mt-0.5 text-xs text-slate-400">New dependents are automatically registered as active.</p>
              </div>
              {dependents.length < 4 && (
                <button type="button" onClick={addDep} className="text-xs font-medium text-brand-600 hover:text-brand-700">+ Add dependent</button>
              )}
            </div>
            <div className="space-y-3">
              {dependents.map(d => (
                <div key={d.slot} className="rounded-md border border-slate-100 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">A.{d.slot}</span>
                    {dependents.length > 1 && (
                      <button type="button" onClick={() => removeDep(d.slot)} className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">Remove</button>
                    )}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input className={input} placeholder="Name" value={d.name || ""} onChange={e => setDep(d.slot, "name", e.target.value)} />
                    <input className={input} placeholder="Relationship" value={d.relationship || ""} onChange={e => setDep(d.slot, "relationship", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Claimants (up to 4)</h2>
              {claimants.length < 4 && (
                <button type="button" onClick={addCla} className="text-xs font-medium text-brand-600 hover:text-brand-700">+ Add claimant</button>
              )}
            </div>
            <div className="space-y-3">
              {claimants.map(c => (
                <div key={c.slot} className="rounded-md border border-slate-100 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">B.{c.slot}</span>
                    {claimants.length > 1 && (
                      <button type="button" onClick={() => removeCla(c.slot)} className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">Remove</button>
                    )}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input className={input} placeholder="Name" value={c.name || ""} onChange={e => setCla(c.slot, "name", e.target.value)} />
                    <input className={input} placeholder="Relationship" value={c.relationship || ""} onChange={e => setCla(c.slot, "relationship", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">In case of Emergency (contact persons)</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm">Name of Contact Person <span className="text-red-500">*</span>
                <input required className={input} value={f.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} />
              </label>
              <label className="text-sm">Contact Number <span className="text-red-500">*</span>
                <input required className={input} value={f.emergency_contact_number} onChange={e => set("emergency_contact_number", e.target.value)} />
              </label>
              <label className="text-sm">Relationship to staff <span className="text-red-500">*</span>
                <input required className={input} value={f.emergency_contact_relationship} onChange={e => set("emergency_contact_relationship", e.target.value)} />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Consent</h2>
            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{CONSENT_TEXT}</p>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox" required
                checked={f.consent_signed}
                onChange={e => set("consent_signed", e.target.checked)}
                className="mt-0.5"
              />
              <span>I have read and agree to the consent notice above. <span className="text-red-500">*</span></span>
            </label>
          </section>

          <div className="flex justify-end gap-3">
            <Link href="/login" className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || empNoTaken || checkingEmpNo}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit registration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
