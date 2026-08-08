import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMemberEditor } from "@/lib/auth-guard";
import { recordAudits } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  status: z.enum(["Active", "Deceased"])
});

export async function PATCH(
  req: Request,
  { params }: { params: { employeeNumber: string; slot: string } }
) {
  const guard = await requireMemberEditor();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const slot = Number(params.slot);
  if (!Number.isInteger(slot) || slot < 1 || slot > 4) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  const employeeNumber = decodeURIComponent(params.employeeNumber);
  const supabase = createClient();
  const { data: before } = await supabase
    .from("member_dependents")
    .select("slot, name, relationship, status, amount_claimed, check_voucher_number, claimant_name")
    .eq("employee_number", employeeNumber)
    .eq("slot", slot)
    .maybeSingle();
  const { error } = await supabase
    .from("member_dependents")
    .update({ status: parsed.data.status })
    .eq("employee_number", employeeNumber)
    .eq("slot", slot);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (before && before.status !== parsed.data.status) {
    await recordAudits(createAdminClient(), guard, [{
      action: "update",
      target_table: "member_dependents",
      target_id: `${employeeNumber}:A.${slot}`,
      diff: { before, after: { ...before, status: parsed.data.status } }
    }]);
  }
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
