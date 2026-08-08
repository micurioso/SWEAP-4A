import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMemberEditor } from "@/lib/auth-guard";
import { recordAudits, type AuditEntry } from "@/lib/audit";
import { memberWithRelationsSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const saveSchema = z.object({
  mode: z.enum(["create", "edit"]),
  data: memberWithRelationsSchema
});

type RelationRow = { slot: number; [key: string]: unknown };

function relationAudits(
  table: "member_dependents" | "member_claimants",
  prefix: "A" | "B",
  employeeNumber: string,
  before: RelationRow[],
  after: RelationRow[]
): AuditEntry[] {
  const beforeBySlot = new Map(before.map(row => [row.slot, row]));
  const afterBySlot = new Map(after.map(row => [row.slot, row]));
  const slots = Array.from(new Set([...beforeBySlot.keys(), ...afterBySlot.keys()])).sort((a, b) => a - b);
  const entries: AuditEntry[] = [];
  for (const slot of slots) {
    const previous = beforeBySlot.get(slot);
    const current = afterBySlot.get(slot);
    const target_id = `${employeeNumber}:${prefix}.${slot}`;
    if (!previous && current) entries.push({ action: "insert", target_table: table, target_id, diff: current });
    else if (previous && !current) entries.push({ action: "delete", target_table: table, target_id, diff: previous });
    if (JSON.stringify(previous) !== JSON.stringify(current)) {
      if (previous && current) {
        entries.push({ action: "update", target_table: table, target_id, diff: { before: previous, after: current } });
      }
    }
  }
  return entries;
}

export async function POST(req: Request) {
  const guard = await requireMemberEditor();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid member data" }, { status: 400 });
  }

  const { mode, data } = parsed.data;
  const { dependents, claimants, ...member } = data;
  const cleanDependents = dependents
    .filter(row => row.name?.trim())
    .map(({ slot, name, relationship, status, amount_claimed, check_voucher_number, claimant_name }) => ({
      slot, name, relationship, status, amount_claimed, check_voucher_number, claimant_name
    }));
  const cleanClaimants = claimants
    .filter(row => row.name?.trim())
    .map(({ slot, name, relationship }) => ({ slot, name, relationship }));

  const supabase = createClient();
  const [{ data: beforeDependents }, { data: beforeClaimants }] = mode === "edit"
    ? await Promise.all([
        supabase
          .from("member_dependents")
          .select("slot, name, relationship, status, amount_claimed, check_voucher_number, claimant_name")
          .eq("employee_number", member.employee_number)
          .order("slot"),
        supabase
          .from("member_claimants")
          .select("slot, name, relationship")
          .eq("employee_number", member.employee_number)
          .order("slot")
      ])
    : [{ data: [] }, { data: [] }];

  if (mode === "create") {
    const { data: existing } = await supabase
      .from("sweap_members")
      .select("employee_number")
      .eq("employee_number", member.employee_number)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: `Employee number "${member.employee_number}" already exists.` }, { status: 409 });
    }
    const { error } = await supabase.from("sweap_members").insert(member);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase
      .from("sweap_members")
      .update(member)
      .eq("employee_number", member.employee_number);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const [deleteDependents, deleteClaimants] = await Promise.all([
    supabase.from("member_dependents").delete().eq("employee_number", member.employee_number),
    supabase.from("member_claimants").delete().eq("employee_number", member.employee_number)
  ]);
  if (deleteDependents.error || deleteClaimants.error) {
    return NextResponse.json({
      error: deleteDependents.error?.message ?? deleteClaimants.error?.message ?? "Could not replace member relations"
    }, { status: 400 });
  }

  if (cleanDependents.length) {
    const { error } = await supabase.from("member_dependents").insert(
      cleanDependents.map(row => ({ ...row, employee_number: member.employee_number }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (cleanClaimants.length) {
    const { error } = await supabase.from("member_claimants").insert(
      cleanClaimants.map(row => ({ ...row, employee_number: member.employee_number }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const auditEntries = [
    ...relationAudits(
      "member_dependents",
      "A",
      member.employee_number,
      (beforeDependents ?? []) as RelationRow[],
      cleanDependents as RelationRow[]
    ),
    ...relationAudits(
      "member_claimants",
      "B",
      member.employee_number,
      (beforeClaimants ?? []) as RelationRow[],
      cleanClaimants as RelationRow[]
    )
  ];
  await recordAudits(createAdminClient(), guard, auditEntries);

  return NextResponse.json({ ok: true, employee_number: member.employee_number });
}
