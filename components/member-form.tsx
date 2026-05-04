"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MemberWithRelations } from "@/lib/schemas";

const empty: MemberWithRelations = {
  employee_number: "",
  full_name: "",
  dependents: [],
  claimants: []
};

type Props = { initial?: MemberWithRelations; mode: "create" | "edit" };

export default function MemberForm({ initial, mode }: Props) {
  const router = useRouter();
  const [m, setM] = useState<MemberWithRelations>(initial || empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialClaimantCount = Math.max(
    1,
    (initial?.claimants || []).filter(c => c.name && c.name.trim()).length
  );
  const [claimantCount, setClaimantCount] = useState<number>(initialClaimantCount);
  const initialDependentCount = Math.max(
    1,
    (initial?.dependents || []).filter(d => d.name && d.name.trim()).length
  );
  const [dependentCount, setDependentCount] = useState<number>(initialDependentCount);
  const [employeeStatus, setEmployeeStatus] = useState<"active" | "separated" | "deceased">("active");
  const [empNoTaken, setEmpNoTaken] = useState(false);
  const [checkingEmpNo, setCheckingEmpNo] = useState(false);

  function setField<K extends keyof MemberWithRelations>(k: K, v: MemberWithRelations[K]) {
    setM(prev => ({ ...prev, [k]: v }));
  }
  function setDep(slot: number, key: string, value: string) {
    setM(prev => {
      const others = prev.dependents.filter(d => d.slot !== slot);
      const cur = prev.dependents.find(d => d.slot === slot) || { slot };
      return { ...prev, dependents: [...others, { ...cur, [key]: value }].sort((a,b) => a.slot - b.slot) };
    });
    if (key === "status" && mode === "edit" && m.employee_number) {
      try {
        const storageKey = `dependent-status:${m.employee_number}`;
        const raw = window.localStorage.getItem(storageKey);
        const map = raw ? JSON.parse(raw) : {};
        map[slot] = value === "Deceased" ? "deceased" : "active";
        window.localStorage.setItem(storageKey, JSON.stringify(map));
      } catch {}
    }
  }
  function setCla(slot: number, key: string, value: string) {
    setM(prev => {
      const others = prev.claimants.filter(c => c.slot !== slot);
      const cur = prev.claimants.find(c => c.slot === slot) || { slot };
      return { ...prev, claimants: [...others, { ...cur, [key]: value }].sort((a,b) => a.slot - b.slot) };
    });
  }
  function removeDep(slot: number) {
    setM(prev => {
      const remaining = prev.dependents
        .filter(d => d.slot !== slot)
        .map(d => (d.slot > slot ? { ...d, slot: d.slot - 1 } : d))
        .sort((a, b) => a.slot - b.slot);
      return { ...prev, dependents: remaining };
    });
    setDependentCount(c => Math.max(1, c - 1));
    if (mode === "edit" && m.employee_number) {
      try {
        const storageKey = `dependent-status:${m.employee_number}`;
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const map = JSON.parse(raw) as Record<string, "active" | "deceased">;
          const next: Record<string, "active" | "deceased"> = {};
          for (const [k, v] of Object.entries(map)) {
            const n = parseInt(k, 10);
            if (n === slot) continue;
            next[n > slot ? n - 1 : n] = v;
          }
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        }
      } catch {}
    }
  }
  function removeCla(slot: number) {
    setM(prev => {
      const remaining = prev.claimants
        .filter(c => c.slot !== slot)
        .map(c => (c.slot > slot ? { ...c, slot: c.slot - 1 } : c))
        .sort((a, b) => a.slot - b.slot);
      return { ...prev, claimants: remaining };
    });
    setClaimantCount(c => Math.max(1, c - 1));
  }
  function depVal(slot: number, key: string) {
    return (m.dependents.find(d => d.slot === slot) as any)?.[key] || "";
  }
  function claVal(slot: number, key: string) {
    return (m.claimants.find(c => c.slot === slot) as any)?.[key] || "";
  }

  useEffect(() => {
    if (mode !== "edit" || !m.employee_number) return;
    try {
      const raw = window.localStorage.getItem(`dependent-status:${m.employee_number}`);
      if (raw) {
        const map = JSON.parse(raw) as Record<string, "active" | "deceased">;
        setM(prev => ({
          ...prev,
          dependents: prev.dependents.map(d => {
            const v = map[d.slot];
            if (!v) return d;
            return { ...d, status: v === "deceased" ? "Deceased" : "Active" };
          })
        }));
      }
      const es = window.localStorage.getItem(`employee-status:${m.employee_number}`);
      if (es === "active" || es === "separated" || es === "deceased") setEmployeeStatus(es);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkEmployeeNumber() {
    if (mode !== "create") return;
    const v = m.employee_number.trim();
    if (!v) { setEmpNoTaken(false); return; }
    setCheckingEmpNo(true);
    const { data } = await createClient()
      .from("sweap_members")
      .select("employee_number")
      .eq("employee_number", v)
      .maybeSingle();
    setEmpNoTaken(!!data);
    setCheckingEmpNo(false);
  }

  function updateEmployeeStatus(next: "active" | "separated" | "deceased") {
    setEmployeeStatus(next);
    if (!m.employee_number) return;
    try {
      window.localStorage.setItem(`employee-status:${m.employee_number}`, next);
    } catch {}
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { dependents, claimants, ...member } = m;
    const cleanDeps = dependents.filter(d => d.name && d.name.trim());
    const cleanClas = claimants.filter(c => c.name && c.name.trim());

    if (mode === "create") {
      const { data: existing } = await supabase
        .from("sweap_members")
        .select("employee_number")
        .eq("employee_number", member.employee_number)
        .maybeSingle();
      if (existing) {
        setEmpNoTaken(true);
        setError(`Employee number "${member.employee_number}" already exists.`);
        setSaving(false);
        return;
      }
      const { error } = await supabase.from("sweap_members").insert(member);
      if (error) {
        const friendly = (error as any).code === "23505"
          ? `Employee number "${member.employee_number}" already exists.`
          : error.message;
        setError(friendly);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("sweap_members").update(member).eq("employee_number", member.employee_number);
      if (error) { setError(error.message); setSaving(false); return; }
    }
    await supabase.from("member_dependents").delete().eq("employee_number", member.employee_number);
    await supabase.from("member_claimants").delete().eq("employee_number", member.employee_number);
    if (cleanDeps.length) {
      await supabase.from("member_dependents").insert(cleanDeps.map(d => ({ ...d, employee_number: member.employee_number })));
    }
    if (cleanClas.length) {
      await supabase.from("member_claimants").insert(cleanClas.map(c => ({ ...c, employee_number: member.employee_number })));
    }
    setSaving(false);
    router.push(`/members/${encodeURIComponent(member.employee_number)}`);
    router.refresh();
  }

  const inputCls = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Personal</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">Employee Number *
            <input
              className={`${inputCls} ${empNoTaken ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}`}
              value={m.employee_number}
              disabled={mode === "edit"}
              required
              pattern=".*\d.*"
              title="Must contain at least one digit"
              onChange={e => { setField("employee_number", e.target.value); if (empNoTaken) setEmpNoTaken(false); }}
              onBlur={checkEmployeeNumber}
            />
            {mode === "create" && (
              <span className={`mt-1 block text-xs ${empNoTaken ? "text-red-600" : "text-slate-400"}`}>
                {checkingEmpNo ? "Checking…" : empNoTaken ? "This employee number is already taken." : "Must contain at least one digit · must be unique."}
              </span>
            )}
          </label>
          <label className="text-sm">Full Name *
            <input className={inputCls} value={m.full_name} required onChange={e => setField("full_name", e.target.value)} />
          </label>
          <label className="text-sm">Email
            <input className={inputCls} value={m.email_address || ""} onChange={e => setField("email_address", e.target.value)} />
          </label>
          <label className="text-sm">Contact Number
            <input className={inputCls} value={m.contact_number || ""} onChange={e => setField("contact_number", e.target.value)} />
          </label>
          <label className="text-sm">Birthdate
            <input type="date" className={inputCls} value={m.birthdate || ""} onChange={e => setField("birthdate", e.target.value)} />
          </label>
          <label className="text-sm">Sex
            <input className={inputCls} value={m.sex || ""} onChange={e => setField("sex", e.target.value)} />
          </label>
          <label className="text-sm">Civil Status
            <input className={inputCls} value={m.civil_status || ""} onChange={e => setField("civil_status", e.target.value)} />
          </label>
          <label className="text-sm">Religion
            <input className={inputCls} value={m.religion || ""} onChange={e => setField("religion", e.target.value)} />
          </label>
          <label className="text-sm">Sector
            <input className={inputCls} value={m.sector || ""} onChange={e => setField("sector", e.target.value)} />
          </label>
          <label className="text-sm">IP Affiliation
            <input className={inputCls} value={m.ip_affiliation || ""} onChange={e => setField("ip_affiliation", e.target.value)} />
          </label>
          <label className="text-sm">Employee Status
            <select className={inputCls} value={employeeStatus} onChange={e => updateEmployeeStatus(e.target.value as "active" | "separated" | "deceased")}>
              <option value="active">Active</option>
              <option value="separated">Separated</option>
              <option value="deceased">Deceased</option>
            </select>
          </label>
          <label className="text-sm md:col-span-2">Permanent Address
            <input className={inputCls} value={m.permanent_address || ""} onChange={e => setField("permanent_address", e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">Current Address
            <input className={inputCls} value={m.current_address || ""} onChange={e => setField("current_address", e.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Employment</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">Chapter Base
            <input className={inputCls} value={m.chapter_base || ""} onChange={e => setField("chapter_base", e.target.value)} />
          </label>
          <label className="text-sm">Division
            <input className={inputCls} value={m.division || ""} onChange={e => setField("division", e.target.value)} />
          </label>
          <label className="text-sm">Position
            <input className={inputCls} value={m.position || ""} onChange={e => setField("position", e.target.value)} />
          </label>
          <label className="text-sm">Status of Employment
            <input className={inputCls} value={m.status_of_employment || ""} onChange={e => setField("status_of_employment", e.target.value)} />
          </label>
        </div>
        <h3 className="mb-3 mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Emergency Contact</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">Name
            <input className={inputCls} value={m.emergency_contact_name || ""} onChange={e => setField("emergency_contact_name", e.target.value)} />
          </label>
          <label className="text-sm">Number
            <input className={inputCls} value={m.emergency_contact_number || ""} onChange={e => setField("emergency_contact_number", e.target.value)} />
          </label>
          <label className="text-sm">Relationship
            <input className={inputCls} value={m.emergency_contact_relationship || ""} onChange={e => setField("emergency_contact_relationship", e.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Dependents (up to 4)</h2>
        <div className="space-y-3">
          {Array.from({ length: dependentCount }, (_, i) => i + 1).map(slot => (
            <div key={slot} className="rounded-md border border-slate-100 p-3">
              <div className="text-xs font-mono text-slate-400 mb-2">A.{slot}</div>
              <div className="flex flex-wrap items-center gap-2">
                <input className={`${inputCls} flex-1 min-w-[140px]`} placeholder="Name" value={depVal(slot, "name")} onChange={e => setDep(slot, "name", e.target.value)} />
                <input className={`${inputCls} flex-1 min-w-[140px]`} placeholder="Relationship" value={depVal(slot, "relationship")} onChange={e => setDep(slot, "relationship", e.target.value)} />
                <select className={`${inputCls} flex-1 min-w-[140px]`} value={depVal(slot, "status") || "Active"} onChange={e => setDep(slot, "status", e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Deceased">Deceased</option>
                </select>
                {dependentCount > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDep(slot)}
                    className="ml-auto rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {dependentCount < 4 && (
          <button
            type="button"
            onClick={() => setDependentCount(c => Math.min(4, c + 1))}
            className="mt-3 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            + Add dependent
          </button>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Claimants (up to 4)</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: claimantCount }, (_, i) => i + 1).map(slot => (
            <div key={slot} className="rounded-md border border-slate-100 p-3">
              <div className="text-xs font-mono text-slate-400 mb-2">B.{slot}</div>
              <div className="flex flex-wrap items-center gap-2">
                <input className={`${inputCls} flex-1 min-w-[140px]`} placeholder="Name" value={claVal(slot, "name")} onChange={e => setCla(slot, "name", e.target.value)} />
                <input className={`${inputCls} flex-1 min-w-[140px]`} placeholder="Relationship" value={claVal(slot, "relationship")} onChange={e => setCla(slot, "relationship", e.target.value)} />
                {claimantCount > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCla(slot)}
                    className="ml-auto rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {claimantCount < 4 && (
          <button
            type="button"
            onClick={() => setClaimantCount(c => Math.min(4, c + 1))}
            className="mt-3 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            + Add claimant
          </button>
        )}
      </section>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">Cancel</button>
        <button type="submit" disabled={saving || (mode === "create" && empNoTaken)} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? "Saving…" : mode === "create" ? "Create member" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
