import type { SupabaseClient } from "@supabase/supabase-js";
import { sendClientEmail } from "@/lib/send-client-email";

// Fires once, at the moment a tenant's Agency Platform subscription
// actually transitions into past_due (the caller in the webhook route
// checks old-status vs new-status before calling this, same
// once-per-transition idea as trial-reminders.ts's sent-flag columns,
// just without needing a DB column of its own — the transition itself is
// the gate, and Stripe won't re-send customer.subscription.updated with
// the same status unless something else about the subscription changes
// too, which this repo's own comment on that handler already relies on).
//
// Closes the same category of gap trial-reminders.ts closed for a
// lapsed trial: discover-leads.ts's billingOk check blocks prospecting
// the instant subscription_status stops being 'active', but until this,
// nothing told a real paying customer why. Stripe's own Smart Retries
// (if enabled) will keep trying the card automatically — this just gets
// there faster, since most people fix a declined card as soon as they
// know about it.
export async function sendPaymentFailedEmail(admin: SupabaseClient, orgId: string) {
  const { data: owner } = await admin
    .from("memberships")
    .select("email")
    .eq("org_id", orgId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();
  if (!owner?.email) return;

  await sendClientEmail(
    owner.email,
    "Your last Agency Platform payment failed",
    `Hi,\n\nThe last payment for your Agency Platform subscription didn't go through. Prospecting is paused until it's resolved — everything else (your existing prospects, clients and data) is untouched.\n\nUpdate your card any time in Studio > Billing > Manage billing.\n\nWe'll keep retrying automatically for a little while, but it's usually fastest to just update the card yourself.\n\n— Hamish AI`
  );
}
