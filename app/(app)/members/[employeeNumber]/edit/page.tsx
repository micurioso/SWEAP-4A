import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberForm from "@/components/member-form";
import type { MemberWithRelations } from "@/lib/schemas";

export default async function EditMemberPage({ params }: { params: { employeeNumber: string } }) {
  const employeeNumber = decodeURIComponent(params.employeeNumber);
  const supabase = createClient();
  const [{ data: member }, { data: dependents }, { data: claimants }] = await Promise.all([
    supabase.from("sweap_members").select("*").eq("employee_number", employeeNumber).maybeSingle(),
    supabase.from("member_dependents").select("*").eq("employee_number", employeeNumber).order("slot"),
    supabase.from("member_claimants").select("*").eq("employee_number", employeeNumber).order("slot")
  ]);
  if (!member) notFound();

  const initial: MemberWithRelations = {
    ...(member as any),
    dependents: (dependents || []) as any,
    claimants: (claimants || []) as any
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Edit · {member.full_name}</h1>
      <MemberForm mode="edit" initial={initial} />
    </div>
  );
}
