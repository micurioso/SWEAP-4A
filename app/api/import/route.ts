import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberWithRelationsSchema } from "@/lib/schemas";
import { importMembers } from "@/lib/import";

const bodySchema = z.object({
  rows: z.array(memberWithRelationsSchema)
});

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  // Use service-role client to bypass per-row RLS overhead, but admin status is already verified.
  const supabase = createAdminClient();
  const result = await importMembers(supabase as any, parsed.data.rows);

  // Audit the import as a single row
  const userClient = createClient();
  await userClient.from("audit_log").insert({
    actor_id: guard.user.id,
    actor_email: guard.profile.email,
    action: "import",
    target_table: "sweap_members",
    target_id: null,
    diff: { inserted: result.inserted, updated: result.updated, errors: result.errors.length }
  } as any);

  return NextResponse.json(result);
}
