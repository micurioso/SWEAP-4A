import { NextResponse } from "next/server";
import { requireMemberEditor } from "@/lib/auth-guard";
import { recordAudits } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "sweap-forms";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireMemberEditor();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data: form, error: fetchErr } = await supabase
    .from("sweap_forms")
    .select("id, name, storage_path, uploaded_by, uploaded_at")
    .eq("id", params.id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.storage.from(BUCKET).remove([form.storage_path]);
  const { error } = await supabase.from("sweap_forms").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordAudits(supabase, guard, [{
    action: "delete",
    target_table: "sweap_forms",
    target_id: params.id,
    diff: form
  }]);
  return NextResponse.json({ ok: true });
}
