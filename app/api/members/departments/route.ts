import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const division = request.nextUrl.searchParams.get("division")?.trim();

  if (!division) {
    const counts = new Map<string, number>();
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("sweap_members")
        .select("division")
        .not("division", "is", null)
        .order("division")
        .range(from, from + pageSize - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      for (const row of data ?? []) {
        const name = String(row.division ?? "").trim();
        if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
      }

      if ((data?.length ?? 0) < pageSize) break;
      from += pageSize;
    }

    return NextResponse.json({
      departments: Array.from(counts, ([name, count]) => ({ name, count }))
    });
  }

  if (division.length > 160) {
    return NextResponse.json({ error: "Invalid department" }, { status: 400 });
  }

  const listChapters = request.nextUrl.searchParams.get("chapters") === "1";
  if (listChapters) {
    const counts = new Map<string, number>();
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("sweap_members")
        .select("chapter_base")
        .eq("division", division)
        .not("chapter_base", "is", null)
        .order("chapter_base")
        .range(from, from + pageSize - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      for (const row of data ?? []) {
        const name = String(row.chapter_base ?? "").trim();
        if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
      }

      if ((data?.length ?? 0) < pageSize) break;
      from += pageSize;
    }

    return NextResponse.json({
      division,
      chapters: Array.from(counts, ([name, count]) => ({ name, count }))
    });
  }

  const chapter = request.nextUrl.searchParams.get("chapter")?.trim() ?? "";
  if (chapter.length > 160) {
    return NextResponse.json({ error: "Invalid chapter" }, { status: 400 });
  }

  const offset = Number.parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);
  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "100", 10);
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(requestedLimit) || requestedLimit < 1) {
    return NextResponse.json({ error: "Invalid pagination" }, { status: 400 });
  }
  const limit = Math.min(requestedLimit, 200);

  let query = supabase
    .from("sweap_members")
    .select(`
      employee_number,
      full_name,
      email_address,
      contact_number,
      birthdate,
      sex,
      civil_status,
      religion,
      sector,
      ip_affiliation,
      permanent_address,
      current_address,
      chapter_base,
      division,
      position,
      status_of_employment,
      emergency_contact_name,
      emergency_contact_number,
      emergency_contact_relationship,
      member_dependents (slot, name, relationship, status),
      member_claimants (slot, name, relationship)
    `, { count: "exact" })
    .eq("division", division);

  if (chapter) query = query.eq("chapter_base", chapter);

  const { data, error, count } = await query
    .order("full_name")
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const members = (data ?? []).map(row => {
    const {
      member_dependents: dependents,
      member_claimants: claimants,
      ...member
    } = row;
    return {
      member,
      dependents: [...(dependents ?? [])].sort((a, b) => a.slot - b.slot),
      claimants: [...(claimants ?? [])].sort((a, b) => a.slot - b.slot)
    };
  });

  return NextResponse.json({
    division,
    chapter: chapter || null,
    members,
    offset,
    limit,
    total: count ?? members.length
  });
}
