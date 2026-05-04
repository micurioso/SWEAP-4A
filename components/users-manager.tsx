"use client";
import { useState } from "react";
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
    setUsername(""); setFullName(""); setPassword("");
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
    } else {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || "Update failed");
    }
  }

  async function resetPassword(id: string) {
    const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Reset failed"); return; }
    setMsg(`New temporary password: ${data.tempPassword}`);
  }

  async function editUser(u: Profile) {
    const newName = window.prompt("Full name", u.full_name || "");
    if (newName === null) return;
    const trimmed = newName.trim();
    if (trimmed === (u.full_name || "")) return;
    setErr(null); setMsg(null);
    await update(u.id, { full_name: trimmed });
    setMsg(`Updated @${u.username || u.email}`);
  }

  async function deleteUser(u: Profile) {
    if (!window.confirm(`Delete account @${u.username || u.email}? This cannot be undone.`)) return;
    setErr(null); setMsg(null);
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || "Delete failed");
      return;
    }
    setUsers(prev => prev.filter(x => x.id !== u.id));
    setMsg(`Deleted @${u.username || u.email}`);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={createUser} className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Create account</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input required placeholder="username" value={username} onChange={e => setUsername(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" pattern="[a-zA-Z0-9._-]+" title="Letters, numbers, dot, dash, underscore only" />
          <input required placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
          <select value={role} onChange={e => setRole(e.target.value as any)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
          <input placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        </div>
        <button disabled={busy} className="mt-3 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? "Creating…" : "Create account"}
        </button>
        {msg && <div className="mt-3 rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">{msg}</div>}
        {err && <div className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{err}</div>}
      </form>

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
                    <button onClick={() => editUser(u)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">
                      Edit
                    </button>
                    <button onClick={() => resetPassword(u.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">
                      Reset pw
                    </button>
                    <button onClick={() => deleteUser(u)} className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
