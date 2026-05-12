import { NextResponse } from "next/server";
import { getSessionAndProfile } from "./supabase/server";

export async function requireAdmin() {
  const { user, profile } = await getSessionAndProfile();
  if (!user || !profile || !profile.is_active || profile.role !== "admin") {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, user, profile };
}

export async function requireMemberEditor() {
  const { user, profile } = await getSessionAndProfile();
  if (
    !user ||
    !profile ||
    !profile.is_active ||
    (profile.role !== "admin" && profile.role !== "encoder")
  ) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, user, profile };
}
