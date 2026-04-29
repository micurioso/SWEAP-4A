import { NextResponse } from "next/server";
import { createClient, getSessionAndProfile } from "@/lib/supabase/server";

export async function GET() {
  const { user } = await getSessionAndProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sweap_forms")
    .select("id, name, uploaded_at")
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ forms: data || [] });
}
