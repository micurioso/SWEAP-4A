"use client";

import { useEffect, useState, type ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sweap:sidebar-collapsed";

export default function AppShell({
  role,
  name,
  username,
  children
}: {
  role: "admin" | "encoder" | "viewer";
  name: string;
  username: string;
  children: ReactNode;
}) {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    try {
      setCollapsedState(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // The expanded sidebar remains the default when storage is unavailable.
    }
  }, []);

  function setCollapsed(value: boolean) {
    setCollapsedState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // The current layout still works when the preference cannot be saved.
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        role={role}
        name={name}
        username={username}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col pt-16 transition-[padding] duration-200",
          collapsed ? "sm:pl-16" : "sm:pl-56 lg:pl-64"
        )}
      >
        <main className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-400">
          DSWD FO IV-A · SWEAP CALABARZON · Member Database
        </footer>
      </div>
    </div>
  );
}
