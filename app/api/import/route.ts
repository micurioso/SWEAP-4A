import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { recordAudits } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberWithRelationsSchema } from "@/lib/schemas";
import { importMembers } from "@/lib/import";

const bodySchema = z.object({
  rows: z.array(memberWithRelationsSchema),
  mode: z.enum(["skip-existing", "overwrite"]).optional()
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
  const result = await importMembers(supabase as any, parsed.data.rows, parsed.data.mode || "skip-existing");

  // Audit the import as a single row
  await recordAudits(supabase, guard, [{
    action: "import",
    target_table: "sweap_members",
    target_id: null,
    diff: {
      mode: parsed.data.mode || "skip-existing",
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.length
    }
  }]);

  return NextResponse.json(result);
}
