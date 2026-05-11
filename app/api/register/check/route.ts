import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const empNo = (url.searchParams.get("empNo") || "").trim();
  if (!empNo) return NextResponse.json({ taken: false });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sweap_members")
    .select("employee_number")
    .eq("employee_number", empNo)
    .maybeSingle();

  return NextResponse.json({ taken: !!data });
}
