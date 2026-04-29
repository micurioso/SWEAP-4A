import { NextResponse } from "next/server";
import { getSessionAndProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "sweap-forms";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user } = await getSessionAndProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data: form, error } = await supabase
    .from("sweap_forms")
    .select("name, storage_path")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(form.storage_path);
  if (dlErr || !file) return NextResponse.json({ error: dlErr?.message || "Download failed" }, { status: 500 });

  const buf = Buffer.from(await file.arrayBuffer());
  const safeName = form.name.replace(/[^a-zA-Z0-9._-]+/g, "_") || "form";
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      "Content-Length": String(buf.length)
    }
  });
}
