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
      aria-label="Toggle dark mode"
      className="relative inline-flex h-7 w-14 items-center rounded-full bg-slate-200 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
    >
      <span
        className={
          "absolute flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform " +
          (isDark ? "translate-x-7" : "translate-x-0.5")
        }
      >
        {isDark
          ? <Moon className="h-3.5 w-3.5 text-slate-700" />
          : <Sun className="h-3.5 w-3.5 text-amber-500" />}
      </span>
      <Sun className={"absolute left-1.5 h-3.5 w-3.5 text-amber-500 transition-opacity " + (isDark ? "opacity-30" : "opacity-0")} />
      <Moon className={"absolute right-1.5 h-3.5 w-3.5 text-slate-300 transition-opacity " + (isDark ? "opacity-0" : "opacity-30")} />
    </button>
  );
}
