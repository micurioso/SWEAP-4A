import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { EXPORT_HEADERS, memberToExportRow } from "@/lib/csv";
import type { MemberWithRelations } from "@/lib/schemas";

function csvEscape(v: string | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const chapter = url.searchParams.get("chapter");
  const division = url.searchParams.get("division");

  const supabase = createClient();
  let q = supabase
    .from("sweap_members")
    .select("*, dependents:member_dependents(*), claimants:member_claimants(*)")
    .order("full_name");
  if (chapter) q = q.eq("chapter_base", chapter);
  if (division) q = q.eq("division", division);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: (string | null)[][] = [
    [...EXPORT_HEADERS],
    ...(data || []).map((m: any) => {
      const member: MemberWithRelations = {
        ...m,
        dependents: (m.dependents || []).sort((a: any, b: any) => a.slot - b.slot),
        claimants:  (m.claimants  || []).sort((a: any, b: any) => a.slot - b.slot)
      };
      return memberToExportRow(member);
    })
  ];

  const csv = "﻿" + rows.map(r => r.map(csvEscape).join(",")).join("\r\n");

  // Audit the export
  await supabase.from("audit_log").insert({
    actor_id: guard.user.id,
    actor_email: guard.profile.email,
    action: "export",
    target_table: "sweap_members",
    target_id: null,
    diff: { rows: (data || []).length, chapter, division }
  } as any);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="sweap-members-${new Date().toISOString().slice(0,10)}.csv"`
    }
  });
}
