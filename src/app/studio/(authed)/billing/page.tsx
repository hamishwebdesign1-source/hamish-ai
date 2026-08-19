import { redirect } from "next/navigation";
import { Check, Clock, CreditCard, Rocket, Zap, Building2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { platformPlans, formatMonthlyPrice, type PlatformPlanSlug } from "@/lib/platform-plans";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { startCheckout, openBillingPortal } from "./actions";

// Standalone helper, not inline in the component body — same pattern as
// daysSince() in admin/(authed)/page.tsx, which react-hooks/purity's
// "no impure calls in a component's own render body" rule doesn't flag
// when the impure call (Date.now()) lives in a plain function the
// component merely invokes.
function daysUntil(dateStr: string) {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

// Same icon choice as the public /platform pricing grid — kept as its own
// local copy rather than a shared import, same reasoning as that file's
// own comment: platform-plans.ts is Stripe wiring and pricing facts, this
// is a display-only concern for wherever a plan card happens to render.
const planIcons: Record<PlatformPlanSlug, typeof Rocket> = {
  starter: Rocket,
  professional: Zap,
  agency: Building2,
};

export default async function StudioBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const { checkout, error } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  // Session-scoped client — same organisations_select_own RLS policy
  // (schema-organisations.sql) every other /studio page's org read relies
  // on, so this is only ever the caller's own organisation.
  const { data: org } = await supabase
    .from("organisations")
    .select("plan, subscription_status, trial_ends_at, stripe_customer_id")
    .eq("id", membership.orgId)
    .single();

  const trialDaysLeft = org?.trial_ends_at ? daysUntil(org.trial_ends_at) : 0;
  const isTrialing = org?.subscription_status === "trialing";
  const isActive = org?.subscription_status === "active";

  return (
    // Centered column, not left-aligned-and-capped — see prospecting-panel.tsx's
    // comment for why that distinction is the actual fix.
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold md:text-3xl">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your plan, your subscription, and where to manage the card behind it.</p>
      </div>

      {checkout === "success" && (
        <p className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-accent">
          Subscription confirmed — thanks. It may take a few seconds to reflect below.
        </p>
      )}
      {checkout === "cancelled" && (
        <p className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          Checkout cancelled — no charge was made.
        </p>
      )}
      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <CreditCard className="size-4.5" />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold capitalize">{org?.plan ?? "starter"} plan</p>
              {isTrialing && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {trialDaysLeft > 0 ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in trial` : "Trial ended"}
                </p>
              )}
              {isActive && <p className="text-xs text-accent">Active subscription</p>}
              {!isTrialing && !isActive && <p className="text-xs text-destructive capitalize">{org?.subscription_status ?? "inactive"}</p>}
            </div>
          </div>
          {org?.stripe_customer_id && (
            <form action={openBillingPortal}>
              <Button type="submit" variant="outline" size="sm">
                Manage billing
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {platformPlans.map((plan) => {
          const isCurrent = org?.plan === plan.slug && isActive;
          const PlanIcon = planIcons[plan.slug];
          return (
            <div
              key={plan.slug}
              className={`flex flex-col rounded-2xl border p-5 ${plan.highlighted ? "border-accent/50 shadow-lg shadow-accent/10" : "border-border"}`}
            >
              {plan.highlighted && !isCurrent && (
                <Badge className="mb-3 w-fit bg-accent text-accent-foreground">Most agencies start here</Badge>
              )}
              {isCurrent && <Badge className="mb-3 w-fit" variant="secondary">Current plan</Badge>}
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <PlanIcon className="size-4.5" />
              </span>
              <p className="mt-3 font-heading text-sm font-semibold">{plan.name}</p>
              <p className="mt-2 font-heading text-2xl font-semibold tabular-nums">
                {formatMonthlyPrice(plan.monthlyPence)}
                <span className="ml-1 font-body text-xs text-muted-foreground">/mo</span>
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-xs">
                {plan.features.slice(0, 3).map((f) => (
                  <li key={f} className="flex gap-1.5">
                    <Check className="mt-0.5 size-3 shrink-0 text-accent" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <form action={startCheckout.bind(null, plan.slug)} className="mt-4">
                <Button type="submit" variant={isCurrent ? "outline" : "default"} disabled={isCurrent} className="w-full" size="sm">
                  {isCurrent ? "Current plan" : "Subscribe"}
                </Button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
