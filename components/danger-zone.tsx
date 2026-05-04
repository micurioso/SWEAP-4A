"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ERASE_MEMBERS_PHRASE = "ERASE ALL MEMBERS";
const CLEAR_AUDIT_PHRASE = "CLEAR AUDIT LOG";

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 text-base font-semibold text-red-700">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function DangerZone() {
  const router = useRouter();
  const [eraseOpen, setEraseOpen] = useState(false);
  const [eraseInput, setEraseInput] = useState("");
  const [eraseBusy, setEraseBusy] = useState(false);
  const [eraseErr, setEraseErr] = useState<string | null>(null);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditInput, setAuditInput] = useState("");
  const [auditBusy, setAuditBusy] = useState(false);
  const [auditErr, setAuditErr] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);

  async function eraseMembers() {
    if (eraseInput !== ERASE_MEMBERS_PHRASE) {
      setEraseErr(`Type "${ERASE_MEMBERS_PHRASE}" exactly to confirm.`);
      return;
    }
    setEraseBusy(true); setEraseErr(null);
    const res = await fetch("/api/admin/erase-members", { method: "POST" });
    setEraseBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEraseErr(data.error || "Failed to erase");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setMsg(`Deleted ${data.deleted ?? "all"} member record(s).`);
    setEraseOpen(false);
    setEraseInput("");
    router.refresh();
  }

  async function clearAudit() {
    if (auditInput !== CLEAR_AUDIT_PHRASE) {
      setAuditErr(`Type "${CLEAR_AUDIT_PHRASE}" exactly to confirm.`);
      return;
    }
    setAuditBusy(true); setAuditErr(null);
    const res = await fetch("/api/admin/clear-audit", { method: "POST" });
    setAuditBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAuditErr(data.error || "Failed to clear audit log");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setMsg(`Cleared ${data.deleted ?? "all"} audit log entries.`);
    setAuditOpen(false);
    setAuditInput("");
    router.refresh();
  }

  return (
    <div className="rounded-xl border-2 border-red-300 bg-red-50/50 p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-red-700">Danger zone</h2>
        <p className="text-xs text-red-600/80">These actions are irreversible. Make sure you have a backup before proceeding.</p>
      </div>

      {msg && <div className="mb-3 rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">{msg}</div>}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-white p-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Erase all member data</div>
            <div className="text-xs text-slate-500">Deletes every row from <code className="font-mono">sweap_members</code>, plus all dependents and claimants.</div>
          </div>
          <button
            onClick={() => { setEraseOpen(true); setEraseInput(""); setEraseErr(null); }}
            className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Erase all members
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-white p-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Clear audit log</div>
            <div className="text-xs text-slate-500">Removes every entry from <code className="font-mono">audit_log</code>.</div>
          </div>
          <button
            onClick={() => { setAuditOpen(true); setAuditInput(""); setAuditErr(null); }}
            className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Clear audit log
          </button>
        </div>
      </div>

      <Modal open={eraseOpen} onClose={() => !eraseBusy && setEraseOpen(false)} title="Erase all member data">
        <p className="mb-3 text-sm text-slate-700">
          This will permanently delete <strong>every member record</strong> along with all associated dependents and claimants. This cannot be undone.
        </p>
        <p className="mb-2 text-xs text-slate-600">Type <span className="font-mono font-semibold">{ERASE_MEMBERS_PHRASE}</span> below to confirm:</p>
        <input
          autoFocus
          value={eraseInput}
          onChange={e => setEraseInput(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        {eraseErr && <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{eraseErr}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={eraseBusy} onClick={() => setEraseOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" disabled={eraseBusy || eraseInput !== ERASE_MEMBERS_PHRASE} onClick={eraseMembers} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {eraseBusy ? "Erasing…" : "Erase all members"}
          </button>
        </div>
      </Modal>

      <Modal open={auditOpen} onClose={() => !auditBusy && setAuditOpen(false)} title="Clear audit log">
        <p className="mb-3 text-sm text-slate-700">
          This will permanently delete <strong>every audit log entry</strong>. This cannot be undone.
        </p>
        <p className="mb-2 text-xs text-slate-600">Type <span className="font-mono font-semibold">{CLEAR_AUDIT_PHRASE}</span> below to confirm:</p>
        <input
          autoFocus
          value={auditInput}
          onChange={e => setAuditInput(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        {auditErr && <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{auditErr}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={auditBusy} onClick={() => setAuditOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" disabled={auditBusy || auditInput !== CLEAR_AUDIT_PHRASE} onClick={clearAudit} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {auditBusy ? "Clearing…" : "Clear audit log"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
