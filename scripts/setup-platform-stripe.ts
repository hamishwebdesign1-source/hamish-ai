// Run once, by hand: npx tsx scripts/setup-platform-stripe.ts
// Same convention as scripts/check-model-selection.ts — loads .env.local
// directly since this runs outside Next.js.
//
// Idempotently creates the Agency Platform's Stripe catalog: one Product
// and one recurring monthly Price per plan in platform-plans.ts. Safe to
// re-run — retrieves the existing Product/Price by a fixed id instead of
// creating a duplicate, same pattern as subscription.ts's
// ensureMaintenanceProduct(). Prints the Price id for each plan; paste
// those into .env.local (and Vercel) under the env var name each plan
// already declares in platform-plans.ts (stripePriceEnvVar) — the
// application code reads the Price id from there, never a hardcoded
// literal, so rotating a price later is an env var change, not a deploy.
//
// Does not touch anything a customer can already do today. This only
// creates catalog objects in your Stripe account; no subscription is
// created against them until the Week 4 checkout flow exists.

import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../.env.local") });

async function main() {
  const Stripe = (await import("stripe")).default;
  const { platformPlans, formatMonthlyPrice } = await import("../src/lib/platform-plans");

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set in .env.local — nothing to do.");
  const stripe = new Stripe(key);

  console.log(`Setting up ${platformPlans.length} Agency Platform plans in Stripe...\n`);

  for (const plan of platformPlans) {
    const productId = `hamishai-platform-${plan.slug}`;

    const product = await stripe.products
      .retrieve(productId)
      .catch(() => stripe.products.create({ id: productId, name: `HamishAI Agency Platform — ${plan.name}` }));

    // Prices are immutable in Stripe once created (the amount can't be
    // edited on an existing Price), so "idempotent" here means "find an
    // existing active monthly GBP price at the right amount for this
    // product, or create one" rather than retrieving by a fixed id the
    // way the Product above does.
    const existing = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    let price = existing.data.find(
      (p) => p.unit_amount === plan.monthlyPence && p.currency === "gbp" && p.recurring?.interval === "month"
    );

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: "gbp",
        unit_amount: plan.monthlyPence,
        recurring: { interval: "month" },
        nickname: plan.name,
      });
    }

    console.log(`${plan.name} (${formatMonthlyPrice(plan.monthlyPence)}/mo)`);
    console.log(`  Product: ${product.id}`);
    console.log(`  Price:   ${price.id}`);
    console.log(`  → paste into .env.local as ${plan.stripePriceEnvVar}=${price.id}\n`);
  }

  console.log("Done. Add the three env vars above to .env.local and Vercel before Week 4's checkout flow needs them.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
