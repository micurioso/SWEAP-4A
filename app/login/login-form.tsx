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
  const [showPassword, setShowPassword] = useState(false);
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
        <span
          className="inline-block text-3xl md:text-5xl font-extrabold tracking-widest drop-shadow-md"
          style={{ color: "#0000CD", WebkitTextStroke: "2px #FFFF00", paintOrder: "stroke fill" }}
        >
          PARA SA KAWANI
        </span>
      </div>
      <div className="relative w-full max-w-md rounded-xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold" style={{ color: "#0000CD" }}>SWEAP CALABARZON</h1>
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
              >
                {showPassword ? (
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
        <span
          className="inline-block text-3xl md:text-5xl font-extrabold tracking-widest drop-shadow-md"
          style={{ color: "#0000CD", WebkitTextStroke: "2px #FFFF00", paintOrder: "stroke fill" }}
        >
          PARA SA BAYAN!
        </span>
      </div>
    </div>
  );
}
