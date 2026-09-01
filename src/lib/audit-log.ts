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
  // Studio big-ticket ("team collaboration") — audit_log has carried an
  // org_id column since schema-backfill-internal-org.sql, but nothing
  // ever actually wrote to it; every existing Studio call site stuffed
  // orgId into `metadata` instead (never indexed, never queryable as a
  // real column). Optional and additive: omitting it just leaves the
  // column null, exactly as it's always been. Several call sites still
  // duplicate their orgId into metadata too rather than being rewritten
  // here — left alone rather than risking a metadata-shape change no
  // caller asked for.
  orgId?: string;
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
    org_id: params.orgId ?? null,
    metadata: params.metadata ?? null,
  });

  if (error) console.error(`Failed to write audit log entry (${params.action}):`, error);
}
