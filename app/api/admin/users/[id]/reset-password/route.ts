import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

function gen() {
  return Math.random().toString(36).slice(2, 6) + "-" +
    Math.random().toString(36).slice(2, 6) + "-" +
    Math.random().toString(36).slice(2, 4).toUpperCase();
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const tempPassword = gen();
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(params.id, { password: tempPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ tempPassword });
}
