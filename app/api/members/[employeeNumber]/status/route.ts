import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMemberEditor } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  employee_status: z.enum(["active", "separated", "deceased"])
});

export async function PATCH(req: Request, { params }: { params: { employeeNumber: string } }) {
  const guard = await requireMemberEditor();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid employee_status" }, { status: 400 });
  }

  const employeeNumber = decodeURIComponent(params.employeeNumber);
  const supabase = createClient();
  const { error } = await supabase
    .from("sweap_members")
    .update({ employee_status: parsed.data.employee_status })
    .eq("employee_number", employeeNumber);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, employee_status: parsed.data.employee_status });
}
