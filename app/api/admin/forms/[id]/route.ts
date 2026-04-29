import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "sweap-forms";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data: form, error: fetchErr } = await supabase
    .from("sweap_forms")
    .select("id, storage_path")
    .eq("id", params.id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.storage.from(BUCKET).remove([form.storage_path]);
  const { error } = await supabase.from("sweap_forms").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
