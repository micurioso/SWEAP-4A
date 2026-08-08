import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { recordAudits } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();

  const { count: before } = await supabase
    .from("sweap_members")
    .select("*", { count: "exact", head: true });

  // Child rows have ON DELETE CASCADE on the employee_number FK; deleting
  // members removes dependents and claimants automatically. The per-row audit
  // trigger on sweap_members records each delete in audit_log.
  const { error } = await supabase.from("sweap_members").delete().not("employee_number", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await recordAudits(supabase, guard, [{
    action: "delete",
    target_table: "sweap_members",
    target_id: "all-members",
    diff: { deleted_rows: before ?? 0, reason: "Administrative data reset" }
  }]);

  return NextResponse.json({ ok: true, deleted: before ?? 0 });
}
