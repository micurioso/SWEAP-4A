import UpdateForm from "./update-form";

export const metadata = {
  title: "Member Update Form · SWEAP CALABARZON",
  description: "DSWD FO IV-A SWEAP CALABARZON member information update form",
};

export default function MemberUpdatePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Member Update Form</h1>
          <p className="mt-1 text-sm text-slate-500">
            Look up a member, fill in the updated information, then generate a printable PDF.
          </p>
        </div>
        <UpdateForm />
      </div>
    </div>
  );
}
