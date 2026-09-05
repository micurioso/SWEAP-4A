"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-slate-200 bg-slate-100 shadow-inner transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      <span
        className={
          "absolute left-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ffffff] shadow-md transition-transform duration-200 dark:bg-[#e2e8f0] " +
          (isDark ? "translate-x-6" : "translate-x-0")
        }
      >
        {isDark
          ? <Moon className="h-3 w-3 text-slate-700" />
          : <Sun className="h-3 w-3 text-amber-500" />}
      </span>
      <Sun className={"absolute left-1.5 h-3 w-3 text-amber-500 transition-opacity " + (isDark ? "opacity-30" : "opacity-0")} />
      <Moon className={"absolute right-1.5 h-3 w-3 text-slate-400 transition-opacity " + (isDark ? "opacity-0" : "opacity-60")} />
    </button>
  );
}
