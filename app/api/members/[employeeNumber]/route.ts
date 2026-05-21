import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — used by the public /member-update form.
// Returns a member's current data by employee number. Uses the service-role
// client server-side so it works without a logged-in session.
export async function GET(
  _req: NextRequest,
  { params }: { params: { employeeNumber: string } }
) {
  const employeeNumber = decodeURIComponent(params.employeeNumber);
  const supabase = createAdminClient();

  const [{ data: member }, { data: dependents }, { data: claimants }] = await Promise.all([
    supabase.from("sweap_members").select("*").eq("employee_number", employeeNumber).maybeSingle(),
    supabase.from("member_dependents").select("*").eq("employee_number", employeeNumber).order("slot"),
    supabase.from("member_claimants").select("*").eq("employee_number", employeeNumber).order("slot"),
  ]);

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  return NextResponse.json({ member, dependents: dependents ?? [], claimants: claimants ?? [] });
}
