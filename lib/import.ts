import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberWithRelations } from "./schemas";

export type ImportResult = {
  inserted: number;
  updated: number;
  errors: { employee_number: string; message: string }[];
};

export async function importMembers(
  supabase: SupabaseClient,
  rows: MemberWithRelations[]
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, errors: [] };

  // Determine which employee_numbers already exist for inserted vs updated counts.
  const empNos = rows.map(r => r.employee_number);
  const { data: existing } = await supabase
    .from("sweap_members")
    .select("employee_number")
    .in("employee_number", empNos);
  const existingSet = new Set((existing || []).map((r: any) => r.employee_number));

  for (const m of rows) {
    const { dependents, claimants, ...member } = m;
    const { error: upsertErr } = await supabase
      .from("sweap_members")
      .upsert(member, { onConflict: "employee_number" });
    if (upsertErr) {
      result.errors.push({ employee_number: m.employee_number, message: upsertErr.message });
      continue;
    }
    // Replace child rows
    await supabase.from("member_dependents").delete().eq("employee_number", m.employee_number);
    await supabase.from("member_claimants").delete().eq("employee_number", m.employee_number);
    if (dependents.length) {
      const { error } = await supabase.from("member_dependents").insert(
        dependents.map(d => ({ ...d, employee_number: m.employee_number }))
      );
      if (error) result.errors.push({ employee_number: m.employee_number, message: `dependents: ${error.message}` });
    }
    if (claimants.length) {
      const { error } = await supabase.from("member_claimants").insert(
        claimants.map(c => ({ ...c, employee_number: m.employee_number }))
      );
      if (error) result.errors.push({ employee_number: m.employee_number, message: `claimants: ${error.message}` });
    }
    if (existingSet.has(m.employee_number)) result.updated++;
    else result.inserted++;
  }
  return result;
}
