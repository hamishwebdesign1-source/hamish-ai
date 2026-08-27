import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";
import { getUsageStatus, USAGE_LABELS, ALL_USAGE_EVENT_TYPES } from "@/lib/usage-limits";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

// Real-improvement pass — usage-limits.ts has always had a real, per-
// plan ceiling on 10 metered actions (getUsageStatus), but the only way
// a tenant ever found out they were close to one was hitting it mid-
// task. Same "warn before it happens" instinct as trial-reminders.ts's
// own 3-day/1-day/day-of emails, adapted to a monthly-resetting usage
// ceiling instead of a one-time trial deadline.
//
// Warns once per org per event type per calendar month, in the 80–99%
// band — 100%+ already blocks the action itself with its own real
// error message (usage-limits.ts's own `allowed: false`), so a warning
// at that point would just be restating something the tenant has
// already hit. usage_warnings_sent's own unique constraint (org_id,
// event_type, month_start) is what actually prevents a second email
// the next day once an org is sitting in that band — the insert simply
// fails, treated as "already warned," not an error.
//
// Same "genuinely, honestly HamishAI emailing a tenant" direction as
// owner-digest.ts — sendClientEmail()'s hardcoded from-address is
// correct here for the same reason, and this isn't gated to is_internal
// (which has no usage ceiling to warn about in the first place — see
// usage-limits.ts's own comment on why is_internal skips this
// function's caller entirely).

const WARNING_THRESHOLD = 0.8;

function monthStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0, 10);
}

export async function sendUsageWarnings() {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." as const };

  const { data: orgs, error: orgsError } = await admin
    .from("organisations")
    .select("id, name, plan")
    .eq("is_internal", false)
    .not("plan", "is", null);
  if (orgsError) return { error: "Failed to fetch organisations." as const };

  const monthStart = monthStartIso();
  const sent: string[] = [];

  for (const org of orgs ?? []) {
    const plan = org.plan as PlatformPlanSlug;

    for (const eventType of ALL_USAGE_EVENT_TYPES) {
      const status = await getUsageStatus(org.id, eventType, plan);
      if (status.limit === 0) continue;
      const pct = status.used / status.limit;
      if (pct < WARNING_THRESHOLD || pct >= 1) continue;

      // The unique constraint is the real guard; this insert either
      // succeeds (genuinely the first warning this org/type/month) or
      // fails on the constraint (already warned) — no separate SELECT
      // needed to check first, one round trip either way.
      const { error: insertError } = await admin
        .from("usage_warnings_sent")
        .insert({ org_id: org.id, event_type: eventType, month_start: monthStart });
      if (insertError) continue; // already warned this month for this type — not a real error

      const { data: owners } = await admin
        .from("memberships")
        .select("email")
        .eq("org_id", org.id)
        .eq("role", "owner")
        .not("accepted_at", "is", null);

      const label = USAGE_LABELS[eventType];
      const body = `Hi,\n\nYou've used ${status.used} of your ${status.limit} ${label.toLowerCase()} this month.\n\nThis is a fair-use ceiling, not a hard marketed limit for most of these actions — but once you hit it, you won't be able to use this feature again until next month.\n\nFull picture any time at hamishai.org/studio/billing.\n\n— Hamish AI`;

      for (const owner of owners ?? []) {
        if (!owner.email) continue;
        await sendClientEmail(owner.email, `Approaching your ${label.toLowerCase()} limit — ${org.name}`, body);
        sent.push(`${org.name}:${eventType}`);
      }
    }
  }

  return { sent };
}
