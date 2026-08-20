import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

// Tenant billing, phase 1 — see schema-stripe-connect.sql's own comment
// for why this is a separate account relationship from the agency's own
// subscription to the platform. Express accounts (not Standard or
// Custom): the lightest-weight Connect type, Stripe hosts the entire
// onboarding flow (identity, bank details, ToS acceptance), so this
// platform never touches or stores a tenant's own banking details
// directly — same "reuse Stripe's own hosted flow rather than build it"
// call as createInvoice()'s original collection_method: "send_invoice"
// choice.

export async function getOrCreateConnectAccount(orgId: string): Promise<{ accountId: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured." };

  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: org, error: orgError } = await admin
    .from("organisations")
    .select("id, name, stripe_connect_account_id")
    .eq("id", orgId)
    .single();
  if (orgError || !org) return { error: "Organisation not found." };

  if (org.stripe_connect_account_id) return { accountId: org.stripe_connect_account_id };

  try {
    const account = await stripe.accounts.create({
      type: "express",
      business_type: "company",
      company: { name: org.name },
    });

    const { error: updateError } = await admin
      .from("organisations")
      .update({ stripe_connect_account_id: account.id })
      .eq("id", orgId);
    if (updateError) return { error: "Failed to save the new Stripe account." };

    return { accountId: account.id };
  } catch (error) {
    console.error("Failed to create Stripe Connect account:", error);
    return { error: "Failed to create a Stripe account." };
  }
}

// Stripe's hosted onboarding — identity, bank details, ToS. refreshUrl is
// where Stripe sends the tenant back if the link itself expires
// mid-flow (its own retry loop, not an error state); returnUrl is where
// they land after actually finishing (or abandoning) onboarding, which
// re-checks real status server-side via refreshConnectAccountStatus()
// rather than trusting the redirect alone — Stripe explicitly does not
// guarantee onboarding is complete just because the user reached the
// return_url.
export async function createConnectOnboardingLink(
  orgId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured." };

  const accountResult = await getOrCreateConnectAccount(orgId);
  if ("error" in accountResult) return accountResult;

  try {
    const link = await stripe.accountLinks.create({
      account: accountResult.accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });
    return { url: link.url };
  } catch (error) {
    console.error("Failed to create Stripe Connect onboarding link:", error);
    return { error: "Failed to start Stripe onboarding." };
  }
}

// The real source of truth for "can this org actually receive money yet"
// — re-checked here (on return from onboarding) and from the Stripe
// webhook's account.updated handler, not assumed from either alone.
export async function refreshConnectAccountStatus(orgId: string): Promise<{ chargesEnabled: boolean } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured." };

  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: org } = await admin.from("organisations").select("stripe_connect_account_id").eq("id", orgId).single();
  if (!org?.stripe_connect_account_id) return { error: "No Stripe account connected yet." };

  try {
    const account = await stripe.accounts.retrieve(org.stripe_connect_account_id);
    await admin
      .from("organisations")
      .update({ stripe_connect_charges_enabled: Boolean(account.charges_enabled) })
      .eq("id", orgId);
    return { chargesEnabled: Boolean(account.charges_enabled) };
  } catch (error) {
    console.error("Failed to refresh Stripe Connect account status:", error);
    return { error: "Failed to check Stripe account status." };
  }
}
