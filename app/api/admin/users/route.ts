import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { recordAudits } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { newUserSchema } from "@/lib/schemas";

const SYNTHETIC_DOMAIN = "sweap.local";

function genTempPassword() {
  return Math.random().toString(36).slice(2, 6) + "-" +
    Math.random().toString(36).slice(2, 6) + "-" +
    Math.random().toString(36).slice(2, 4).toUpperCase();
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = newUserSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return NextResponse.json({ error: msg, details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const username = parsed.data.username.toLowerCase();

  // Reject if username already taken
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  }

  // Supabase Auth requires an ASCII email, so map ñ→n for the synthetic local-part.
  // The original username (with ñ) is still stored on profiles and used at login lookup.
  const emailLocal = username.replace(/ñ/g, "n");
  const email = `${emailLocal}@${SYNTHETIC_DOMAIN}`;
  const password = parsed.data.password || genTempPassword();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name, username }
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase
    .from("profiles")
    .update({ role: parsed.data.role, full_name: parsed.data.full_name, username })
    .eq("id", data.user.id);

  await recordAudits(supabase, guard, [{
    action: "insert",
    target_table: "profiles",
    target_id: data.user.id,
    diff: {
      username,
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      is_active: true
    }
  }]);

  return NextResponse.json({
    id: data.user.id,
    username,
    tempPassword: parsed.data.password ? null : password
  });
}
