import { createClient } from "@/lib/supabase/server";

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
      <p className="text-sm text-slate-500">Most recent 200 record changes.</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Actor</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Table</th><th className="px-4 py-2">Target</th></tr>
          </thead>
          <tbody>
            {(rows || []).map((r: any) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-xs">{r.actor_email || r.actor_id || "—"}</td>
                <td className="px-4 py-2 text-xs uppercase">{r.action}</td>
                <td className="px-4 py-2 text-xs">{r.target_table}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.target_id}</td>
              </tr>
            ))}
            {(rows || []).length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
