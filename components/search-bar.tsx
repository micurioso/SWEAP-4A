"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    // Heuristic: looks like an employee number (digits/dashes) -> direct profile route
    if (/^[0-9-]+$/.test(term)) {
      router.push(`/members/${encodeURIComponent(term)}`);
    } else {
      router.push(`/members?q=${encodeURIComponent(term)}`);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        autoFocus value={q} onChange={e => setQ(e.target.value)}
        placeholder="Employee Number (e.g. 04-8751) or name"
        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Search
      </button>
    </form>
  );
}
