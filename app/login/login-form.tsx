"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const id = identifier.trim().toLowerCase();
    let email = id;
    if (!id.includes("@")) {
      const r = await fetch("/api/auth/resolve-username", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: id })
      });
      if (r.ok) {
        email = (await r.json()).email;
      } else {
        setError("Username not found");
        setLoading(false);
        return;
      }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center overflow-x-hidden p-4 bg-cover bg-center"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      <style>{`
        @keyframes slide-in-left {
          0% { transform: translateX(-100vw); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slide-in-right {
          0% { transform: translateX(100vw); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .slide-from-left { animation: slide-in-left 1.4s ease-out forwards; }
        .slide-from-right { animation: slide-in-right 1.4s ease-out forwards; }
      `}</style>
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
      <div className="relative mb-6 w-full text-center slide-from-left">
        <span className="inline-block text-3xl md:text-5xl font-extrabold tracking-widest text-brand-700 drop-shadow-md">
          PARA SA KAWANI
        </span>
      </div>
      <div className="relative w-full max-w-md rounded-xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-700">SWEAP CALABARZON</h1>
          <p className="mt-1 text-sm text-slate-500">DSWD FO IV-A · Member Database</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
            <input
              required autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)}
              placeholder="your username"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Accounts are managed by SWEAP administrators. Contact your admin for access.
        </p>
      </div>
      <div className="relative mt-6 w-full text-center slide-from-right">
        <span className="inline-block text-3xl md:text-5xl font-extrabold tracking-widest text-brand-700 drop-shadow-md">
          PARA SA BAYAN!
        </span>
      </div>
    </div>
  );
}
