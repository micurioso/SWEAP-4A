import { createClient } from "@/lib/supabase/server";

const HIDDEN_FIELDS = new Set(["updated_at", "updated_by", "created_at", "created_by"]);

function fieldChanges(diff: any): { field: string; before: unknown; after: unknown }[] {
  if (!diff || typeof diff !== "object") return [];
  const before = diff.before;
  const after = diff.after;
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: { field: string; before: unknown; after: unknown }[] = [];
  for (const k of keys) {
    if (HIDDEN_FIELDS.has(k)) continue;
    if (JSON.stringify((before as any)[k]) !== JSON.stringify((after as any)[k])) {
      out.push({ field: k, before: (before as any)[k], after: (after as any)[k] });
    }
  }
  return out;
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default async function AuditPage() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Audit log</h1>
      <p className="text-sm text-slate-500">Most recent 200 record changes. Click a row to view field-level changes and the actor who made them.</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Table</th>
              <th className="px-4 py-2">Target</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r: any) => {
              const changes = r.action === "update" ? fieldChanges(r.diff) : [];
              const isInsertOrDelete = r.action === "insert" || r.action === "delete";
              const snapshot = isInsertOrDelete && r.diff && typeof r.diff === "object" ? r.diff : null;
              return (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">{r.actor_email || r.actor_id || "system"}</td>
                  <td className="px-4 py-2 text-xs uppercase">
                    <span className={
                      r.action === "insert" ? "rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700" :
                      r.action === "update" ? "rounded bg-amber-100 px-1.5 py-0.5 text-amber-700" :
                      r.action === "delete" ? "rounded bg-red-100 px-1.5 py-0.5 text-red-700" :
                      "rounded bg-slate-100 px-1.5 py-0.5 text-slate-700"
                    }>
                      {r.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">{r.target_table}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.target_id}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.action === "update" && (
                      changes.length === 0 ? (
                        <span className="text-slate-400">No tracked changes.</span>
                      ) : (
                        <details>
                          <summary className="cursor-pointer text-brand-700">{changes.length} field{changes.length === 1 ? "" : "s"} changed</summary>
                          <table className="mt-2 w-full border-collapse text-xs">
                            <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-2 py-1">Field</th>
                                <th className="px-2 py-1">Before</th>
                                <th className="px-2 py-1">After</th>
                              </tr>
                            </thead>
                            <tbody>
                              {changes.map(c => (
                                <tr key={c.field} className="border-t border-slate-100 align-top">
                                  <td className="px-2 py-1 font-mono text-[11px] text-slate-700">{c.field}</td>
                                  <td className="px-2 py-1 text-red-700">{fmt(c.before)}</td>
                                  <td className="px-2 py-1 text-emerald-700">{fmt(c.after)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </details>
                      )
                    )}
                    {isInsertOrDelete && snapshot && (
                      <details>
                        <summary className="cursor-pointer text-brand-700">Show snapshot</summary>
                        <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-50 p-2 text-[11px] text-slate-700">{JSON.stringify(snapshot, null, 2)}</pre>
                      </details>
                    )}
                    {(r.action === "import" || r.action === "export") && r.diff && (
                      <span className="text-slate-600">
                        {typeof r.diff?.rows === "number" ? `${r.diff.rows} rows` : ""}
                        {r.diff?.chapter ? ` · chapter=${r.diff.chapter}` : ""}
                        {r.diff?.division ? ` · division=${r.diff.division}` : ""}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {(rows || []).length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
