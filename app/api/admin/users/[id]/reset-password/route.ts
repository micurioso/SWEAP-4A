import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { recordAudits } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters")
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(params.id, { password: parsed.data.password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await recordAudits(supabase, guard, [{
    action: "update",
    target_table: "auth.users",
    target_id: params.id,
    diff: {
      before: { password: "Protected" },
      after: { password: "Reset by administrator" }
    }
  }]);
  return NextResponse.json({ ok: true });
}
