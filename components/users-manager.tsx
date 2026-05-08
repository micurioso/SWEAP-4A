"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: "admin" | "viewer";
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
};

function formatLastSignIn(ts: string | null): string {
  if (!ts) return "Never";
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

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
        <h3 className="mb-4 text-base font-semibold text-slate-800">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function UsersManager({ initial }: { initial: Profile[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>(initial);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [pwTarget, setPwTarget] = useState<Profile | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [delTarget, setDelTarget] = useState<Profile | null>(null);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, full_name: fullName, role, password: password || undefined })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Failed"); return; }
    setMsg(`Created @${data.username || username}${data.tempPassword ? ` (temporary password: ${data.tempPassword})` : ""}`);
    setUsername(""); setFullName(""); setPassword(""); setRole("viewer"); setShowNewPw(false);
    setCreateOpen(false);
    router.refresh();
  }

  async function update(id: string, patch: Partial<Profile>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
      return true;
    }
    const data = await res.json().catch(() => ({}));
    setErr(data.error || "Update failed");
    return false;
  }

  function openEdit(u: Profile) {
    setEditTarget(u);
    setEditName(u.full_name || "");
    setEditErr(null);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const trimmed = editName.trim();
    setEditBusy(true); setEditErr(null);
    const res = await fetch(`/api/admin/users/${editTarget.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ full_name: trimmed })
    });
    setEditBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditErr(data.error || "Update failed");
      return;
    }
    setUsers(prev => prev.map(x => x.id === editTarget.id ? { ...x, full_name: trimmed } : x));
    setMsg(`Updated @${editTarget.username || editTarget.email}`);
    setErr(null);
    setEditTarget(null);
  }

  function openResetPw(u: Profile) {
    setPwTarget(u);
    setPwValue("");
    setPwShow(false);
    setPwErr(null);
  }

  async function submitResetPw(e: React.FormEvent) {
    e.preventDefault();
    if (!pwTarget) return;
    if (pwValue.length < 6) { setPwErr("Password must be at least 6 characters"); return; }
    setPwBusy(true); setPwErr(null);
    const res = await fetch(`/api/admin/users/${pwTarget.id}/reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pwValue })
    });
    setPwBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPwErr(data.error || "Reset failed");
      return;
    }
    setMsg(`Password updated for @${pwTarget.username || pwTarget.email}`);
    setErr(null);
    setPwTarget(null);
  }

  function openDelete(u: Profile) {
    setDelTarget(u);
    setDelErr(null);
  }

  async function submitDelete() {
    if (!delTarget) return;
    setDelBusy(true); setDelErr(null);
    const res = await fetch(`/api/admin/users/${delTarget.id}`, { method: "DELETE" });
    setDelBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDelErr(data.error || "Delete failed");
      return;
    }
    setUsers(prev => prev.filter(x => x.id !== delTarget.id));
    setMsg(`Deleted @${delTarget.username || delTarget.email}`);
    setErr(null);
    setDelTarget(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setCreateOpen(true); setErr(null); }}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Create account
        </button>
      </div>
      {msg && <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">{msg}</div>}
      {err && <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{err}</div>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Username</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Active</th><th className="px-4 py-2">Last sign-in</th><th className="px-4 py-2">Actions</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs">{u.username || u.email}</td>
                <td className="px-4 py-2">{u.full_name || "—"}</td>
                <td className="px-4 py-2">
                  <select value={u.role} onChange={e => update(u.id, { role: e.target.value as any })} className="rounded border border-slate-300 px-2 py-1 text-xs">
                    <option value="viewer">viewer</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={u.is_active} onChange={e => update(u.id, { is_active: e.target.checked })} />
                    {u.is_active ? "Active" : "Disabled"}
                  </label>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600">{formatLastSignIn(u.last_sign_in_at)}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => openEdit(u)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">
                      Edit
                    </button>
                    <button onClick={() => openResetPw(u)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">
                      Reset pw
                    </button>
                    <button onClick={() => openDelete(u)} className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!editTarget}
        onClose={() => !editBusy && setEditTarget(null)}
        title={editTarget ? `Edit @${editTarget.username || editTarget.email}` : "Edit"}
      >
        <form onSubmit={submitEdit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {editErr && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{editErr}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" disabled={editBusy} onClick={() => setEditTarget(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={editBusy} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {editBusy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!pwTarget}
        onClose={() => !pwBusy && setPwTarget(null)}
        title={pwTarget ? `Reset password for @${pwTarget.username || pwTarget.email}` : "Reset password"}
      >
        <form onSubmit={submitResetPw} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
            <div className="relative">
              <input
                autoFocus
                type={pwShow ? "text" : "password"}
                value={pwValue}
                onChange={e => setPwValue(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setPwShow(s => !s)}
                aria-label={pwShow ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
              >
                {pwShow ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Must be at least 6 characters.</p>
          </div>
          {pwErr && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{pwErr}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" disabled={pwBusy} onClick={() => setPwTarget(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={pwBusy} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {pwBusy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => !busy && setCreateOpen(false)}
        title="Create account"
      >
        <form onSubmit={createUser} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
            <input
              autoFocus required value={username} onChange={e => setUsername(e.target.value)}
              pattern="[a-zA-Z0-9ñÑ._-]+" title="Letters, numbers, dot, dash, underscore only"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
            <input
              required value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <select
              value={role} onChange={e => setRole(e.target.value as any)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(s => !s)}
                aria-label={showNewPw ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
              >
                {showNewPw ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" disabled={busy} onClick={() => setCreateOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {busy ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!delTarget}
        onClose={() => !delBusy && setDelTarget(null)}
        title="Delete account"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Delete account <span className="font-mono">@{delTarget?.username || delTarget?.email}</span>? This cannot be undone.
          </p>
          {delErr && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{delErr}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" disabled={delBusy} onClick={() => setDelTarget(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50">
              Cancel
            </button>
            <button type="button" disabled={delBusy} onClick={submitDelete} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {delBusy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
