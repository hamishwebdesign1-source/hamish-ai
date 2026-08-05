import { getSupabaseAdmin } from "@/lib/supabase";

const WINDOW_SECONDS = 10 * 60;
const MAX_REQUESTS = 20;

// In-memory fallback only — used if Supabase env vars are missing (e.g. a
// local dev checkout without .env.local set up yet), so the app still
// runs. In production this path should never be hit; check_rate_limit
// (supabase/schema-rate-limits.sql) is the real limiter.
const fallbackHits = new Map<string, number[]>();
function fallbackIsRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (fallbackHits.get(key) ?? []).filter((t) => now - t < WINDOW_SECONDS * 1000);
  recent.push(now);
  fallbackHits.set(key, recent);
  return recent.length > MAX_REQUESTS;
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
 */
export async function isRateLimited(key: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallbackIsRateLimited(key);

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_window_seconds: WINDOW_SECONDS,
    p_max_requests: MAX_REQUESTS,
  });

  if (error) {
    console.error("Rate limit check failed, allowing request:", error);
    return false;
  }

  return data === false;
}

export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0].trim() || "unknown";
}
