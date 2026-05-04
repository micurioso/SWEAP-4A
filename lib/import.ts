import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberWithRelations } from "./schemas";

export type ImportMode = "skip-existing" | "overwrite";

export type ImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { employee_number: string; message: string }[];
};

export async function importMembers(
  supabase: SupabaseClient,
  rows: MemberWithRelations[],
  mode: ImportMode = "skip-existing"
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  // Drop in-CSV duplicates (keep first occurrence). Defense in depth — the UI
  // also dedupes before posting.
  const seen = new Set<string>();
  const deduped: MemberWithRelations[] = [];
  for (const r of rows) {
    if (seen.has(r.employee_number)) {
      result.skipped++;
      continue;
    }
    seen.add(r.employee_number);
    deduped.push(r);
  }

  if (deduped.length === 0) return result;

  const empNos = deduped.map(r => r.employee_number);
  const { data: existing, error: existErr } = await supabase
    .from("sweap_members")
    .select("employee_number")
    .in("employee_number", empNos);
  if (existErr) {
    for (const m of deduped) result.errors.push({ employee_number: m.employee_number, message: existErr.message });
    return result;
  }
  const existingSet = new Set((existing || []).map((r: any) => r.employee_number));

  // Partition rows: skip vs upsert.
  const toWrite: MemberWithRelations[] = [];
  for (const m of deduped) {
    if (existingSet.has(m.employee_number) && mode === "skip-existing") {
      result.skipped++;
      continue;
    }
    toWrite.push(m);
  }
  if (toWrite.length === 0) return result;

  const writeEmpNos = toWrite.map(m => m.employee_number);
  const memberPayload = toWrite.map(({ dependents: _d, claimants: _c, ...member }) => member);
  const dependentPayload = toWrite.flatMap(m =>
    m.dependents.map(d => ({ ...d, employee_number: m.employee_number }))
  );
  const claimantPayload = toWrite.flatMap(m =>
    m.claimants.map(c => ({ ...c, employee_number: m.employee_number }))
  );

  // 1. Bulk upsert members
  const { error: upsertErr } = await supabase
    .from("sweap_members")
    .upsert(memberPayload, { onConflict: "employee_number" });
  if (upsertErr) {
    for (const m of toWrite) result.errors.push({ employee_number: m.employee_number, message: upsertErr.message });
    return result;
  }

  // 2. Bulk delete child rows for all touched employee numbers
  const [delDeps, delClaims] = await Promise.all([
    supabase.from("member_dependents").delete().in("employee_number", writeEmpNos),
    supabase.from("member_claimants").delete().in("employee_number", writeEmpNos)
  ]);
  if (delDeps.error) result.errors.push({ employee_number: "(bulk)", message: `dependents delete: ${delDeps.error.message}` });
  if (delClaims.error) result.errors.push({ employee_number: "(bulk)", message: `claimants delete: ${delClaims.error.message}` });

  // 3. Bulk insert child rows
  const childOps: Promise<unknown>[] = [];
  if (dependentPayload.length) {
    childOps.push((async () => {
      const { error } = await supabase.from("member_dependents").insert(dependentPayload);
      if (error) result.errors.push({ employee_number: "(bulk)", message: `dependents insert: ${error.message}` });
    })());
  }
  if (claimantPayload.length) {
    childOps.push((async () => {
      const { error } = await supabase.from("member_claimants").insert(claimantPayload);
      if (error) result.errors.push({ employee_number: "(bulk)", message: `claimants insert: ${error.message}` });
    })());
  }
  await Promise.all(childOps);

  for (const m of toWrite) {
    if (existingSet.has(m.employee_number)) result.updated++;
    else result.inserted++;
  }

  return result;
}
