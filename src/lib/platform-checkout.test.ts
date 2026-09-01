import { describe, it, expect, vi, beforeEach } from "vitest";

const getStripeMock = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => getStripeMock(),
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  getStripeMock.mockReset();
  process.env = { ...originalEnv, STRIPE_PRICE_PLATFORM_AGENCY: "price_agency_789" };
});

// Billing-bug fix (2026-09-01) — the actual fix for the "Subscribe on
// another plan creates a second, orphaned subscription" bug: this
// changes the *existing* subscription's price in place via
// stripe.subscriptions.update(), never creates a new Checkout Session or
// a second subscription. Mocks getStripe() (this codebase's own thin
// wrapper around the Stripe SDK) rather than the SDK itself — same
// boundary every other getSupabaseAdmin()-mocking test in this suite
// mocks at, and there's no precedent anywhere in this codebase for
// mocking a third-party SDK's own internals directly.
describe("changePlatformSubscriptionPlan", () => {
  it("updates the existing subscription's one line item to the new plan's price, with proration", async () => {
    const retrieve = vi.fn().mockResolvedValue({ items: { data: [{ id: "si_existing_item" }] } });
    const update = vi.fn().mockResolvedValue({});
    getStripeMock.mockReturnValue({ subscriptions: { retrieve, update } });

    const { changePlatformSubscriptionPlan } = await import("./platform-checkout");
    const result = await changePlatformSubscriptionPlan("org-1", "agency", "sub_123");

    expect(result).toEqual({ ok: true });
    expect(retrieve).toHaveBeenCalledWith("sub_123");
    expect(update).toHaveBeenCalledWith("sub_123", {
      items: [{ id: "si_existing_item", price: "price_agency_789" }],
      proration_behavior: "create_prorations",
    });
  });

  it("never calls Checkout or creates anything new — only ever updates the one existing subscription", async () => {
    const retrieve = vi.fn().mockResolvedValue({ items: { data: [{ id: "si_existing_item" }] } });
    const update = vi.fn().mockResolvedValue({});
    const checkoutCreate = vi.fn();
    getStripeMock.mockReturnValue({ subscriptions: { retrieve, update }, checkout: { sessions: { create: checkoutCreate } } });

    const { changePlatformSubscriptionPlan } = await import("./platform-checkout");
    await changePlatformSubscriptionPlan("org-1", "agency", "sub_123");

    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it("refuses without erroring the caller's whole flow when the subscription has no line item", async () => {
    const retrieve = vi.fn().mockResolvedValue({ items: { data: [] } });
    const update = vi.fn();
    getStripeMock.mockReturnValue({ subscriptions: { retrieve, update } });

    const { changePlatformSubscriptionPlan } = await import("./platform-checkout");
    const result = await changePlatformSubscriptionPlan("org-1", "agency", "sub_123");

    expect(result).toEqual({ error: "Your subscription has no billable item to update — contact support." });
    expect(update).not.toHaveBeenCalled();
  });

  it("surfaces a Stripe failure instead of claiming success", async () => {
    const retrieve = vi.fn().mockResolvedValue({ items: { data: [{ id: "si_existing_item" }] } });
    const update = vi.fn().mockRejectedValue(new Error("Stripe is down"));
    getStripeMock.mockReturnValue({ subscriptions: { retrieve, update } });

    const { changePlatformSubscriptionPlan } = await import("./platform-checkout");
    const result = await changePlatformSubscriptionPlan("org-1", "agency", "sub_123");

    expect(result).toEqual({ error: "Failed to change your plan via Stripe — no changes were made." });
  });

  it("refuses when the target plan's price env var isn't configured", async () => {
    delete process.env.STRIPE_PRICE_PLATFORM_AGENCY;
    getStripeMock.mockReturnValue({ subscriptions: { retrieve: vi.fn(), update: vi.fn() } });

    const { changePlatformSubscriptionPlan } = await import("./platform-checkout");
    const result = await changePlatformSubscriptionPlan("org-1", "agency", "sub_123");

    expect("error" in result && result.error).toMatch(/STRIPE_PRICE_PLATFORM_AGENCY/);
  });
});
