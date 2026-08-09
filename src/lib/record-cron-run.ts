import { getSupabaseAdmin } from "@/lib/supabase";

// One row per cron invocation — see supabase/schema-cron-runs.sql. Called
// once at the end of every /api/cron/* route, on both the success and
// error paths, right alongside the existing sendErrorAlert() calls (this
// doesn't replace those — sendErrorAlert is same-day human notification,
// this is the persisted history the Automation page reads).
//
// Fire-and-forget from the caller's perspective (awaited so it actually
// completes before the serverless function exits, but never throws) — a
// logging failure must never turn an otherwise-successful cron run into a
// reported failure, or vice versa.
export async function recordCronRun(
  cronName: string,
  status: "success" | "error",
  detail: { summary?: Record<string, unknown>; error?: string } = {}
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("cron_runs").insert({
    cron_name: cronName,
    status,
    summary: detail.summary ?? null,
    error: detail.error ?? null,
  });

  if (error) console.error(`Failed to record cron run for ${cronName}:`, error);
}
