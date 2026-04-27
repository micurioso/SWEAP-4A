import { createClient } from "@/lib/supabase/server";
import ExportForm from "./export-form";

export default async function ExportPage() {
  const supabase = createClient();
  const { data } = await supabase.from("sweap_members").select("chapter_base, division");

  const chapters = Array.from(new Set((data || []).map((r: any) => r.chapter_base).filter(Boolean))).sort();
  const divisions = Array.from(new Set((data || []).map((r: any) => r.division).filter(Boolean))).sort();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-800">Export Members</h1>
      <p className="text-sm text-slate-500">Download a CSV file matching the original Google Forms column layout.</p>
      <ExportForm chapters={chapters as string[]} divisions={divisions as string[]} />
    </div>
  );
}
