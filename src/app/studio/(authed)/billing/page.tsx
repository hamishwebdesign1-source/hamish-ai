import { redirect } from "next/navigation";
import { Check, Clock, CreditCard, Rocket, Zap, Building2, Sparkles, Gauge, CircleAlert, TrendingUp } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { platformPlans, formatMonthlyPrice, PROSPECT_CREDIT_PACK, type PlatformPlanSlug } from "@/lib/platform-plans";
import { getUsageStatus, USAGE_LABELS, ALL_USAGE_EVENT_TYPES } from "@/lib/usage-limits";
import { computeAiAssistedSignedValue } from "@/lib/studio-ai-roi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/platform/help-tip";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/platform/count-up";
import { startCheckout, openBillingPortal, buyCreditPack } from "./actions";

// Real-improvement pass — usage-limits.ts has always tracked 10 real,
// individually plan-limited actions (getUsageStatus, one real ceiling
// per type), but none of it was ever shown to a tenant anywhere — the
// only way to learn you were close to a limit was to hit it.
//
// Secondary (fair-use) types — everything but prospect_researched, the
// one marketed plan feature shown on its own above these.
const SECONDARY_USAGE_TYPES = ALL_USAGE_EVENT_TYPES.filter((t) => t !== "prospect_researched");

function usageBarColor(status: { used: number; limit: number }): string {
  if (status.limit === 0) return "bg-white/10";
  const pct = status.used / status.limit;
  if (pct >= 1) return "bg-destructive";
  if (pct >= 0.8) return "bg-warning";
  return "bg-accent";
}

// Studio improvement — the bar above already escalates colour at these
// exact thresholds, but that was passive: nothing on this page ever said
// "approaching your limit" in words until the exact month you actually
// hit it (found while grepping every existing usage-limit message — the
// only text warning in the whole app lives one step later, inside
// prospecting-panel.tsx's own DiscoveryResultMessage, which only ever
// renders after a blocked action, not proactively here). Same threshold
// as usageBarColor(), scoped to prospect_researched only — the one
// marketed plan feature this page already treats as primary; the 9
// secondary fair-use ceilings stay bars-only, same as before, since a
// text warning on all 10 would be noise against limits nobody's expected
// to actually approach.
function usageWarningText(status: { used: number; limit: number }): string | null {
  if (status.limit === 0) return null;
  const pct = status.used / status.limit;
  if (pct >= 1) return "Monthly limit reached — extra credits top up automatically below, or upgrade your plan.";
  if (pct >= 0.8) return "Approaching your monthly limit.";
  return null;
}

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
  searchParams: Promise<{ checkout?: string; credits?: string; error?: string }>;
}) {
  const { checkout, credits, error } = await searchParams;

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
    .select("plan, subscription_status, trial_ends_at, stripe_customer_id, purchased_prospect_credits, is_internal")
    .eq("id", membership.orgId)
    .single();

  const trialDaysLeft = org?.trial_ends_at ? daysUntil(org.trial_ends_at) : 0;
  const isTrialing = org?.subscription_status === "trialing";
  const isActive = org?.subscription_status === "active";

  // Real-improvement pass — never computed for HamishAI's own internal
  // org: is_internal genuinely has no plan ceiling (usage-limits.ts's
  // own comment on why), so a "0 of 30" bar here would be showing a
  // limit that doesn't actually apply, not real data.
  //
  // getPlatformPlan() (called inside getUsageStatus()) throws on a slug
  // it doesn't recognise — real risk, found by checking this feature's
  // own robustness after shipping it: a legacy/mistyped org.plan value
  // would otherwise crash this entire page's render, not just the
  // usage section. Validated against the real plan list before ever
  // calling into it, same "never trust a DB value blindly" instinct as
  // everywhere else in this app.
  const orgPlan = (org?.plan ?? "starter") as PlatformPlanSlug;
  const isValidPlan = platformPlans.some((p) => p.slug === orgPlan);
  const showUsage = !org?.is_internal && isValidPlan;
  const [prospectUsage, secondaryUsage] = showUsage
    ? await Promise.all([
        getUsageStatus(membership.orgId, "prospect_researched", orgPlan),
        Promise.all(SECONDARY_USAGE_TYPES.map((type) => getUsageStatus(membership.orgId, type, orgPlan))),
      ])
    : [null, []];

  // BACKLOG.md "AI-assisted signed value" — is_internal orgs ARE included
  // here (unlike showUsage above): this isn't a plan-limit concept, no
  // reason to exclude Hamish's own org the way the usage bars do. Session-
  // scoped, same organisations_select_own-adjacent RLS pattern every other
  // query on this page already relies on — only ever the caller's own org.
  const [{ data: aiRoiClients }, { data: aiRoiProspects }] = await Promise.all([
    supabase.from("clients").select("id, business_name, created_at, source_lead_id").eq("org_id", membership.orgId),
    supabase.from("prospects").select("id, deal_value_pence, sales_kit_generated_at, website_mockup_generated_at").eq("org_id", membership.orgId),
  ]);
  const aiRoi = computeAiAssistedSignedValue(aiRoiClients ?? [], aiRoiProspects ?? [], new Date());

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
      {credits === "success" && (
        <p className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-accent">
          Credits purchased — thanks. It may take a few seconds to reflect below.
        </p>
      )}
      {credits === "cancelled" && (
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

      {/* Real-improvement pass — usage-limits.ts has always tracked 10
          real, individually plan-limited actions, but none of it was
          ever shown to a tenant anywhere: the only way to learn you
          were close to a limit was to hit it mid-task. prospect_researched
          is the one marketed plan feature ("up to N researched prospects
          a month" on the pricing grid below), shown prominently; the
          other 9 are real fair-use ceilings, not marketed numbers, so
          they're secondary. */}
      {/* Same CountUp/Reveal treatment as Command Centre's own stat cards
          (command-centre-stat-cards.tsx) — see reveal.tsx's comment for
          why this is scoped to numeric KPI/usage surfaces specifically,
          not every /studio route. The ratio itself ("X of Y") isn't a
          single CountUp target the way a plain stat card's number is, so
          only the "used" half — the number that actually changes month
          to month — animates; the limit is a static plan fact. */}
      {showUsage && prospectUsage && (
        <Reveal>
          <Card>
            <CardContent>
              <p className="flex items-center gap-1.5 font-heading text-sm font-semibold">
                <Gauge className="size-4 text-accent" />
                Usage this month
                <HelpTip explanation="Real counts from your own account this calendar month, against your plan's real limits. Resets on the 1st. The 9 secondary actions below are generous fair-use ceilings, not marketed plan features — you'd need a genuinely unusual amount of activity to get near them." />
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{USAGE_LABELS.prospect_researched}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    <CountUp value={prospectUsage.used} /> of {prospectUsage.limit}
                    {(org?.purchased_prospect_credits ?? 0) > 0 && ` (+${org?.purchased_prospect_credits} credits)`}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${usageBarColor(prospectUsage)}`}
                    style={{ width: `${Math.min(100, (prospectUsage.used / Math.max(1, prospectUsage.limit)) * 100)}%` }}
                  />
                </div>
                {usageWarningText(prospectUsage) && (
                  <p className={`mt-1.5 flex items-center gap-1 text-xs ${prospectUsage.used >= prospectUsage.limit ? "text-destructive" : "text-warning"}`}>
                    <CircleAlert className="size-3 shrink-0" /> {usageWarningText(prospectUsage)}
                  </p>
                )}
              </div>

              <div className="mt-4 grid gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-2">
                {SECONDARY_USAGE_TYPES.map((type, i) => {
                  const status = secondaryUsage[i];
                  if (!status) return null;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{USAGE_LABELS[type]}</span>
                        <span className="font-mono text-muted-foreground">
                          <CountUp value={status.used} /> / {status.limit}
                        </span>
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                        <div className={`h-full rounded-full ${usageBarColor(status)}`} style={{ width: `${Math.min(100, (status.used / Math.max(1, status.limit)) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {/* BACKLOG.md "AI-assisted signed value" — the answer to what the
          usage card above never says: did any of that AI activity turn
          into a real client. Hidden entirely (not a "0 of 0" empty state)
          when nothing signed this month at all — a bare zero on a feature
          meant to demonstrate value would read as "nothing's working,"
          the opposite of what it's for. When clients did sign but none
          were AI-assisted, that's real, non-fabricated data and stays
          visible ("0 of N").
          UX/UI Director pass (2026-08-31): the visible card title was
          "AI-assisted signed value," which over-promises a £ figure even
          though the £ line below only ever renders when at least one
          AI-assisted client has a recorded deal_value_pence — the common
          case at current real volume is count-only, no £ line at all.
          Renamed the on-page heading to "AI-assisted clients" (always
          true in every render state); the £ line itself still spells out
          "recorded deal value" when it appears, so the "value" framing
          isn't lost, just no longer promised by the title. The underlying
          feature/metric name in BACKLOG.md/DECISIONS.md/studio-ai-roi.ts
          is left as-is — this only changes the literal rendered text. */}
      {aiRoi.signedThisMonth > 0 && (
        <Reveal>
          <Card>
            <CardContent>
              <p className="flex items-center gap-1.5 font-heading text-sm font-semibold">
                <TrendingUp className="size-4 text-accent" />
                AI-assisted clients
                <HelpTip explanation="Counts a client as AI-assisted if you generated a sales kit or website mockup for them before they signed. This shows the AI action happened first — not that it's the reason they signed. Deal value, if recorded, is your own estimate on the prospect, not verified invoiced revenue." />
              </p>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-heading text-2xl font-semibold tabular-nums">
                  <CountUp value={aiRoi.aiAssistedCount} />
                </span>
                <span className="text-sm text-muted-foreground">
                  of {aiRoi.signedThisMonth} client{aiRoi.signedThisMonth === 1 ? "" : "s"} signed this month {aiRoi.aiAssistedCount === 1 ? "was" : "were"} AI-assisted
                </span>
              </div>

              {/* Same CountUp treatment as Command Centre's own "Pipeline
                  value" stat card (command-centre-stat-cards.tsx) — every
                  other £ figure in Studio animates in, this one shouldn't
                  be the one static exception. Still visually secondary to
                  the count above (text-sm vs text-2xl, per this entry's
                  own acceptance criteria — count is the headline because
                  it's real whether or not deal_value_pence adoption is
                  high), just font-medium + tabular-nums now so it reads as
                  a real figure next to the plan-price/stat-card numbers
                  elsewhere on this page, not a caption. */}
              {aiRoi.aiAssistedValuePence !== null && (
                <p className="mt-1.5 text-sm font-medium text-accent tabular-nums">
                  <CountUp value={Math.round(aiRoi.aiAssistedValuePence / 100)} prefix="£" /> in recorded deal value
                </p>
              )}

              {/* UX/UI Director pass (2026-08-31): the honest "0 of N"
                  state (clients signed this month, none AI-assisted) is
                  real data and deliberately not hidden — but rendering
                  just the bare count with nothing else reads as a verdict
                  ("AI added nothing this month") on a page an owner reads
                  right before deciding to renew/upgrade. Adds a muted,
                  actionable line rather than any fabricated positivity —
                  same "no toast, inline text next to the thing" instinct
                  as the rest of Studio's error/empty-state copy, reframing
                  a zero from a dead end into a next action. */}
              {aiRoi.aiAssistedCount === 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  None of this month&apos;s signups had a sales kit or website mockup generated before they signed — do that earlier in your pipeline to start building this number.
                </p>
              )}
            </CardContent>
          </Card>
        </Reveal>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Sparkles className="size-4.5" />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">
                {org?.purchased_prospect_credits ?? 0} extra prospect{org?.purchased_prospect_credits === 1 ? "" : "s"} available
              </p>
              <p className="text-xs text-muted-foreground">
                Hit your monthly limit? Top up any time — used automatically once the monthly allowance runs out.
              </p>
            </div>
          </div>
          <form action={buyCreditPack}>
            <Button type="submit" size="sm">
              +{PROSPECT_CREDIT_PACK.prospects} prospects — £{(PROSPECT_CREDIT_PACK.pricePence / 100).toFixed(0)}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {platformPlans.map((plan) => {
          const isCurrent = org?.plan === plan.slug && isActive;
          const PlanIcon = planIcons[plan.slug];
          // Billing-bug fix (2026-09-01) — startCheckout() (actions.ts)
          // now changes an existing active subscription's price in place
          // rather than creating a second one, so this button's own label
          // needed to stop unconditionally promising "Subscribe" (which
          // reads as "start a new subscription") for a click that's
          // actually a plan change. Compared on price, not plan order in
          // platformPlans — that array's own order already happens to be
          // ascending by price, but comparing the real monthlyPence here
          // is what actually makes that promise true rather than assumed.
          const currentPlan = platformPlans.find((p) => p.slug === org?.plan);
          const switchLabel =
            isActive && currentPlan && plan.monthlyPence > currentPlan.monthlyPence
              ? "Upgrade"
              : isActive && currentPlan && plan.monthlyPence < currentPlan.monthlyPence
                ? "Downgrade"
                : "Subscribe";
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
                  {isCurrent ? "Current plan" : switchLabel}
                </Button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
