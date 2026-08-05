import { getSupabaseAdmin } from "@/lib/supabase";

// A write here should never be able to break the action it's logging --
// fire-and-forget, log to console on failure rather than throw. Losing
// one audit entry to a transient DB hiccup is a far smaller problem than
// a client-status update or an invite silently failing because the audit
// write did.
export async function logAuditEvent(params: {
  actor: string;
  actorType?: "admin" | "client" | "system";
  action: string;
  targetType?: string;
  targetId?: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("audit_log").insert({
    actor: params.actor,
    actor_type: params.actorType ?? "admin",
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    client_id: params.clientId ?? null,
    metadata: params.metadata ?? null,
  });

  if (error) console.error(`Failed to write audit log entry (${params.action}):`, error);
}
