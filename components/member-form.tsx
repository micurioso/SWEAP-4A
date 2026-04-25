"use client";
import { useState } from "react";
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

  function setField<K extends keyof MemberWithRelations>(k: K, v: MemberWithRelations[K]) {
    setM(prev => ({ ...prev, [k]: v }));
  }
  function setDep(slot: number, key: string, value: string) {
    setM(prev => {
      const others = prev.dependents.filter(d => d.slot !== slot);
      const cur = prev.dependents.find(d => d.slot === slot) || { slot };
      return { ...prev, dependents: [...others, { ...cur, [key]: value }].sort((a,b) => a.slot - b.slot) };
    });
  }
  function setCla(slot: number, key: string, value: string) {
    setM(prev => {
      const others = prev.claimants.filter(c => c.slot !== slot);
      const cur = prev.claimants.find(c => c.slot === slot) || { slot };
      return { ...prev, claimants: [...others, { ...cur, [key]: value }].sort((a,b) => a.slot - b.slot) };
    });
  }
  function depVal(slot: number, key: string) {
    return (m.dependents.find(d => d.slot === slot) as any)?.[key] || "";
  }
  function claVal(slot: number, key: string) {
    return (m.claimants.find(c => c.slot === slot) as any)?.[key] || "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { dependents, claimants, ...member } = m;
    // strip empty dependent/claimant slots
    const cleanDeps = dependents.filter(d => d.name && d.name.trim());
    const cleanClas = claimants.filter(c => c.name && c.name.trim());

    if (mode === "create") {
      const { error } = await supabase.from("sweap_members").insert(member);
      if (error) { setError(error.message); setSaving(false); return; }
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
            <input className={inputCls} value={m.employee_number} disabled={mode === "edit"} required
              onChange={e => setField("employee_number", e.target.value)} />
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
          <label className="text-sm md:col-span-2">Permanent Address
            <input className={inputCls} value={m.permanent_address || ""} onChange={e => setField("permanent_address", e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">Current Address
            <input className={inputCls} value={m.current_address || ""} onChange={e => setField("current_address", e.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Employment & Inlife</h2>
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
          <label className="text-sm flex items-center gap-2 mt-5">
            <input type="checkbox" checked={!!m.has_physical_inlife_card}
              onChange={e => setField("has_physical_inlife_card", e.target.checked)} />
            Has Physical Inlife Card
          </label>
          <label className="text-sm">Inlife ID Number
            <input className={inputCls} value={m.inlife_id_number || ""} onChange={e => setField("inlife_id_number", e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">No-card Reason
            <input className={inputCls} value={m.no_inlife_card_reason || ""} onChange={e => setField("no_inlife_card_reason", e.target.value)} />
          </label>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={!!m.claimed_burial_assistance}
              onChange={e => setField("claimed_burial_assistance", e.target.checked)} />
            Claimed Burial Assistance
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Dependents (up to 4)</h2>
        <div className="space-y-3">
          {[1,2,3,4].map(slot => (
            <div key={slot} className="grid gap-2 rounded-md border border-slate-100 p-3 md:grid-cols-6">
              <div className="col-span-6 text-xs font-mono text-slate-400">A.{slot}</div>
              <input className={inputCls} placeholder="Name" value={depVal(slot, "name")} onChange={e => setDep(slot, "name", e.target.value)} />
              <input className={inputCls} placeholder="Relationship" value={depVal(slot, "relationship")} onChange={e => setDep(slot, "relationship", e.target.value)} />
              <input className={inputCls} placeholder="Status" value={depVal(slot, "status")} onChange={e => setDep(slot, "status", e.target.value)} />
              <input className={inputCls} placeholder="Amount Claimed" value={depVal(slot, "amount_claimed")} onChange={e => setDep(slot, "amount_claimed", e.target.value)} />
              <input className={inputCls} placeholder="Voucher #" value={depVal(slot, "check_voucher_number")} onChange={e => setDep(slot, "check_voucher_number", e.target.value)} />
              <input className={inputCls} placeholder="Claimant" value={depVal(slot, "claimant_name")} onChange={e => setDep(slot, "claimant_name", e.target.value)} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Claimants (up to 4)</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {[1,2,3,4].map(slot => (
            <div key={slot} className="grid grid-cols-2 gap-2 rounded-md border border-slate-100 p-3">
              <div className="col-span-2 text-xs font-mono text-slate-400">B.{slot}</div>
              <input className={inputCls} placeholder="Name" value={claVal(slot, "name")} onChange={e => setCla(slot, "name", e.target.value)} />
              <input className={inputCls} placeholder="Relationship" value={claVal(slot, "relationship")} onChange={e => setCla(slot, "relationship", e.target.value)} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Emergency Contact & Consent</h2>
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
          <label className="text-sm flex items-center gap-2 md:col-span-3">
            <input type="checkbox" checked={!!m.consent_signed} onChange={e => setField("consent_signed", e.target.checked)} />
            Consent Notice signed
          </label>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? "Saving…" : mode === "create" ? "Create member" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
