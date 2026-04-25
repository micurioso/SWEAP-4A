import MemberForm from "@/components/member-form";

export default function NewMemberPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Add a new member</h1>
      <MemberForm mode="create" />
    </div>
  );
}
