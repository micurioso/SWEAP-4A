import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Returns a member's current data for authenticated users only.
export async function GET(
  _req: NextRequest,
  { params }: { params: { employeeNumber: string } }
) {
  const employeeNumber = decodeURIComponent(params.employeeNumber);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const [{ data: member }, { data: dependents }, { data: claimants }] = await Promise.all([
    supabase.from("sweap_members").select("*").eq("employee_number", employeeNumber).maybeSingle(),
    supabase.from("member_dependents").select("*").eq("employee_number", employeeNumber).order("slot"),
    supabase.from("member_claimants").select("*").eq("employee_number", employeeNumber).order("slot"),
  ]);

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  return NextResponse.json({ member, dependents: dependents ?? [], claimants: claimants ?? [] });
}
