import type { SupabaseClient } from "@supabase/supabase-js";
import { sendClientEmail } from "@/lib/send-client-email";

// Studio big-ticket ("no alert when a client's own invoice payment
// fails") — the platform-billing equivalent (sendPaymentFailedEmail(),
// payment-failed-email.ts) tells an org owner when *their own*
// Agency Platform subscription payment to HamishAI fails. This is the
// other direction: one of that org's own *clients'* payments to *them*
// failing — arguably the more commercially important of the two for an
// agency actually trying to get paid, and until now it only ever
// silently flipped invoices.status back to "open" with no notification
// at all.
//
// Fires once per real failed attempt (the webhook route itself checks
// invoice.attempt_count === 1 before calling this — Stripe's own Smart
// Retries can re-send this same event on every retry attempt, and a
// tenant doesn't need a fresh email for each one).
export async function sendClientPaymentFailedEmail(admin: SupabaseClient, orgId: string, clientBusinessName: string) {
  const { data: owner } = await admin.from("memberships").select("email").eq("org_id", orgId).eq("role", "owner").limit(1).maybeSingle();
  if (!owner?.email) return;

  await sendClientEmail(
    owner.email,
    `A payment from ${clientBusinessName} failed`,
    `Hi,\n\n${clientBusinessName}'s last invoice payment didn't go through. Stripe will keep retrying automatically for a little while, but it's usually fastest to follow up with them directly.\n\nView it any time in Studio > Clients.\n\n— Hamish AI`
  );
}
