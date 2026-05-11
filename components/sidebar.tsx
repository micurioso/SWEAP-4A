"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Database,
  UserCog,
  ScrollText,
  FileText,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/theme-toggle";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; admin?: boolean };

const TOP_ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members",   label: "Members",   icon: Users }
];

const BOTTOM_ITEMS: Item[] = [
  { href: "/admin/data-management", label: "Data Management", icon: Database, admin: true },
  { href: "/admin/users",  label: "Users",     icon: UserCog,   admin: true },
  { href: "/admin/forms",  label: "Manage Forms", icon: FileText, admin: true },
  { href: "/admin/audit",  label: "Audit log", icon: ScrollText, admin: true }
];

type Form = { id: string; name: string };

export default function Sidebar({
  role, name, username
}: { role: "admin" | "viewer"; name: string; username: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const [forms, setForms] = useState<Form[]>([]);
  const isAdmin = role === "admin";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/forms")
      .then((r) => (r.ok ? r.json() : { forms: [] }))
      .then((j) => {
        if (!cancelled) setForms(j.forms || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  const visibleTop = TOP_ITEMS.filter((i) => !i.admin || isAdmin);
  const visibleBottom = BOTTOM_ITEMS.filter((i) => !i.admin || isAdmin);

  function renderLink({ href, label, icon: Icon }: Item) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
          active
            ? "bg-brand-600 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  const NavList = (
    <nav className="flex flex-col gap-1">
      {visibleTop.map(renderLink)}

      <button
        type="button"
        onClick={() => setFormsOpen((v) => !v)}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <FileText className="h-4 w-4" />
        <span className="flex-1 text-left">SWEAP Forms</span>
        {formsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {formsOpen && (
        <div className="ml-7 flex flex-col gap-1 border-l border-slate-200 pl-2">
          <a
            href="/register"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 text-sm font-medium text-brand-600 hover:bg-slate-100 hover:text-brand-700"
          >
            Member Registration
          </a>
          {forms.length === 0 ? (
            <span className="px-2 py-1 text-xs text-slate-400">No uploaded forms yet</span>
          ) : (
            forms.map((f) => (
              <a
                key={f.id}
                href={`/api/forms/${f.id}/download`}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {f.name}
              </a>
            ))
          )}
        </div>
      )}

      {visibleBottom.map(renderLink)}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-brand-700">
          <img src="/sweap-logo.png" alt="SWEAP" className="h-8 w-8 rounded-full object-contain" />
          <span>SWEAP CALABARZON</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {/* Spacer to offset the mobile top bar */}
      <div className="h-14 lg:hidden" />

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar (desktop fixed; mobile slide-in) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <img src="/sweap-logo.png" alt="SWEAP" className="h-10 w-10 rounded-full object-contain" />
            <div>
              <div className="text-base font-bold text-brand-700">SWEAP</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">CALABARZON</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">{NavList}</div>

        <div className="border-t border-slate-200 px-3 py-3">
          <div className="mb-2 px-2">
            <div className="truncate text-sm font-medium text-slate-700">{name}</div>
            <div className="truncate text-xs text-slate-400">@{username}</div>
            <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
              {role}
            </div>
          </div>
          <div className="mb-1 flex items-center justify-between px-3 py-1">
            <span className="text-xs text-slate-500">Theme</span>
            <ThemeToggle />
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
