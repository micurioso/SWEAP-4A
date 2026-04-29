import { createClient } from "@/lib/supabase/server";
import FormsManager from "@/components/forms-manager";

export default async function AdminFormsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("sweap_forms")
    .select("id, name, storage_path, uploaded_at")
    .order("uploaded_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">SWEAP Forms</h1>
      <p className="text-sm text-slate-500">Upload PDF forms here. They appear in the sidebar for all users to download.</p>
      <FormsManager initial={data || []} />
    </div>
  );
}
