"use client";
import { useState } from "react";
import Papa from "papaparse";
import { rowToMember } from "@/lib/csv";
import type { MemberWithRelations } from "@/lib/schemas";

type Result = { inserted: number; updated: number; errors: { employee_number: string; message: string }[] };

export default function ImportPage() {
  const [parsed, setParsed] = useState<MemberWithRelations[] | null>(null);
  const [skipped, setSkipped] = useState<number>(0);
  const [filename, setFilename] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setResult(null);
    setError(null);
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: ({ data }) => {
        // Skip the header row
        const rows = data.slice(1);
        const parsedMembers: MemberWithRelations[] = [];
        let skippedCount = 0;
        for (const row of rows) {
          const m = rowToMember(row as string[]);
          if (m) parsedMembers.push(m);
          else skippedCount++;
        }
        setParsed(parsedMembers);
        setSkipped(skippedCount);
      },
      error: (err) => setError(err.message)
    });
  }

  async function commit() {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows: parsed })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Import failed");
      return;
    }
    setResult(data);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-800">Import Members</h1>
      <p className="text-sm text-slate-500">
        Upload a CSV exported from the SWEAP enrollment Google Form. Existing employees (matched by Employee Number) will be updated; new ones will be created.
      </p>

      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
        <input id="file" type="file" accept=".csv" className="hidden" onChange={onFile} />
        <label htmlFor="file" className="cursor-pointer rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Choose CSV file
        </label>
        {filename && <div className="mt-3 text-sm text-slate-600">{filename}</div>}
      </div>

      {parsed && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">Dry-run preview</div>
              <div className="text-xs text-slate-500">{parsed.length} valid rows · {skipped} skipped (missing employee number or name)</div>
            </div>
            <button onClick={commit} disabled={busy || parsed.length === 0}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {busy ? "Importing…" : `Commit ${parsed.length} rows`}
            </button>
          </div>
          <div className="max-h-72 overflow-auto rounded-md border border-slate-100">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr><th className="px-3 py-1.5">Emp #</th><th className="px-3 py-1.5">Name</th><th className="px-3 py-1.5">Chapter</th><th className="px-3 py-1.5">Division</th><th className="px-3 py-1.5">Dependents</th><th className="px-3 py-1.5">Claimants</th></tr>
              </thead>
              <tbody>
                {parsed.slice(0, 100).map(m => (
                  <tr key={m.employee_number} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-mono">{m.employee_number}</td>
                    <td className="px-3 py-1.5">{m.full_name}</td>
                    <td className="px-3 py-1.5">{m.chapter_base}</td>
                    <td className="px-3 py-1.5">{m.division}</td>
                    <td className="px-3 py-1.5">{m.dependents.length}</td>
                    <td className="px-3 py-1.5">{m.claimants.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.length > 100 && <div className="mt-2 text-xs text-slate-400">Showing first 100 rows.</div>}
        </div>
      )}

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm">
          <div className="font-semibold text-emerald-800">Import complete</div>
          <ul className="mt-2 text-emerald-700">
            <li>Inserted: {result.inserted}</li>
            <li>Updated: {result.updated}</li>
            <li>Errors: {result.errors.length}</li>
          </ul>
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-emerald-800">Show errors</summary>
              <ul className="mt-2 list-disc pl-5 text-xs text-red-700">
                {result.errors.map((e, i) => <li key={i}>{e.employee_number}: {e.message}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
