import { getSupabaseAdmin } from "@/lib/supabase";
import { getPlatformPlan, type PlatformPlanSlug } from "@/lib/platform-plans";

export type UsageEventType = "prospect_researched";

// Calendar month, not a rolling 30 days — matches how the pricing page
// already describes each plan ("up to 30 researched prospects a month"),
// which a customer reads as "this month," not "the last 30 days."
function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export type UsageStatus = { used: number; limit: number; remaining: number; allowed: boolean };

// HamishAI's own organisation (is_internal) is never capped — the internal
// tier's whole point is no plan constraints. Callers check org.is_internal
// themselves and skip calling this entirely for that org rather than this
// function special-casing it, since "no limit" isn't really a usage
// status at all.
export async function getUsageStatus(orgId: string, eventType: UsageEventType, plan: PlatformPlanSlug): Promise<UsageStatus> {
  const limit = getPlatformPlan(plan).prospectsPerMonth; // the only metered event type today

  const supabase = getSupabaseAdmin();
  if (!supabase) return { used: 0, limit, remaining: limit, allowed: true };

  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("event_type", eventType)
    .gte("created_at", startOfMonth());

  if (error) {
    // Fails open, same call as chat-rate-limit.ts's isRateLimited(): a
    // transient DB error shouldn't block a paying customer from using
    // the product they're paying for.
    console.error("Usage status check failed, allowing request:", error);
    return { used: 0, limit, remaining: limit, allowed: true };
  }

  const used = count ?? 0;
  return { used, limit, remaining: Math.max(0, limit - used), allowed: used < limit };
}

export async function recordUsageEvent(orgId: string, eventType: UsageEventType) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("usage_events").insert({ org_id: orgId, event_type: eventType });
  if (error) console.error("Failed to record usage event:", error);
}
