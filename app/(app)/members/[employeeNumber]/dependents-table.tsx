"use client";

import { useEffect, useState } from "react";

type Status = "active" | "deceased";

type Dependent = {
  slot: number;
  name?: string | null;
  relationship?: string | null;
};

export default function DependentsTable({ employeeNumber, dependents, isAdmin }: { employeeNumber: string; dependents: Dependent[]; isAdmin: boolean }) {
  const storageKey = `dependent-status:${employeeNumber}`;
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setStatuses(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, [storageKey]);

  function update(slot: number, next: Status) {
    const updated = { ...statuses, [slot]: next };
    setStatuses(updated);
    try { window.localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
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
            const status: Status = statuses[slot] || "active";
            const frozen = hydrated && status === "deceased";
            return (
              <tr key={slot} className={`border-t border-slate-100 ${frozen ? "opacity-60 grayscale" : ""}`}>
                <td className="px-3 py-2 font-mono text-xs">A.{slot}</td>
                <td className="px-3 py-2">{d?.name || <span className="text-slate-300">—</span>}</td>
                <td className="px-3 py-2">{d?.relationship || "—"}</td>
                <td className="px-3 py-2">
                  {isAdmin ? (
                    <select
                      value={status}
                      onChange={(e) => update(slot, e.target.value as Status)}
                      disabled={!d?.name}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="active">Active</option>
                      <option value="deceased">Deceased</option>
                    </select>
                  ) : (
                    <span className="capitalize">{d?.name ? status : "—"}</span>
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
