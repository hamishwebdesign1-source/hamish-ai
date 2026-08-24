import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";
import { platformPlans, formatMonthlyPrice } from "@/lib/platform-plans";

// P1 platform readiness item, adapted from the audit's "90/60/30-day
// renewal reminder" framing to what this platform actually has: a
// one-time 14-day free trial (schema-platform-billing.sql), not a
// recurring contract due for manual renewal. Once an agency subscribes,
// Stripe's own subscription billing (charge_automatically,
// platform-checkout.ts) renews and re-charges automatically, and Stripe
// already sends its own receipt/upcoming-invoice emails for that —
// building a second renewal-reminder system on top would just duplicate
// what Stripe does for free. The non-redundant gap this file actually
// closes: an agency on the free trial who never enters a card gets cut
// off from prospecting the moment trial_ends_at passes
// (discover-leads.ts's billingRequired gate) — three emails, each sent
// exactly once, cover the whole run-up and the moment itself: 7 days out,
// 1 day out, and the day it actually lapses.
//
// sendClientEmail() here is correct, not a tenant-identity leak — the
// recipient is the agency owner themselves, a direct HamishAI/Agency
// Platform customer, not one of a tenant's own clients. This is the one
// case in this app where "— Hamish AI" signed from hello@hamishai.org is
// exactly the right identity for the message.

// Built from the real pricing catalog rather than hand-written into the
// email body — platform-plans.ts is the one place plan names, prices and
// features are allowed to live, so a price change there can never leave
// this email quoting a stale number.
function planOptionsText(): string {
  return platformPlans
    .map((plan) => `- ${plan.name} — ${formatMonthlyPrice(plan.monthlyPence)}/mo — ${plan.tagline}`)
    .join("\n");
}

export async function sendTrialReminders(now = new Date()) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." as const };

  const { data: orgs, error } = await admin
    .from("organisations")
    .select("id, name, trial_ends_at, trial_reminder_7d_sent_at, trial_reminder_1d_sent_at, trial_reminder_ended_sent_at")
    .eq("subscription_status", "trialing")
    .eq("is_internal", false);
  if (error) return { error: "Failed to fetch organisations." as const };

  const sent: string[] = [];

  for (const org of orgs ?? []) {
    const daysLeft = (new Date(org.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const trialEndLabel = new Date(org.trial_ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

    const { data: owner } = await admin
      .from("memberships")
      .select("email")
      .eq("org_id", org.id)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();
    if (!owner?.email) continue;

    if (daysLeft <= 0 && !org.trial_reminder_ended_sent_at) {
      await sendClientEmail(
        owner.email,
        `Your Agency Platform trial has ended`,
        `Hi,\n\nYour 14-day free trial ended on ${trialEndLabel}. Prospecting is paused until you subscribe — everything else (your existing prospects, clients and data) is untouched and waiting for you.\n\nPick a plan any time in Studio > Billing:\n\n${planOptionsText()}\n\nSubscribe here: https://hamishai.org/studio/billing\n\nDidn't get what you needed from the trial? Just reply and tell me why — genuinely useful either way.\n\n— Hamish AI`
      );
      await admin.from("organisations").update({ trial_reminder_ended_sent_at: now.toISOString() }).eq("id", org.id);
      sent.push(org.id);
    } else if (daysLeft > 0 && daysLeft <= 1 && !org.trial_reminder_1d_sent_at) {
      await sendClientEmail(
        owner.email,
        `Your Agency Platform trial ends tomorrow`,
        `Hi,\n\nYour free trial ends tomorrow (${trialEndLabel}). Without a card on file, you'll lose access to prospecting until you subscribe. Add one any time in Studio > Billing.\n\n— Hamish AI`
      );
      await admin.from("organisations").update({ trial_reminder_1d_sent_at: now.toISOString() }).eq("id", org.id);
      sent.push(org.id);
    } else if (daysLeft > 1 && daysLeft <= 7 && !org.trial_reminder_7d_sent_at) {
      await sendClientEmail(
        owner.email,
        `${Math.ceil(daysLeft)} days left on your Agency Platform trial`,
        `Hi,\n\nYour free trial of the Agency Platform ends on ${trialEndLabel}. Add a card in Studio > Billing to keep prospecting, sending outreach, and managing clients without interruption.\n\n— Hamish AI`
      );
      await admin.from("organisations").update({ trial_reminder_7d_sent_at: now.toISOString() }).eq("id", org.id);
      sent.push(org.id);
    }
  }

  return { sent };
}
