import DepartmentUpdateGenerator from "@/components/department-update-generator";
import UpdateForm from "@/app/member-update/update-form";

export const metadata = {
  title: "Member Update Forms · SWEAP CALABARZON",
  description: "Generate individual or department-based SWEAP member information update forms"
};

export default function MemberUpdatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Member Update Forms</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate a complete department package or prepare an update form for one member.
        </p>
      </div>

      <DepartmentUpdateGenerator />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Individual member
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <UpdateForm />
    </div>
  );
}
