"use client";
import { useState } from "react";

export default function ExportForm({ chapters, divisions }: { chapters: string[]; divisions: string[] }) {
  const [chapter, setChapter] = useState("");
  const [division, setDivision] = useState("");
  const [busy, setBusy] = useState(false);

  async function downloadCsv() {
    setBusy(true);
    const params = new URLSearchParams();
    if (chapter) params.set("chapter", chapter);
    if (division) params.set("division", division);
    const res = await fetch(`/api/export?${params.toString()}`);
    if (!res.ok) {
      alert("Export failed");
      setBusy(false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sweap-members-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">Chapter Base (optional)
          <select value={chapter} onChange={e => setChapter(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
            <option value="">All chapters</option>
            {chapters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm">Division (optional)
          <select value={division} onChange={e => setDivision(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
            <option value="">All divisions</option>
            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </div>
      <button onClick={downloadCsv} disabled={busy} className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
        {busy ? "Building…" : "Download .csv"}
      </button>
    </div>
  );
}
