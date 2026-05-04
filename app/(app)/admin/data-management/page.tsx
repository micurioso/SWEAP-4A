import { createClient } from "@/lib/supabase/server";
import DataManagementTabs from "@/components/data-management-tabs";

export default async function DataManagementPage() {
  const supabase = createClient();
  const { data } = await supabase.from("sweap_members").select("chapter_base, division");

  const chapters = Array.from(new Set((data || []).map((r: any) => r.chapter_base).filter(Boolean))).sort();
  const divisions = Array.from(new Set((data || []).map((r: any) => r.division).filter(Boolean))).sort();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Data Management</h1>
        <p className="text-sm text-slate-500">Import, export, and manage member data.</p>
      </div>
      <DataManagementTabs chapters={chapters as string[]} divisions={divisions as string[]} />
    </div>
  );
}
