import { redirect } from "next/navigation";
import { getSessionAndProfile } from "@/lib/supabase/server";
import Sidebar from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSessionAndProfile();
  if (!user || !profile) redirect("/login");
  if (!profile.is_active) redirect("/login?error=disabled");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        role={profile.role}
        name={profile.full_name || profile.username || profile.email}
        username={profile.username || profile.email.split("@")[0]}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-64">
        <main className="w-full min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-400">
          DSWD FO IV-A · SWEAP CALABARZON · Member Database
        </footer>
      </div>
    </div>
  );
}
