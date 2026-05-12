"use client";

import { useState } from "react";

type Status = "Active" | "Deceased";

type Dependent = {
  slot: number;
  name?: string | null;
  relationship?: string | null;
  status?: string | null;
};

function normalize(s?: string | null): Status {
  return s && s.trim().toLowerCase() === "deceased" ? "Deceased" : "Active";
}

export default function DependentsTable({ employeeNumber, dependents, canEdit }: { employeeNumber: string; dependents: Dependent[]; canEdit: boolean }) {
  const initial: Record<number, Status> = {};
  for (const d of dependents) initial[d.slot] = normalize(d.status);
  const [statuses, setStatuses] = useState<Record<number, Status>>(initial);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);

  async function update(slot: number, next: Status) {
    const prev = statuses[slot] || "Active";
    setStatuses(s => ({ ...s, [slot]: next }));
    setSavingSlot(slot);
    try {
      const res = await fetch(
        `/api/members/${encodeURIComponent(employeeNumber)}/dependents/${slot}/status`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: next })
        }
      );
      if (!res.ok) setStatuses(s => ({ ...s, [slot]: prev }));
    } catch {
      setStatuses(s => ({ ...s, [slot]: prev }));
    } finally {
      setSavingSlot(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Relationship</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4].map((slot) => {
            const d = dependents.find((x) => x.slot === slot);
            const status: Status = statuses[slot] || "Active";
            const frozen = status === "Deceased";
            return (
              <tr key={slot} className={`border-t border-slate-100 ${frozen ? "opacity-60 grayscale" : ""}`}>
                <td className="px-3 py-2 font-mono text-xs">A.{slot}</td>
                <td className="px-3 py-2">{d?.name || <span className="text-slate-300">—</span>}</td>
                <td className="px-3 py-2">{d?.relationship || "—"}</td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <select
                      value={status}
                      onChange={(e) => update(slot, e.target.value as Status)}
                      disabled={!d?.name || savingSlot === slot}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="Active">Active</option>
                      <option value="Deceased">Deceased</option>
                    </select>
                  ) : (
                    <span>{d?.name ? status : "—"}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
