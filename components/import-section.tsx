"use client";
import { useEffect, useState } from "react";
import Papa from "papaparse";
import { rowToMember, CSV_HEADERS } from "@/lib/csv";
import { createClient } from "@/lib/supabase/client";
import type { MemberWithRelations } from "@/lib/schemas";

type Result = { inserted: number; updated: number; skipped: number; errors: { employee_number: string; message: string }[] };

export default function ImportSection() {
  const [parsed, setParsed] = useState<MemberWithRelations[] | null>(null);
  const [duplicateInCsv, setDuplicateInCsv] = useState<string[]>([]);
  const [existingInDb, setExistingInDb] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<number>(0);
  const [filename, setFilename] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function decodeFile(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch {
      return new TextDecoder("windows-1252").decode(buf);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setResult(null);
    setError(null);
    setExistingInDb(new Set());
    const text = await decodeFile(file);
    Papa.parse<string[]>(text, {
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows = data.slice(1);
        const seen = new Set<string>();
        const dupes: string[] = [];
        const parsedMembers: MemberWithRelations[] = [];
        let skippedCount = 0;
        for (const row of rows) {
          const m = rowToMember(row as string[]);
          if (!m) { skippedCount++; continue; }
          if (seen.has(m.employee_number)) { dupes.push(m.employee_number); continue; }
          seen.add(m.employee_number);
          parsedMembers.push(m);
        }
        setParsed(parsedMembers);
        setDuplicateInCsv(dupes);
        setSkipped(skippedCount);
      },
      error: (err: Error) => setError(err.message)
    });
  }

  useEffect(() => {
    if (!parsed || parsed.length === 0) { setExistingInDb(new Set()); return; }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const empNos = parsed.map(r => r.employee_number);
      const { data } = await supabase
        .from("sweap_members")
        .select("employee_number")
        .in("employee_number", empNos);
      if (!cancelled) setExistingInDb(new Set((data || []).map((r: any) => r.employee_number)));
    })();
    return () => { cancelled = true; };
  }, [parsed]);

  function downloadTemplate() {
    const escape = (v: string) => /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = "﻿" + CSV_HEADERS.map(escape).join(",") + "\r\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sweap-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function commit() {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    setResult(null);

    const CHUNK = 200;
    const CONCURRENCY = 4;
    const total = parsed.length;
    setProgress({ done: 0, total });
    const totals: Result = { inserted: 0, updated: 0, skipped: 0, errors: [] };

    const chunks: MemberWithRelations[][] = [];
    for (let i = 0; i < total; i += CHUNK) chunks.push(parsed.slice(i, i + CHUNK));

    let done = 0;
    let firstErr: string | null = null;
    let cursor = 0;

    async function worker() {
      while (cursor < chunks.length) {
        const idx = cursor++;
        const chunk = chunks[idx];
        try {
          const res = await fetch("/api/import", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ rows: chunk, mode: overwrite ? "overwrite" : "skip-existing" })
          });
          const data = await res.json();
          if (!res.ok) {
            if (!firstErr) firstErr = data.error || "Import failed";
          } else {
            totals.inserted += data.inserted || 0;
            totals.updated += data.updated || 0;
            totals.skipped += data.skipped || 0;
            if (Array.isArray(data.errors)) totals.errors.push(...data.errors);
          }
        } catch (e: any) {
          if (!firstErr) firstErr = e?.message || "Network error";
        } finally {
          done += chunk.length;
          setProgress({ done: Math.min(done, total), total });
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, () => worker()));

    setBusy(false);
    setProgress(null);
    if (firstErr) {
      setError(firstErr);
      return;
    }
    setResult(totals);
  }

  const willInsert = parsed ? parsed.filter(r => !existingInDb.has(r.employee_number)).length : 0;
  const willUpdate = parsed ? parsed.filter(r => existingInDb.has(r.employee_number)).length : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-slate-500">
          Upload a CSV exported from the SWEAP enrollment Google Form. By default, rows whose Employee Number already exists are skipped — check &ldquo;Overwrite existing records&rdquo; to update them. In-CSV duplicates are always deduplicated (first occurrence wins).
        </p>
        <button onClick={downloadTemplate} className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Download template
        </button>
      </div>

      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
        <input id="file" type="file" accept=".csv" className="hidden" onChange={onFile} />
        <label htmlFor="file" className="cursor-pointer rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Choose CSV file
        </label>
        {filename && <div className="mt-3 text-sm text-slate-600">{filename}</div>}
      </div>

      {parsed && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-700">Dry-run preview</div>
              <div className="text-xs text-slate-500">
                {parsed.length} unique rows · {skipped} skipped (missing employee number or name)
                {duplicateInCsv.length > 0 && <> · {duplicateInCsv.length} in-CSV duplicate{duplicateInCsv.length === 1 ? "" : "s"} dropped</>}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Will insert <span className="font-semibold text-emerald-700">{willInsert}</span> new ·{" "}
                {overwrite
                  ? <>will overwrite <span className="font-semibold text-amber-700">{willUpdate}</span> existing</>
                  : <>will skip <span className="font-semibold text-slate-700">{willUpdate}</span> existing</>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
                Overwrite existing records
              </label>
              <button onClick={commit} disabled={busy || parsed.length === 0}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                {busy
                  ? progress
                    ? `Importing… ${Math.round((progress.done / progress.total) * 100)}%`
                    : "Importing…"
                  : `Commit ${parsed.length} rows`}
              </button>
            </div>
          </div>

          {progress && (
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>Importing {progress.done} of {progress.total} rows</span>
                <span className="font-mono">{Math.round((progress.done / progress.total) * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {duplicateInCsv.length > 0 && (
            <details className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <summary className="cursor-pointer">In-CSV duplicates ({duplicateInCsv.length})</summary>
              <div className="mt-2 font-mono">{duplicateInCsv.join(", ")}</div>
            </details>
          )}

          <div className="max-h-72 overflow-auto rounded-md border border-slate-100">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-1.5">Status</th>
                  <th className="px-3 py-1.5">Emp #</th>
                  <th className="px-3 py-1.5">Name</th>
                  <th className="px-3 py-1.5">Chapter</th>
                  <th className="px-3 py-1.5">Division</th>
                  <th className="px-3 py-1.5">Dependents</th>
                  <th className="px-3 py-1.5">Claimants</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 100).map(m => {
                  const exists = existingInDb.has(m.employee_number);
                  const tag = !exists
                    ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">New</span>
                    : overwrite
                      ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">Overwrite</span>
                      : <span className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-600">Skip</span>;
                  return (
                    <tr key={m.employee_number} className="border-t border-slate-100">
                      <td className="px-3 py-1.5">{tag}</td>
                      <td className="px-3 py-1.5 font-mono">{m.employee_number}</td>
                      <td className="px-3 py-1.5">{m.full_name}</td>
                      <td className="px-3 py-1.5">{m.chapter_base}</td>
                      <td className="px-3 py-1.5">{m.division}</td>
                      <td className="px-3 py-1.5">{m.dependents.length}</td>
                      <td className="px-3 py-1.5">{m.claimants.length}</td>
                    </tr>
                  );
                })}
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
            <li>Skipped (duplicates): {result.skipped}</li>
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
