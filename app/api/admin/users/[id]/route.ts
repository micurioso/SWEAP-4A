import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { recordAudits } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

const patchSchema = z.object({
  role: z.enum(["admin", "encoder", "viewer"]).optional(),
  is_active: z.boolean().optional(),
  full_name: z.string().optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: before } = await supabase
    .from("profiles")
    .select("id, email, username, full_name, role, is_active")
    .eq("id", params.id)
    .maybeSingle();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // If is_active is being toggled off, also ban the auth user; on, unban.
  if (typeof parsed.data.is_active === "boolean") {
    await supabase.auth.admin.updateUserById(params.id, {
      ban_duration: parsed.data.is_active ? "none" : "876000h" // ~100y
    });
  }
  const { data: after } = await supabase
    .from("profiles")
    .select("id, email, username, full_name, role, is_active")
    .eq("id", params.id)
    .maybeSingle();
  if (before && after) {
    await recordAudits(supabase, guard, [{
      action: "update",
      target_table: "profiles",
      target_id: params.id,
      diff: { before, after }
    }]);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data: before } = await supabase
    .from("profiles")
    .select("id, email, username, full_name, role, is_active")
    .eq("id", params.id)
    .maybeSingle();
  const { error } = await supabase.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.from("profiles").delete().eq("id", params.id);
  await recordAudits(supabase, guard, [{
    action: "delete",
    target_table: "profiles",
    target_id: params.id,
    diff: before
  }]);
  return NextResponse.json({ ok: true });
}
