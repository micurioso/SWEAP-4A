"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  UserCog,
  Users,
  X
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  admin?: boolean;
  editor?: boolean;
};
type Form = { id: string; name: string };

const TOP_ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users }
];

const BOTTOM_ITEMS: Item[] = [
  { href: "/admin/data-management", label: "Data Management", icon: Database, admin: true },
  { href: "/admin/users", label: "Users", icon: UserCog, admin: true },
  { href: "/admin/forms", label: "Manage Forms", icon: FileText, editor: true },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText, admin: true }
];

const PAGE_TITLES: Array<{ match: (path: string) => boolean; title: string; subtitle: string }> = [
  { match: path => path === "/dashboard", title: "Dashboard", subtitle: "Member database overview" },
  { match: path => path === "/members/new", title: "Add Member", subtitle: "Create a new member record" },
  { match: path => path.endsWith("/edit"), title: "Edit Member", subtitle: "Update member information" },
  { match: path => path.startsWith("/members/"), title: "Member Profile", subtitle: "Member record and dependents" },
  { match: path => path === "/members", title: "Members", subtitle: "Search and manage member records" },
  { match: path => path === "/member-update", title: "Member Update Forms", subtitle: "Generate individual or department forms" },
  { match: path => path === "/admin/data-management", title: "Data Management", subtitle: "Import, export, and database tools" },
  { match: path => path === "/admin/users", title: "User Accounts", subtitle: "Manage access and permissions" },
  { match: path => path === "/admin/forms", title: "Manage Forms", subtitle: "Publish downloadable SWEAP forms" },
  { match: path => path === "/admin/audit", title: "Audit Log", subtitle: "Review recorded system activity" }
];

export default function Sidebar({
  role,
  name,
  username,
  collapsed,
  onCollapsedChange
}: {
  role: "admin" | "encoder" | "viewer";
  name: string;
  username: string;
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const [forms, setForms] = useState<Form[]>([]);
  const isAdmin = role === "admin";
  const isEditor = role === "admin" || role === "encoder";
  const pageContext = PAGE_TITLES.find(item => item.match(pathname)) ?? {
    title: "SWEAP CALABARZON",
    subtitle: "Member database"
  };

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/forms")
      .then(response => (response.ok ? response.json() : { forms: [] }))
      .then(result => {
        if (!cancelled) setForms(result.forms ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  function canSee(item: Item) {
    if (item.admin) return isAdmin;
    if (item.editor) return isEditor;
    return true;
  }

  function renderLink({ href, label, icon: Icon }: Item) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        aria-label={collapsed ? label : undefined}
        title={collapsed ? label : undefined}
        className={cn(
          "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          collapsed && "sm:justify-center sm:px-0",
          active
            ? "bg-white font-semibold text-brand-700 shadow-sm ring-1 ring-white/80"
            : "text-blue-100 hover:bg-white/10 hover:text-white"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className={cn(collapsed && "sm:hidden")}>{label}</span>
      </Link>
    );
  }

  const visibleTop = TOP_ITEMS.filter(canSee);
  const visibleBottom = BOTTOM_ITEMS.filter(canSee);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur transition-[left] duration-200 dark:bg-slate-950/95 sm:px-5 lg:px-6",
          collapsed ? "sm:left-16" : "sm:left-56 lg:left-64"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="mr-3 flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 sm:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mr-3 hidden h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 sm:flex"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight text-slate-800 sm:text-base">
            {pageContext.title}
          </div>
          <div className="mt-0.5 hidden truncate text-[11px] text-slate-400 sm:block">
            {pageContext.subtitle}
          </div>
        </div>

        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </header>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-slate-900/40 sm:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-brand-800/70 bg-gradient-to-b from-brand-700 via-brand-700 to-slate-950 text-white shadow-xl transition-[transform,width] duration-200 sm:translate-x-0 sm:shadow-none",
          collapsed ? "sm:w-16" : "sm:w-56 lg:w-64",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("flex h-16 items-center justify-between border-b border-white/10 px-5", collapsed && "sm:justify-center sm:px-2")}>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <img src="/sweap-logo.png" alt="SWEAP" className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-0.5 shadow-sm" />
            <div className={cn("min-w-0", collapsed && "sm:hidden")}>
              <div className="truncate text-base font-bold text-white">SWEAP</div>
              <div className="text-[10px] uppercase tracking-wider text-blue-200">CALABARZON</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-blue-200 hover:bg-white/10 hover:text-white sm:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {visibleTop.map(renderLink)}

          <button
            type="button"
            onClick={() => {
              if (collapsed && window.matchMedia("(min-width: 640px)").matches) {
                onCollapsedChange(false);
                setFormsOpen(true);
                return;
              }
              setFormsOpen(value => !value);
            }}
            aria-expanded={formsOpen}
            aria-label={collapsed ? "SWEAP Forms" : undefined}
            title={collapsed ? "SWEAP Forms" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm text-blue-100 transition-colors hover:bg-white/10 hover:text-white",
              collapsed && "sm:justify-center sm:px-0"
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className={cn("flex-1 text-left", collapsed && "sm:hidden")}>SWEAP Forms</span>
            <span className={cn(collapsed && "sm:hidden")}>
              {formsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          </button>

          {formsOpen && (
            <div className={cn("ml-7 flex flex-col gap-1 border-l border-white/15 pl-2", collapsed && "sm:hidden")}>
              <a
                href="/member-registration"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-2 py-1.5 text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white"
              >
                Member Registration
              </a>
              <Link
                href="/member-update"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1.5 text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white"
              >
                Member Update Form
              </Link>
              {forms.length === 0 ? (
                <span className="px-2 py-1 text-xs text-blue-300">No uploaded forms yet</span>
              ) : (
                forms.map(form => (
                  <a
                    key={form.id}
                    href={`/api/forms/${form.id}/download`}
                    className="rounded-md px-2 py-1.5 text-sm text-blue-100 hover:bg-white/10 hover:text-white"
                  >
                    {form.name}
                  </a>
                ))
              )}
            </div>
          )}

          {visibleBottom.map(renderLink)}
        </nav>

        <div className={cn("border-t border-white/10 px-3 py-3", collapsed && "sm:px-2")}>
          <div className={cn("mb-2 px-2", collapsed && "sm:hidden")}>
            <div className="truncate text-sm font-medium text-white">{name}</div>
            <div className="truncate text-xs text-blue-200">@{username}</div>
            <div className="mt-1 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-blue-100 ring-1 ring-white/10">
              {role}
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-blue-100 transition-colors hover:bg-white/10 hover:text-white",
              collapsed && "sm:justify-center sm:px-0"
            )}
          >
            <LogOut className="h-4 w-4" />
            <span className={cn(collapsed && "sm:hidden")}>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
