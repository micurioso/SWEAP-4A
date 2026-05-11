import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberWithRelationsSchema } from "@/lib/schemas";

const registrationSchema = memberWithRelationsSchema.extend({
  consent_signed: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the consent notice." })
  })
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { dependents, claimants, ...member } = parsed.data;

  const { data: existing } = await supabase
    .from("sweap_members")
    .select("employee_number")
    .eq("employee_number", member.employee_number)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `Employee number "${member.employee_number}" is already registered. Please contact your administrator if this is a mistake.` },
      { status: 409 }
    );
  }

  const { error: insertErr } = await supabase.from("sweap_members").insert(member);
  if (insertErr) {
    const friendly = (insertErr as any).code === "23505"
      ? `Employee number "${member.employee_number}" is already registered.`
      : insertErr.message;
    return NextResponse.json({ error: friendly }, { status: 400 });
  }

  const cleanDeps = (dependents || []).filter(d => d.name && d.name.trim());
  const cleanClas = (claimants || []).filter(c => c.name && c.name.trim());

  if (cleanDeps.length) {
    const { error } = await supabase
      .from("member_dependents")
      .insert(cleanDeps.map(d => ({ ...d, employee_number: member.employee_number })));
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (cleanClas.length) {
    const { error } = await supabase
      .from("member_claimants")
      .insert(cleanClas.map(c => ({ ...c, employee_number: member.employee_number })));
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, employee_number: member.employee_number });
}
