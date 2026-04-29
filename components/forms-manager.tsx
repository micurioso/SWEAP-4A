"use client";

import { useState } from "react";

type Form = { id: string; name: string; storage_path: string; uploaded_at: string };

export default function FormsManager({ initial }: { initial: Form[] }) {
  const [forms, setForms] = useState<Form[]>(initial);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required");
    if (!file) return setError("Choose a PDF file");
    if (file.type && file.type !== "application/pdf") return setError("Only PDF files are allowed");

    setBusy(true);
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("file", file);
    const res = await fetch("/api/admin/forms", { method: "POST", body: fd });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error || "Upload failed");
    setForms((prev) => [json.form, ...prev]);
    setName("");
    setFile(null);
    (document.getElementById("forms-file-input") as HTMLInputElement | null)?.value &&
      ((document.getElementById("forms-file-input") as HTMLInputElement).value = "");
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this form?")) return;
    const res = await fetch(`/api/admin/forms/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return alert(j.error || "Delete failed");
    }
    setForms((prev) => prev.filter((f) => f.id !== id));
  }

  const inputCls =
    "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="space-y-5">
      <form onSubmit={onUpload} className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Upload form</h2>
        {error && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Form name
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SWEAP Membership Application" />
          </label>
          <label className="text-sm">
            PDF file
            <input
              id="forms-file-input"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className={inputCls}
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Available forms</h2>
        {forms.length === 0 ? (
          <p className="text-sm text-slate-500">No forms uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {forms.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <a href={`/api/forms/${f.id}/download`} className="font-medium text-brand-700 hover:underline">
                    {f.name}
                  </a>
                  <div className="text-xs text-slate-400">Uploaded {new Date(f.uploaded_at).toLocaleString()}</div>
                </div>
                <button
                  onClick={() => onDelete(f.id)}
                  className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
