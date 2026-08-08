import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction = "insert" | "update" | "delete" | "import" | "export" | "login";

export type AuditEntry = {
  action: AuditAction;
  target_table: string;
  target_id?: string | null;
  diff?: unknown;
};

type AuditActor = {
  user: { id: string };
  profile: { email?: string | null; username?: string | null };
};

export async function recordAudits(
  supabase: SupabaseClient,
  actor: AuditActor,
  entries: AuditEntry[]
) {
  if (entries.length === 0) return null;

  const { error } = await supabase.from("audit_log").insert(
    entries.map(entry => ({
      actor_id: actor.user.id,
      actor_email: actor.profile.email ?? actor.profile.username ?? null,
      action: entry.action,
      target_table: entry.target_table,
      target_id: entry.target_id ?? null,
      diff: entry.diff ?? null
    }))
  );

  if (error) console.error("Failed to record audit activity", error.message);
  return error;
}
