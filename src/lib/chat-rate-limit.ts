import { getSupabaseAdmin } from "@/lib/supabase";

const WINDOW_SECONDS = 10 * 60;
const MAX_REQUESTS = 20;

// In-memory fallback only — used if Supabase env vars are missing (e.g. a
// local dev checkout without .env.local set up yet), so the app still
// runs. In production this path should never be hit; check_rate_limit
// (supabase/schema-rate-limits.sql) is the real limiter.
const fallbackHits = new Map<string, number[]>();
function fallbackIsRateLimited(key: string, windowSeconds: number, maxRequests: number): boolean {
  const now = Date.now();
  const recent = (fallbackHits.get(key) ?? []).filter((t) => now - t < windowSeconds * 1000);
  recent.push(now);
  fallbackHits.set(key, recent);
  return recent.length > maxRequests;
}

/**
 * Durable, cross-instance rate limit backed by a Postgres function
 * (check_rate_limit, in schema-rate-limits.sql) rather than an in-memory
 * Map — a Map only ever limited requests landing on the same serverless
 * instance, which is not a real guarantee on Vercel. Fails open (allows
 * the request) if the database call itself fails, since this is a soft
 * cap against casual abuse, not a hard security boundary — better to let
 * a request through during a DB hiccup than to take the whole app down
 * for every visitor.
 *
 * windowSeconds/maxRequests default to the original chat/contact/copilot
 * numbers (unchanged behaviour for those callers) — Studio's AI actions
 * (usage-limits.ts's own callers) pass tighter numbers via
 * isStudioActionRateLimited() below, since this is burst protection on
 * top of usage-limits.ts's monthly cap, not a replacement for it: nothing
 * before this stopped an org's AI actions being fired in a tight script
 * loop within an otherwise-unexceeded month.
 */
export async function isRateLimited(
  key: string,
  options?: { windowSeconds?: number; maxRequests?: number }
): Promise<boolean> {
  const windowSeconds = options?.windowSeconds ?? WINDOW_SECONDS;
  const maxRequests = options?.maxRequests ?? MAX_REQUESTS;

  const supabase = getSupabaseAdmin();
  if (!supabase) return fallbackIsRateLimited(key, windowSeconds, maxRequests);

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });

  if (error) {
    console.error("Rate limit check failed, allowing request:", error);
    return false;
  }

  return data === false;
}

// Shared budget across every Studio AI Server Action (prospecting,
// ICP building, sales kit, mockups) — the risk being guarded against is
// aggregate burst call volume against Anthropic, not any one action type
// specifically, so one bucket per org is simpler and just as effective as
// five separate ones.
export async function isStudioActionRateLimited(orgId: string): Promise<boolean> {
  return isRateLimited(`studio-ai:${orgId}`, { windowSeconds: 5 * 60, maxRequests: 15 });
}

// Separate bucket for request triage — triggered by a tenant's own
// *client* (via /portal/requests), a genuinely different traffic pattern
// from a tenant's own staff clicking around Studio, and one where a
// legitimate burst (several people at one client submitting near
// simultaneously) is more plausible.
export async function isTriageRateLimited(orgId: string): Promise<boolean> {
  return isRateLimited(`triage:${orgId}`, { windowSeconds: 5 * 60, maxRequests: 10 });
}

export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0].trim() || "unknown";
}
