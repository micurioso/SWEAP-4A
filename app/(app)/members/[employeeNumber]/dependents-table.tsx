"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, UserRound } from "lucide-react";

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
  for (const dependent of dependents) initial[dependent.slot] = normalize(dependent.status);
  const [statuses, setStatuses] = useState<Record<number, Status>>(initial);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);

  async function update(slot: number, next: Status) {
    const prev = statuses[slot] || "Active";
    setStatuses((current) => ({ ...current, [slot]: next }));
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
      if (!res.ok) setStatuses((current) => ({ ...current, [slot]: prev }));
    } catch {
      setStatuses((current) => ({ ...current, [slot]: prev }));
    } finally {
      setSavingSlot(null);
    }
  }

  return (
    <ol className="grid gap-3 lg:grid-cols-2">
      {[1, 2, 3, 4].map((slot) => {
        const dependent = dependents.find((item) => item.slot === slot);
        const name = dependent?.name?.trim();
        const status: Status = statuses[slot] || "Active";
        const deceased = status === "Deceased";
        const saving = savingSlot === slot;

        return (
          <li
            key={slot}
            className={`rounded-xl border p-4 transition ${
              name ? "border-slate-200 bg-slate-50/50" : "border-dashed border-slate-200 bg-slate-50/30"
            } ${deceased ? "opacity-70 grayscale" : ""}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white font-mono text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-blue-300">
                  A.{slot}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                    <p className={`break-words text-sm font-semibold ${name ? "text-slate-800" : "text-slate-400"}`}>
                      {name || "No dependent declared"}
                    </p>
                  </div>
                  {dependent?.relationship?.trim() && (
                    <p className="mt-1 break-words pl-6 text-xs leading-5 text-slate-500">{dependent.relationship}</p>
                  )}
                </div>
              </div>

              <div className="shrink-0 pl-12 sm:pl-0">
                {canEdit ? (
                  <div className="relative">
                    <label htmlFor={`dependent-${slot}-status`} className="sr-only">
                      Status for dependent A.{slot}
                    </label>
                    <select
                      id={`dependent-${slot}-status`}
                      value={status}
                      onChange={(event) => update(slot, event.target.value as Status)}
                      disabled={!name || saving}
                      className="h-9 min-w-32 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-medium text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="Active">Active</option>
                      <option value="Deceased">Deceased</option>
                    </select>
                    {saving && <Clock3 className="absolute right-8 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
                  </div>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      name
                        ? deceased
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70"
                        : "border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    {name && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {name ? status : "Empty slot"}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
