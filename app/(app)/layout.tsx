import { redirect } from "next/navigation";
import { getSessionAndProfile } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSessionAndProfile();
  if (!user || !profile) redirect("/login");
  if (!profile.is_active) redirect("/login?error=disabled");

  return (
    <AppShell
      role={profile.role}
      name={profile.full_name || profile.username || profile.email}
      username={profile.username || profile.email.split("@")[0]}
    >
      {children}
    </AppShell>
  );
}
