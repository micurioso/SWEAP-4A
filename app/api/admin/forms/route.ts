import { NextResponse } from "next/server";
import { requireMemberEditor } from "@/lib/auth-guard";
import { recordAudits } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "sweap-forms";

export async function GET() {
  const guard = await requireMemberEditor();
  if (!guard.ok) return guard.response;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sweap_forms")
    .select("id, name, storage_path, uploaded_at")
    .order("uploaded_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ forms: data || [] });
}

export async function POST(req: Request) {
  const guard = await requireMemberEditor();
  if (!guard.ok) return guard.response;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = form.get("file");
  const name = (form.get("name") || "").toString().trim();
  if (!(file instanceof File)) return NextResponse.json({ error: "File is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (file.type && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) || "form";
  const storage_path = `${Date.now()}-${safe}.pdf`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storage_path, buf, { contentType: "application/pdf", upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data, error } = await supabase
    .from("sweap_forms")
    .insert({ name, storage_path, uploaded_by: guard.user.id })
    .select("id, name, storage_path, uploaded_at")
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([storage_path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAudits(supabase, guard, [{
    action: "insert",
    target_table: "sweap_forms",
    target_id: data.id,
    diff: data
  }]);

  return NextResponse.json({ form: data });
}
