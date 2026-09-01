import { describe, it, expect, vi, beforeEach } from "vitest";

const getStripeMock = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => getStripeMock(),
}));

const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

vi.mock("@/lib/send-error-alert", () => ({
  sendErrorAlert: vi.fn(),
}));

type ClientRow = {
  id: string;
  business_name: string;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  maintenance_monthly_pence: number | null;
  org_id: string | null;
};
type OrgRow = { is_internal: boolean; stripe_connect_account_id: string | null; stripe_connect_charges_enabled: boolean };

// A chainable, directly-awaitable stub — eq()/select() return the same
// object, .single() resolves it; matches every real call shape
// subscription.ts's queries use, same "one stub shape covers every call
// site" approach as this suite's other Supabase mocks.
function chain<T>(data: T) {
  const self = {
    eq: () => self,
    select: () => self,
    single: () => Promise.resolve({ data, error: null }),
    then: (resolve: (v: { error: null }) => unknown) => resolve({ error: null }),
  };
  return self;
}

function buildAdmin(client: ClientRow, org: OrgRow | null) {
  return {
    from(table: string) {
      if (table === "clients") {
        return {
          select: () => chain(client),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === "organisations") {
        return { select: () => chain(org) };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  };
}

function buildStripe() {
  return {
    customers: { create: vi.fn().mockResolvedValue({ id: "cus_new" }) },
    products: {
      retrieve: vi.fn().mockResolvedValue({ id: "hamishai-monthly-maintenance" }),
      create: vi.fn().mockResolvedValue({ id: "hamishai-monthly-maintenance" }),
    },
    subscriptions: {
      create: vi.fn().mockResolvedValue({ id: "sub_new", status: "active" }),
      cancel: vi.fn().mockResolvedValue({}),
    },
  };
}

const baseClient: ClientRow = {
  id: "client-1",
  business_name: "Acme Cafe",
  email: "owner@acme.example",
  stripe_customer_id: "cus_existing",
  stripe_subscription_id: null,
  maintenance_monthly_pence: 15000,
  org_id: "org-1",
};

beforeEach(() => {
  vi.resetModules();
  getStripeMock.mockReset();
  getSupabaseAdminMock.mockReset();
});

describe("startSubscription", () => {
  it("creates the subscription with no Connect account option for HamishAI's own internal org", async () => {
    const stripe = buildStripe();
    getStripeMock.mockReturnValue(stripe);
    getSupabaseAdminMock.mockReturnValue(buildAdmin(baseClient, { is_internal: true, stripe_connect_account_id: null, stripe_connect_charges_enabled: false }));

    const { startSubscription } = await import("./subscription");
    const result = await startSubscription("client-1");

    expect(result).toEqual({ subscriptionId: "sub_new" });
    expect(stripe.subscriptions.create.mock.calls[0][1]).toBeUndefined();
  });

  it("routes every Stripe call through the tenant's own connected account when Connect is fully set up", async () => {
    const stripe = buildStripe();
    getStripeMock.mockReturnValue(stripe);
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin(baseClient, { is_internal: false, stripe_connect_account_id: "acct_tenant", stripe_connect_charges_enabled: true })
    );

    const { startSubscription } = await import("./subscription");
    const result = await startSubscription("client-1");

    expect(result).toEqual({ subscriptionId: "sub_new" });
    expect(stripe.products.retrieve.mock.calls[0]).toEqual(["hamishai-monthly-maintenance", {}, { stripeAccount: "acct_tenant" }]);
    expect(stripe.subscriptions.create.mock.calls[0][1]).toEqual({ stripeAccount: "acct_tenant" });
  });

  it("refuses to create a subscription for a tenant with no Connect account set up, before touching Stripe", async () => {
    const stripe = buildStripe();
    getStripeMock.mockReturnValue(stripe);
    getSupabaseAdminMock.mockReturnValue(buildAdmin(baseClient, { is_internal: false, stripe_connect_account_id: null, stripe_connect_charges_enabled: false }));

    const { startSubscription } = await import("./subscription");
    const result = await startSubscription("client-1");

    expect(result).toEqual({ error: "Connect your Stripe account in Settings before starting a client subscription." });
    expect(stripe.subscriptions.create).not.toHaveBeenCalled();
  });

  it("refuses to create a subscription for a tenant whose Connect account can't yet take charges", async () => {
    const stripe = buildStripe();
    getStripeMock.mockReturnValue(stripe);
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin(baseClient, { is_internal: false, stripe_connect_account_id: "acct_tenant", stripe_connect_charges_enabled: false })
    );

    const { startSubscription } = await import("./subscription");
    const result = await startSubscription("client-1");

    expect("error" in result && result.error).toMatch(/Finish your Stripe Connect setup/);
    expect(stripe.subscriptions.create).not.toHaveBeenCalled();
  });

  it("refuses when the client has no monthly rate set", async () => {
    getStripeMock.mockReturnValue(buildStripe());
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({ ...baseClient, maintenance_monthly_pence: null }, { is_internal: true, stripe_connect_account_id: null, stripe_connect_charges_enabled: false })
    );

    const { startSubscription } = await import("./subscription");
    const result = await startSubscription("client-1");

    expect(result).toEqual({ error: "Set a recurring monthly rate before starting a subscription." });
  });

  it("refuses when the client already has a subscription running", async () => {
    getStripeMock.mockReturnValue(buildStripe());
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({ ...baseClient, stripe_subscription_id: "sub_existing" }, { is_internal: true, stripe_connect_account_id: null, stripe_connect_charges_enabled: false })
    );

    const { startSubscription } = await import("./subscription");
    const result = await startSubscription("client-1");

    expect(result).toEqual({ error: "This client already has a subscription." });
  });
});

describe("cancelSubscription", () => {
  it("cancels under the tenant's own connected account when Connect is fully set up", async () => {
    const stripe = buildStripe();
    getStripeMock.mockReturnValue(stripe);
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin(
        { ...baseClient, stripe_subscription_id: "sub_existing" },
        { is_internal: false, stripe_connect_account_id: "acct_tenant", stripe_connect_charges_enabled: true }
      )
    );

    const { cancelSubscription } = await import("./subscription");
    const result = await cancelSubscription("client-1");

    expect(result).toEqual({ ok: true });
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_existing", {}, { stripeAccount: "acct_tenant" });
  });

  // The one deliberate asymmetry with startSubscription: cancelling still
  // uses the account id on file even though charges_enabled has gone
  // false, rather than refusing and trapping the org with a subscription
  // it can no longer stop.
  it("still cancels, using the account id on file, when Connect charges have since been disabled", async () => {
    const stripe = buildStripe();
    getStripeMock.mockReturnValue(stripe);
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin(
        { ...baseClient, stripe_subscription_id: "sub_existing" },
        { is_internal: false, stripe_connect_account_id: "acct_tenant", stripe_connect_charges_enabled: false }
      )
    );

    const { cancelSubscription } = await import("./subscription");
    const result = await cancelSubscription("client-1");

    expect(result).toEqual({ ok: true });
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_existing", {}, { stripeAccount: "acct_tenant" });
  });

  it("refuses when there's no subscription to cancel", async () => {
    getStripeMock.mockReturnValue(buildStripe());
    getSupabaseAdminMock.mockReturnValue(buildAdmin(baseClient, null));

    const { cancelSubscription } = await import("./subscription");
    const result = await cancelSubscription("client-1");

    expect(result).toEqual({ error: "No subscription to cancel." });
  });
});
