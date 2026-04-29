import { notFound } from "next/navigation";
import { createClient, getSessionAndProfile } from "@/lib/supabase/server";
import ProfileView from "./profile-view";

export default async function MemberProfile({ params }: { params: { employeeNumber: string } }) {
  const employeeNumber = decodeURIComponent(params.employeeNumber);
  const supabase = createClient();
  const { profile } = await getSessionAndProfile();
  const isAdmin = profile?.role === "admin";

  const [{ data: member }, { data: dependents }, { data: claimants }] = await Promise.all([
    supabase.from("sweap_members").select("*").eq("employee_number", employeeNumber).maybeSingle(),
    supabase.from("member_dependents").select("*").eq("employee_number", employeeNumber).order("slot"),
    supabase.from("member_claimants").select("*").eq("employee_number", employeeNumber).order("slot")
  ]);

  if (!member) notFound();

  return (
    <ProfileView
      member={member as any}
      dependents={(dependents || []) as any}
      claimants={(claimants || []) as any}
      isAdmin={isAdmin}
    />
  );
}
