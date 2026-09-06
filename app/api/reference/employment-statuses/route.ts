import { NextResponse } from "next/server";
import { DEFAULT_EMPLOYMENT_STATUS_OPTIONS } from "@/lib/employment-statuses";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await createAdminClient()
    .from("employment_status_options")
    .select("value, label")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  const statuses = !error && data?.length
    ? data
    : DEFAULT_EMPLOYMENT_STATUS_OPTIONS;

  return NextResponse.json(
    { statuses },
    { headers: { "Cache-Control": "no-store" } }
  );
}
