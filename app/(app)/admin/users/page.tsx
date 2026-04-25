import { createClient } from "@/lib/supabase/server";
import UsersManager from "@/components/users-manager";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, username, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">User accounts</h1>
      <p className="text-sm text-slate-500">Create new accounts, change roles, or deactivate users. All accounts are created and managed by admins.</p>
      <UsersManager initial={profiles || []} />
    </div>
  );
}
