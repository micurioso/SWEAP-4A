import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();

  const { count: before } = await supabase
    .from("audit_log")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase.from("audit_log").delete().not("id", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, deleted: before ?? 0 });
}
