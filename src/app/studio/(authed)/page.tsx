import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  UserPlus,
  Megaphone,
  UserCheck2,
  MessageSquareText,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getStudioBriefing } from "@/lib/studio-briefing";
import { computeAgencyHealth, type HealthComponent } from "@/lib/client-health";
import { getStudioAnalytics } from "@/lib/studio-analytics";
import { generateInsights } from "@/lib/studio-insights";
import { leadNeedsFollowUp } from "@/lib/lead-status";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/platform/count-up";
import { AnalyticsChart } from "@/components/platform/analytics-chart";

// Command Centre v2 — a full rebuild of v1's card-grid composition, not a
// restyle of it (see git history for v1: four KPI tiles, a dark Business
// Health card, three separate Actions/Insights/Briefing cards, a
// per-org-configurable block canvas). Direct feedback on v1 was that it
// still read as "a SaaS dashboard displaying metrics" — a fair critique;
// isolating every number in its own card is exactly what makes a page
// feel assembled rather than designed, no matter how each card looks.
//
// The real change here isn't visual, it's architectural: this page used
// to present ~4 separately-computed sections (KPIs / Business Health /
// Actions Required / Insights / Briefing) side by side with no relation
// to each other. Now there is ONE ranked signal list (buildSignals()
// below) that the hero narrative, "What matters now", and "Your next
// move" all read from — so a client's single biggest issue shows up
// once, prominently, everywhere it belongs, instead of the same
// information (or worse, three slightly different versions of it)
// scattered across independent cards that don't know about each other.
//
// Every number and name on this page is still real — no LLM call, no
// invented pattern, same rule studio-insights.ts's own comment already
// established. What changed is that the numbers are now stitched into
// prose and a single prioritised list instead of displayed as isolated
// tiles.
//
// The block canvas (command-centre-layout.ts, Settings -> Command
// Centre layout, command-centre-design-assistant.ts's AI Design
// Assistant) is deliberately NOT rendered by this version — a
// user-reorderable grid of interchangeable stat widgets is the exact
// "assembled, not designed" pattern being moved away from, and doesn't
// compose with a fixed editorial narrative. Nothing was deleted: the
// settings panel and its data still exist, just disconnected from this
// page for now. Flagged to the user as its own decision (remove that
// settings section, repurpose the AI assistant elsewhere, or leave it
// dormant) rather than silently left half-working.

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function relativeTime(iso: string, now: Date): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

type Tone = "attention" | "opportunity";
type Signal = {
  id: string;
  tone: Tone;
  headline: string;
  detail: string;
  actionLabel: string;
  href: string;
  weight: number;
};

const TONE_STYLE: Record<Tone, { dot: string; label: string }> = {
  attention: { dot: "bg-destructive", label: "Needs attention" },
  opportunity: { dot: "bg-accent", label: "Opportunity" },
};

// The one ranked list the hero narrative, "What matters now", and "Your
// next move" all read from — see this file's own top comment for why
// that matters more than any individual card's styling.
//
// Deliberately scoped to real, actionable urgency only (attention:
// something's overdue; opportunity: someone's worth following up on) —
// no "momentum" tone here anymore. That used to independently recompute
// the exact same KPI percentage deltas studio-insights.ts's
// generateInsights() already computes for "AI observations" below, which
// caused the same real number ("New prospects up X% this month") to
// appear in two or three places on the page at once — confirmed by
// tracing the actual weight math, not assumed: a single big percentage
// swing (weight 20+pct, so 100%+ swings score 120+) could genuinely
// outrank a real open client request (weight 100+count) for the
// top-signal slot, which is backwards — a positive trend should never
// outrank something a client is actually waiting on. Trend/momentum
// commentary now lives in exactly one place (AI observations); this
// list only ever surfaces things that need a decision.
function buildSignals(params: {
  openRequestCount: number;
  overdueProjectCount: number;
  followUpCount: number;
  topOpportunity: { businessName: string; overallScore: number } | null;
}): Signal[] {
  const { openRequestCount, overdueProjectCount, followUpCount, topOpportunity } = params;
  const signals: Signal[] = [];

  if (openRequestCount > 0) {
    signals.push({
      id: "requests",
      tone: "attention",
      headline: `${openRequestCount} client request${openRequestCount === 1 ? " is" : "s are"} waiting for your response`,
      detail: "The longer a request sits, the more it looks like nobody's driving.",
      actionLabel: "Respond",
      href: "/studio/requests",
      weight: 100 + openRequestCount,
    });
  }
  if (overdueProjectCount > 0) {
    signals.push({
      id: "projects",
      tone: "attention",
      headline: `${overdueProjectCount} project${overdueProjectCount === 1 ? " is" : "s are"} past its target date`,
      detail: "Worth a status update to the client either way, even if the news is just a new date.",
      actionLabel: "Review",
      href: "/studio/projects",
      weight: 95 + overdueProjectCount,
    });
  }
  if (followUpCount > 0) {
    signals.push({
      id: "followups",
      tone: "opportunity",
      headline: `${followUpCount} prospect${followUpCount === 1 ? " hasn't" : "s haven't"} been contacted recently`,
      detail: "Interest fades fast — a same-week follow-up converts meaningfully better than a two-week-later one.",
      actionLabel: "View prospects",
      href: "/studio/prospects",
      weight: 60 + followUpCount,
    });
  }
  if (topOpportunity) {
    signals.push({
      id: "top-opportunity",
      tone: "opportunity",
      headline: `${topOpportunity.businessName} is showing strong potential (${topOpportunity.overallScore}/5)`,
      detail: "Your highest-scored researched prospect right now.",
      actionLabel: "View prospects",
      href: "/studio/prospects",
      weight: 55,
    });
  }
  return signals.sort((a, b) => b.weight - a.weight);
}

// The hero paragraph — deliberately assembled from short, independently-
// true clauses rather than one template string, so a new org with no
// activity yet still reads as a coherent (if quiet) sentence rather than
// a broken mad-lib with zeroes in it.
function buildBriefing(params: {
  orgName: string;
  prospectsThisWeek: number;
  clientsThisPeriod: number;
  topSignal: Signal | null;
  prospectCount: number;
  clientCount: number;
}): string {
  const { prospectsThisWeek, clientsThisPeriod, topSignal, prospectCount, clientCount } = params;

  const clauses: string[] = [];
  if (prospectsThisWeek > 0 && clientsThisPeriod > 0) {
    clauses.push(
      `You generated ${prospectsThisWeek} new prospect${prospectsThisWeek === 1 ? "" : "s"} this week and converted ${clientsThisPeriod} into a client${clientsThisPeriod === 1 ? "" : "s"}.`
    );
  } else if (prospectsThisWeek > 0) {
    clauses.push(`You generated ${prospectsThisWeek} new prospect${prospectsThisWeek === 1 ? "" : "s"} this week.`);
  } else if (clientsThisPeriod > 0) {
    clauses.push(`You converted ${clientsThisPeriod} new client${clientsThisPeriod === 1 ? "" : "s"} this week.`);
  } else if (prospectCount > 0 || clientCount > 0) {
    clauses.push(`You're currently tracking ${prospectCount} prospect${prospectCount === 1 ? "" : "s"} and ${clientCount} client${clientCount === 1 ? "" : "s"}.`);
  } else {
    clauses.push("Your pipeline is empty right now — that's the first thing worth fixing.");
  }

  if (topSignal) {
    const lead = topSignal.tone === "attention" ? "Your biggest priority right now" : "Your biggest opportunity right now";
    clauses.push(`${lead} is ${topSignal.headline.charAt(0).toLowerCase()}${topSignal.headline.slice(1)}.`);
  }

  return clauses.join(" ");
}

const HEALTH_LABEL_HREF: Record<string, string> = {
  "Client sites uptime": "/studio/clients",
  "Client payments on time": "/studio/clients",
  "Delivery completed": "/studio/projects",
  "Requests moving": "/studio/requests",
  "Pipeline conversion": "/studio/prospects",
};

function pulseLabel(score: number): string {
  if (score >= 75) return "Healthy";
  if (score >= 50) return "Steady";
  return "Needs attention";
}

function strongestAndWeakest(components: HealthComponent[]): { strongest: HealthComponent; weakest: HealthComponent } | null {
  if (components.length < 2) return null;
  const sorted = [...components].sort((a, b) => b.value - a.value);
  return { strongest: sorted[0], weakest: sorted[sorted.length - 1] };
}

export default async function StudioHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const { data: org } = await supabase
    .from("organisations")
    .select("name, plan, prospecting_config, is_internal, stripe_connect_charges_enabled")
    .eq("id", membership.orgId)
    .single();

  const config = (org?.prospecting_config ?? {}) as { agencyType?: string; services?: string[] };
  const briefing = await getStudioBriefing(supabase, membership.orgId);

  const [{ count: prospectCount }, { data: clients }, { data: activeProspects }, { count: emailConnectionCount }, { data: recentProspects }, { data: campaigns }] =
    await Promise.all([
      supabase.from("prospects").select("id", { count: "exact", head: true }).eq("org_id", membership.orgId),
      supabase.from("clients").select("id, business_name, created_at").eq("org_id", membership.orgId),
      // Broader than v1's activeDeals: every non-converted/lost prospect,
      // not just ones with a deal value, so the same query can both sum
      // real pipeline value AND identify who's actually due a follow-up
      // (leadNeedsFollowUp needs contacted_at/last_contact_method/
      // replied_at, not just deal_value_pence).
      supabase
        .from("prospects")
        .select("business_name, status, contacted_at, last_contact_method, replied_at, deal_value_pence")
        .eq("org_id", membership.orgId)
        .not("status", "in", "(converted,lost)"),
      supabase.from("email_connections").select("id", { count: "exact", head: true }).eq("org_id", membership.orgId),
      // Activity stream, real rows this time (v1's prospectCount above is
      // a head-count-only query and can't name anything).
      supabase.from("prospects").select("id, business_name, created_at").eq("org_id", membership.orgId).order("created_at", { ascending: false }).limit(6),
      supabase.from("campaigns").select("id, name, created_at").eq("org_id", membership.orgId).order("created_at", { ascending: false }).limit(4),
    ]);

  const clientCount = clients?.length ?? 0;
  const clientIds = (clients ?? []).map((c) => c.id);
  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.business_name as string]));

  const [{ data: requests }, { data: invoices }, { data: siteChecks }, { data: projects }] = clientIds.length
    ? await Promise.all([
        supabase.from("requests").select("id, client_id, status, responded_at, created_at").in("client_id", clientIds),
        supabase.from("invoices").select("status, due_date, paid_at").in("client_id", clientIds),
        supabase.from("site_checks").select("uptime_ok").in("client_id", clientIds),
        supabase.from("projects").select("status, target_date").in("client_id", clientIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await supabase.from("tasks").select("id, request_id, status").in("request_id", requestIds)
    : { data: [] };

  const openRequestCount = (requests ?? []).filter((r) => !r.responded_at).length;
  const pipelineValuePence = (activeProspects ?? []).reduce((sum, p) => sum + (p.deal_value_pence ?? 0), 0);

  const agencyHealth = computeAgencyHealth({
    requests: requests ?? [],
    tasks: tasks ?? [],
    invoices: invoices ?? [],
    siteChecks: siteChecks ?? [],
    prospectCount: prospectCount ?? 0,
    clientCount,
  });

  const today = todayIso();
  const overdueProjectCount = (projects ?? []).filter((p) => p.status === "active" && p.target_date && p.target_date < today).length;

  // Named, valued follow-up targets — the same leadNeedsFollowUp() rule
  // studio-briefing.ts's followUpsDue count already uses, just kept as
  // real rows here (not just a number) so "Your next move" can name
  // them and total their real pipeline value instead of a generic count.
  const followUpTargets = (activeProspects ?? [])
    .filter((p) => leadNeedsFollowUp(p))
    .sort((a, b) => (b.deal_value_pence ?? 0) - (a.deal_value_pence ?? 0));
  const followUpValuePence = followUpTargets.reduce((sum, p) => sum + (p.deal_value_pence ?? 0), 0);

  const analytics = await getStudioAnalytics(supabase, membership.orgId, "30d");
  const insights = generateInsights(analytics, agencyHealth, overdueProjectCount);

  const signals = buildSignals({
    openRequestCount,
    overdueProjectCount,
    followUpCount: briefing.followUpsDue,
    topOpportunity: briefing.topOpportunity,
  });
  const topSignal = signals[0] ?? null;

  const newClientsThisWeek = analytics.kpis.find((k) => k.label === "New clients")?.value ?? 0;
  const briefingText = buildBriefing({
    orgName: org?.name ?? "your agency",
    prospectsThisWeek: briefing.newThisWeek,
    clientsThisPeriod: newClientsThisWeek,
    topSignal,
    prospectCount: prospectCount ?? 0,
    clientCount,
  });

  const pulse = strongestAndWeakest(agencyHealth.components);

  // Activity stream — real rows from four tables, merged and sorted by
  // timestamp. No new "activity log" table: every event here already
  // has a real created_at somewhere, this just reads them together.
  const activityEvents = [
    ...(recentProspects ?? []).map((p) => ({ id: `p-${p.id}`, at: p.created_at, icon: UserPlus, label: `New prospect discovered: ${p.business_name}` })),
    ...(clients ?? []).map((c) => ({ id: `c-${c.id}`, at: c.created_at, icon: UserCheck2, label: `${c.business_name} became a client` })),
    ...(requests ?? []).map((r) => ({ id: `r-${r.id}`, at: r.created_at, icon: MessageSquareText, label: `Request received from ${clientNameById.get(r.client_id) ?? "a client"}` })),
    ...(campaigns ?? []).map((camp) => ({ id: `camp-${camp.id}`, at: camp.created_at, icon: Megaphone, label: `Campaign "${camp.name}" created` })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 7);

  const stripeReady = Boolean(org?.is_internal || org?.stripe_connect_charges_enabled);
  const checklist = [
    { label: "Run your first discovery search", done: (prospectCount ?? 0) > 0, href: "/studio/prospects" },
    { label: "Connect your inbox for reply detection", done: (emailConnectionCount ?? 0) > 0, href: "/studio/settings" },
    { label: "Convert your first prospect into a client", done: clientCount > 0, href: "/studio/prospects" },
    { label: "Connect Stripe to invoice clients", done: stripeReady, href: "/studio/settings" },
  ];
  const checklistComplete = checklist.every((item) => item.done);

  const opportunitiesInPipeline = briefing.readyToContact;
  const conversionPct = prospectCount && prospectCount > 0 ? Math.round((clientCount / (prospectCount ?? 1)) * 100) : null;

  // Explicit hierarchy this composition is built around (not implemented
  // implicitly and hoped for):
  //   L1 Orientation  — identity + hero sentence. Largest type, tightest
  //                     internal spacing (they're one unit), no border.
  //   L2 Understanding — Business Pulse: the single number that answers
  //                     "what's the state of my business". No border
  //                     from L1 — still the same "getting oriented" beat.
  //   L3 Insight      — What matters now (signals #2+; #1 lives in L4
  //                     so it's never shown twice). Denser rows, smaller
  //                     type than L1/L2 — supporting, not primary.
  //   L4 Action       — Your next move (signal #1, full detail). The
  //                     first real border: orientation/understanding is
  //                     over, this is a deliberate "now decide" beat.
  //   L5 Performance  — Growth. Medium density.
  //   L6 Detail       — AI observations + Activity, side by side on
  //                     large screens (two peer-weight lists, the one
  //                     asymmetric break in an otherwise single-column
  //                     page). Highest density, smallest type.
  //   L7 Utilities    — Getting set up + services. Grouped tight against
  //                     each other (both are the same low tier), pushed
  //                     the furthest from everything above, most muted.
  const secondarySignals = signals.slice(1, 4);

  return (
    <div className="max-w-4xl">
      {/* L1 — Orientation. Identity and headline are one tight unit
          (mt-2, not the mt-3+ used everywhere else): the brief's own
          "75 / Business Health should feel like one unit" principle
          applied to the page's own opening line. Constrained to max-w-2xl
          inside the wider max-w-4xl page — the asymmetry keeps the prose
          at a comfortable reading width while leaving Pulse/Growth/
          Activity below room to actually use the page's width. */}
      <p className="font-mono text-xs font-medium tracking-[0.15em] text-accent uppercase">
        {timeOfDayGreeting()}, {org?.name ?? "your agency"}
      </p>
      <h1 className="mt-2 max-w-2xl font-heading text-4xl leading-[1.1] font-semibold text-balance md:text-5xl">{briefingText}</h1>

      {/* L2 — Understanding. No border, no eyebrow-to-number gap beyond
          the "one unit" rule: number and label sit close, exactly the
          brief's own tight-spacing example, then the bars (component
          spacing) and the sentence explaining them (component spacing).
          Pulse's own number is text-3xl, not 4xl — at the base (mobile)
          size those two rendered identically (both 4xl until the hero's
          own md:text-5xl kicked in), so the "one notch down" this
          comment claims wasn't actually true below the md breakpoint.
          Now genuinely one clear step down at every width, so the
          headline reads as the obvious anchor rather than competing
          with the score for attention. */}
      {agencyHealth.healthScore !== null && (
        <div className="mt-10 max-w-xl">
          <div className="flex items-baseline gap-2.5">
            <span className="font-heading text-3xl font-semibold tabular-nums">
              <CountUp value={agencyHealth.healthScore} />
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              Business Pulse · {pulseLabel(agencyHealth.healthScore)}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {agencyHealth.components.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-xs text-muted-foreground">{c.label}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${c.value}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{c.value}%</span>
              </div>
            ))}
          </div>

          {pulse && (
            <p className="mt-3 text-sm text-muted-foreground">
              Strongest: <span className="font-medium text-foreground">{pulse.strongest.label.toLowerCase()}</span>. Opportunity:{" "}
              <span className="font-medium text-foreground">{pulse.weakest.label.toLowerCase()}</span>
              {HEALTH_LABEL_HREF[pulse.weakest.label] && (
                <>
                  {" — "}
                  <Link href={HEALTH_LABEL_HREF[pulse.weakest.label]} className="font-medium text-accent">
                    improve this
                  </Link>
                </>
              )}
              .
            </p>
          )}
        </div>
      )}

      {/* L3 — Insight. Signal #1 is deliberately excluded (it owns L4
          below) so the same headline never appears twice on the page.
          Rows are noticeably denser than L1/L2 — tight py-2.5, no
          hover-reveal action label eating vertical rhythm, the detail
          line kept to a single truncated line — this is a scan list,
          not a second hero. */}
      {secondarySignals.length > 0 && (
        <div className="mt-9 max-w-xl">
          <p className="text-eyebrow">Also worth knowing</p>
          <ul className="mt-2 divide-y divide-border/60">
            {secondarySignals.map((s) => (
              <li key={s.id}>
                <Link href={s.href} className="group flex items-center gap-3 py-2.5">
                  <span className={`size-1.5 shrink-0 rounded-full ${TONE_STYLE[s.tone].dot}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground group-hover:text-accent">{s.headline}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* L4 — Action. The first real border on the page: everything
          above was "understand the situation", this is "now decide" —
          spacing alone wouldn't carry that break clearly enough. Large
          type again, matching L1's weight — this and the hero sentence
          are the page's two intended anchors, per the brief's own
          "Anchor 1 / Anchor 3" framing. */}
      {(followUpTargets.length > 0 || topSignal) && (
        <section className="mt-12 max-w-xl border-t border-border/60 pt-8">
          <p className="text-eyebrow">Your next move</p>
          {followUpTargets.length > 0 ? (
            <>
              <p className="mt-3 font-heading text-2xl leading-tight font-semibold text-balance">
                Follow up with {followUpTargets.length} high-potential prospect{followUpTargets.length === 1 ? "" : "s"}
                {followUpTargets[0]?.business_name && followUpTargets.length <= 2
                  ? ` — ${followUpTargets.map((p) => p.business_name).join(" and ")}`
                  : followUpTargets[0]?.business_name
                    ? `, starting with ${followUpTargets[0].business_name}`
                    : ""}
              </p>
              {followUpValuePence > 0 && (
                <p className="mt-1 font-mono text-sm text-accent">
                  Potential pipeline: <CountUp value={Math.round(followUpValuePence / 100)} prefix="£" />
                </p>
              )}
              <p className="mt-2.5 flex items-start gap-2 text-sm text-muted-foreground">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" />
                Interest fades fast — a follow-up now converts far better than one in two weeks.
              </p>
              <Button variant="outline" className="mt-4" render={<Link href="/studio/prospects" />}>
                Review prospects
                <ArrowRight className="size-4" />
              </Button>
            </>
          ) : topSignal ? (
            <>
              <p className="mt-3 font-heading text-2xl leading-tight font-semibold text-balance">{topSignal.headline}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{topSignal.detail}</p>
              <Button variant="outline" className="mt-4" render={<Link href={topSignal.href} />}>
                {topSignal.actionLabel}
                <ArrowRight className="size-4" />
              </Button>
            </>
          ) : null}
        </section>
      )}

      {/* L5 — Performance. A genuinely new topic (not "the situation"
          anymore, "how the business is trending") — border earned, not
          decorative. Real empty state for a genuinely new org instead
          of a hollow "0 -> 0 -> 0". */}
      <section className="mt-16 border-t border-border/60 pt-9">
        <p className="text-eyebrow">Growth</p>
        {(prospectCount ?? 0) === 0 && clientCount === 0 ? (
          <>
            <p className="mt-3 font-heading text-xl font-semibold">Your pipeline starts here.</p>
            <p className="mt-1.5 text-sm text-muted-foreground">You haven&apos;t found any prospects yet.</p>
            <Button className="mt-4" render={<Link href="/studio/prospects" />}>
              Find your first prospects
              <ArrowRight className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="font-heading text-3xl font-semibold tabular-nums">
                <CountUp value={prospectCount ?? 0} />
              </span>
              <span className="text-sm text-muted-foreground">prospects</span>
              <ArrowRight className="mx-1 size-4 text-muted-foreground/50" />
              <span className="font-heading text-3xl font-semibold tabular-nums">
                <CountUp value={opportunitiesInPipeline} />
              </span>
              <span className="text-sm text-muted-foreground">opportunities</span>
              <ArrowRight className="mx-1 size-4 text-muted-foreground/50" />
              <span className="font-heading text-3xl font-semibold tabular-nums">
                <CountUp value={clientCount} />
              </span>
              <span className="text-sm text-muted-foreground">clients</span>
              {conversionPct !== null && (
                <span className="ml-2 rounded-full bg-accent/10 px-2.5 py-1 font-mono text-xs font-semibold text-accent">{conversionPct}% conversion</span>
              )}
            </div>
            {pipelineValuePence > 0 && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                Worth <CountUp value={Math.round(pipelineValuePence / 100)} prefix="£" /> in active pipeline right now.
              </p>
            )}
            {analytics.prospectsSeries.some((p) => p.value > 0) && (
              // Full page width, not max-w-xl — squeezed into the same
              // narrow column as the prose above it, a real chart (with
              // a labelled axis and an interactive tooltip — it already
              // has both, see analytics-chart.tsx) reads as an
              // afterthought next to genuinely oversized headline type.
              // Taller too (200, was 140) for the same reason: enough
              // room for its own axis labels to actually sit clearly
              // rather than crowd the plot area.
              <div className="mt-6">
                <p className="text-sm text-muted-foreground">Prospects found, last 30 days</p>
                <AnalyticsChart series={analytics.prospectsSeries} kind="area" format="count" height={200} emptyMessage="No data in this period yet." />
              </div>
            )}
          </>
        )}
      </section>

      {/* L6 — Detail. The one asymmetric break in an otherwise single
          narrow column: two peer-weight lists (AI observations, real
          activity) sit side by side on large screens where there's
          width to spare, stacked on anything smaller. Highest density
          on the page: tight rows, small type, per the brief's own
          "high density for activity/recent events" guidance. */}
      {(insights.length > 0 || activityEvents.length > 0) && (
        <section className="mt-16 border-t border-border/60 pt-9">
          <div className="grid gap-10 lg:grid-cols-2">
            {insights.length > 0 && (
              <div>
                <p className="text-eyebrow">AI observations</p>
                <ul className="mt-3 space-y-3">
                  {insights.map((insight) => (
                    <li key={insight.id} className="flex items-start gap-2.5">
                      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" />
                      <div className="min-w-0">
                        <p className="text-[13px] leading-snug font-medium">{insight.headline}</p>
                        <p className="text-[12px] text-muted-foreground">{insight.evidence}</p>
                        {insight.action && (
                          <Link href={insight.action.href} className="text-[12px] text-accent underline underline-offset-2">
                            {insight.action.label}
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activityEvents.length > 0 && (
              <div>
                <p className="text-eyebrow">Activity</p>
                <ul className="mt-3 space-y-2.5">
                  {activityEvents.map((e) => (
                    <li key={e.id} className="flex items-center gap-2.5">
                      <e.icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-[13px]">{e.label}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{relativeTime(e.at, new Date())}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* L7 — Utilities. The furthest gap on the page (this is the
          least important content), and the two sections sit close to
          each other (mt-4 between them, not a full section gap) since
          they're peers in the same lowest tier, not two distinct topics. */}
      {!checklistComplete && (
        <section className="mt-20 border-t border-border/60 pt-6">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Getting set up</p>
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 text-sm ${item.done ? "text-muted-foreground" : "text-foreground hover:text-accent"}`}
                >
                  {item.done ? (
                    <CheckCircle2 className="size-3.5 shrink-0 text-accent" />
                  ) : (
                    <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className={item.done ? "line-through" : ""}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {config.services && config.services.length > 0 && (
        // Same lowest tier as "Getting set up" above — grouped close to
        // it (mt-4, no border) when both show, since they're peers, not
        // two distinct topics. Only takes on that section's own mt-20
        // border-t treatment when the checklist has already disappeared
        // (checklistComplete) and this becomes the first utility item.
        <section className={checklistComplete ? "mt-20 border-t border-border/60 pt-6 pb-4" : "mt-4 pb-4"}>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">What you&apos;re set up to sell</p>
          <ul className="mt-3 space-y-2 text-sm">
            {config.services.map((service) => (
              <li key={service} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="size-3.5 shrink-0 text-accent" />
                {service}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
