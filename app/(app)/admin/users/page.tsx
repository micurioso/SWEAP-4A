import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import UsersManager from "@/components/users-manager";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, username, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  const admin = createAdminClient();
  const lastSignInById = new Map<string, string | null>();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) lastSignInById.set(u.id, u.last_sign_in_at ?? null);
    if (data.users.length < 200) break;
    page += 1;
  }

  const enriched = (profiles || []).map(p => ({
    ...p,
    last_sign_in_at: lastSignInById.get(p.id) ?? null
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">User accounts</h1>
      <p className="text-sm text-slate-500">Create new accounts, change roles, or deactivate users. All accounts are created and managed by admins.</p>
      <UsersManager initial={enriched} />
    </div>
  );
}
