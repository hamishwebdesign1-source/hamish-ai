import { getSupabaseAdmin } from "@/lib/supabase";
import { getPlatformPlan, type PlatformPlanSlug } from "@/lib/platform-plans";

// prospect_researched was the only metered event for a while — every AI
// action downstream of it (sales kit, mockup, ICP building) and one
// upstream of the whole prospecting flow (request triage, driven by a
// tenant's own client, not the tenant themselves) had no cap at all. A
// real gap found in the platform readiness audit: a single tenant could
// generate unlimited Anthropic calls through any of these with nothing
// stopping them, regardless of plan.
export type UsageEventType =
  | "prospect_researched"
  | "sales_kit_generated"
  | "website_mockup_generated"
  | "icp_built"
  | "request_triaged"
  | "clients_copilot_question"
  | "layout_redesign_proposed"
  | "website_brief_generated"
  | "website_build_prompt_generated";

// Calendar month, not a rolling 30 days — matches how the pricing page
// already describes each plan ("up to 30 researched prospects a month"),
// which a customer reads as "this month," not "the last 30 days."
function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export type UsageStatus = { used: number; limit: number; remaining: number; allowed: boolean };

// Everything but prospecting itself is a fair-use ceiling, not a marketed
// plan feature — nobody signed up for "90 sales kits a month," they
// signed up for "30 researched prospects," and these are the actions a
// legitimate user takes on those same prospects. Multiples of the plan's
// own prospectsPerMonth rather than flat numbers, so a higher tier still
// gets proportionally more headroom without a second pricing dimension
// to maintain. Chosen generously (a real user regenerating a kit or
// mockup once or twice per prospect, or iterating on an ICP description
// a few times, should never come close) — the point is stopping runaway
// spend, not rationing a working session.
const USAGE_MULTIPLIER: Record<Exclude<UsageEventType, "prospect_researched">, number> = {
  sales_kit_generated: 2,
  website_mockup_generated: 2,
  icp_built: 3,
  request_triaged: 5,
  // A chat interaction naturally runs more questions per session than a
  // one-off generation action, but each individual call is cheap (same
  // Haiku model, a short prompt, no per-question research/API cost) —
  // generous headroom for a real working session, still a real ceiling
  // against a runaway loop.
  clients_copilot_question: 10,
  // Same reasoning as clients_copilot_question — a real editing session
  // means several instructions before the layout looks right, and each
  // call is the same cheap Haiku model with no per-call research cost.
  layout_redesign_proposed: 10,
  // A real website project revises its brief or build phases a handful
  // of times as discovery answers change, not dozens — same headroom
  // class as icp_built (3x), not a chat-style session.
  website_brief_generated: 3,
  website_build_prompt_generated: 3,
};

function limitFor(eventType: UsageEventType, plan: PlatformPlanSlug): number {
  const prospectsPerMonth = getPlatformPlan(plan).prospectsPerMonth;
  if (eventType === "prospect_researched") return prospectsPerMonth;
  return prospectsPerMonth * USAGE_MULTIPLIER[eventType];
}

// HamishAI's own organisation (is_internal) is never capped — the internal
// tier's whole point is no plan constraints. Callers check org.is_internal
// themselves and skip calling this entirely for that org rather than this
// function special-casing it, since "no limit" isn't really a usage
// status at all.
export async function getUsageStatus(orgId: string, eventType: UsageEventType, plan: PlatformPlanSlug): Promise<UsageStatus> {
  const limit = limitFor(eventType, plan);

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
