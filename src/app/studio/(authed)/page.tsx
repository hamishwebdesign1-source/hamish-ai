import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Search,
  Users,
  CreditCard,
  CheckCircle2,
  Circle,
  Lightbulb,
  ArrowRight,
  Mail,
  TrendingUp,
  Sparkles,
  Send,
  BellRing,
  Inbox,
  PoundSterling,
  Activity,
  AlertTriangle,
  FolderClock,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getStudioBriefing } from "@/lib/studio-briefing";
import { computeAgencyHealth } from "@/lib/client-health";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/eyebrow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Pulled out of the component body, same reasoning as clients/page.tsx's
// thirtyDaysAgoIso() — react-hooks/purity flags a current-time read
// called directly during a component's own render, even a Server
// Component's. A coarse UK-hours greeting, not a per-viewer-timezone one
// — every real tenant so far is a UK business, and the gap between server
// time and Europe/London is at most an hour, not worth the complexity of
// a client-side clock for a "good morning" line.
function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Command Centre (Phase 1 of the Studio Command Centre plan) — the end of
// the onboarding journey, reframed around "what do I need to know and do
// right now" rather than a static welcome screen. Business Health,
// Actions Required, and the briefing all read real platform data; nothing
// here is fabricated or illustrative.
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
  const hasBriefingContent = briefing.newThisWeek > 0 || briefing.needsResearch > 0 || briefing.readyToContact > 0;

  const [{ count: prospectCount }, { data: clients }, { data: activeDeals }, { count: emailConnectionCount }] = await Promise.all([
    supabase.from("prospects").select("id", { count: "exact", head: true }).eq("org_id", membership.orgId),
    supabase.from("clients").select("id").eq("org_id", membership.orgId),
    // Pipeline value — a tenant's own optional estimate per prospect
    // (deal_value_pence, schema-prospect-pipeline.sql), summed client-side
    // over anything still active (not yet won or lost). Never AI-estimated,
    // same reasoning as updateProspectDealValue()'s own comment.
    supabase
      .from("prospects")
      .select("deal_value_pence")
      .eq("org_id", membership.orgId)
      .not("status", "in", "(converted,lost)")
      .not("deal_value_pence", "is", null),
    supabase.from("email_connections").select("id", { count: "exact", head: true }).eq("org_id", membership.orgId),
  ]);
  const clientCount = clients?.length ?? 0;
  const clientIds = (clients ?? []).map((c) => c.id);

  // Business Health + Actions Required both need real rows (not just
  // counts) across every client — same shape of query clients/page.tsx
  // already runs per-client, just aggregated across the whole org here.
  const [{ data: requests }, { data: invoices }, { data: siteChecks }, { data: projects }] = clientIds.length
    ? await Promise.all([
        supabase.from("requests").select("id, client_id, status, responded_at").in("client_id", clientIds),
        supabase.from("invoices").select("status, due_date, paid_at").in("client_id", clientIds),
        supabase.from("site_checks").select("uptime_ok").in("client_id", clientIds),
        supabase.from("projects").select("status, target_date").in("client_id", clientIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: []}];

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await supabase.from("tasks").select("id, request_id, status").in("request_id", requestIds)
    : { data: [] };

  const openRequestCount = (requests ?? []).filter((r) => !r.responded_at).length;
  const conversionRate = prospectCount && prospectCount > 0 ? `${Math.round((clientCount / prospectCount) * 100)}%` : "—";
  const pipelineValuePence = (activeDeals ?? []).reduce((sum, p) => sum + (p.deal_value_pence ?? 0), 0);

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

  // Actions Required (Command Centre Phase 1) — the genuinely urgent
  // subset of what used to be scattered across the checklist, the
  // briefing, and the Requests page's own count, gathered in one place.
  // Only real, only shown when non-zero — no "0 actions required" noise.
  const actionsRequired = [
    { count: briefing.followUpsDue, label: "follow-up", href: "/studio/prospects", icon: BellRing },
    { count: overdueProjectCount, label: "overdue project", href: "/studio/projects", icon: FolderClock },
    { count: openRequestCount, label: "request awaiting your reply", href: "/studio/requests", icon: Inbox },
  ].filter((a) => a.count > 0);

  // Onboarding checklist (P1 platform readiness item) — four real,
  // independently checkable states, not a fixed "step 1 of 5" wizard
  // that could drift out of sync with what's actually true. Only shown
  // while incomplete: a permanently-visible "you're all set up" card
  // past this point would just be clutter on every future visit.
  const stripeReady = Boolean(org?.is_internal || org?.stripe_connect_charges_enabled);
  const checklist = [
    { label: "Run your first discovery search", done: (prospectCount ?? 0) > 0, href: "/studio/prospects" },
    { label: "Connect your inbox for reply detection", done: (emailConnectionCount ?? 0) > 0, href: "/studio/settings" },
    { label: "Convert your first prospect into a client", done: clientCount > 0, href: "/studio/prospects" },
    { label: "Connect Stripe to invoice clients", done: stripeReady, href: "/studio/settings" },
  ];
  const checklistComplete = checklist.every((item) => item.done);

  return (
    <div>
      <Eyebrow>Command Centre</Eyebrow>
      <h1 className="mt-3 font-heading text-2xl font-semibold md:text-3xl">
        {timeOfDayGreeting()}, {org?.name ?? "your agency"}.
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Find prospects, convert them into clients, and manage your subscription — all from here.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Badge variant="secondary">{config.agencyType ?? "Agency"}</Badge>
        <Badge variant="secondary" className="capitalize">{org?.plan ?? "starter"} plan</Badge>
      </div>

      {/* Business Health (Command Centre Phase 1) — the same real,
          no-fabrication computation client-health.ts already uses per
          client, aggregated across the whole agency. Sits first among the
          stat cards, sized to stand out, not just another number in the
          row. */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Activity className="size-4.5" />
              </span>
              <p className="text-xs font-semibold text-muted-foreground">Business Health</p>
            </div>
            {agencyHealth.healthScore === null ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Not enough data yet — this fills in once you have clients with real requests, invoices, or projects.
              </p>
            ) : (
              <>
                <p className="mt-2 font-heading text-3xl font-semibold tabular-nums">
                  {agencyHealth.healthScore}
                  <span className="text-lg text-muted-foreground">/100</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {agencyHealth.components.map((c) => (
                    <span key={c.label} className="font-mono text-[10px] text-muted-foreground">
                      {c.label} <span className="text-foreground">{c.value}%</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Search className="size-5" />
            </span>
            <div>
              <p className="font-heading text-2xl font-semibold tabular-nums">{prospectCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Prospects found</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Users className="size-5" />
            </span>
            <div>
              <p className="font-heading text-2xl font-semibold tabular-nums">{clientCount}</p>
              <p className="text-xs text-muted-foreground">Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <TrendingUp className="size-5" />
            </span>
            <div>
              <p className="font-heading text-2xl font-semibold tabular-nums">{conversionRate}</p>
              <p className="text-xs text-muted-foreground">Conversion rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <PoundSterling className="size-5" />
            </span>
            <div>
              <p className="font-heading text-2xl font-semibold tabular-nums">
                {pipelineValuePence > 0 ? `£${Math.round(pipelineValuePence / 100).toLocaleString("en-GB")}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Pipeline value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Required (Command Centre Phase 1) — the urgent subset,
          gathered from three previously-scattered sources (follow-up
          cadence, project deadlines, unresponded requests). Only rendered
          when something real is actually due. */}
      {actionsRequired.length > 0 && (
        <Card className="mt-6 border-destructive/30">
          <CardContent>
            <p className="flex items-center gap-1.5 font-heading text-sm font-semibold">
              <AlertTriangle className="size-4 shrink-0 text-destructive" /> Actions required
            </p>
            <ul className="mt-3 space-y-2">
              {actionsRequired.map((a) => (
                <li key={a.label}>
                  <Link href={a.href} className="flex items-center gap-2 text-sm hover:text-accent">
                    <a.icon className="size-4 shrink-0 text-destructive" />
                    <span className="font-mono font-semibold text-destructive">{a.count}</span>
                    <span className="text-muted-foreground">
                      {a.label}
                      {a.count === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!checklistComplete && (
        <Card className="mt-6">
          <CardContent>
            <p className="font-heading text-sm font-semibold">Getting set up</p>
            <ul className="mt-3 space-y-2">
              {checklist.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 text-sm ${item.done ? "text-muted-foreground" : "text-foreground hover:text-accent"}`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-accent" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={item.done ? "line-through" : ""}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {hasBriefingContent && (
        <Card className="mt-6">
          <CardContent>
            <p className="font-heading text-sm font-semibold">Your briefing</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              {briefing.newThisWeek > 0 && (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 shrink-0 text-accent" />
                  <span className="font-mono font-semibold text-accent">{briefing.newThisWeek}</span>
                  <span className="text-muted-foreground">new this week</span>
                </span>
              )}
              {briefing.needsResearch > 0 && (
                <span className="flex items-center gap-1.5">
                  <Search className="size-3.5 shrink-0 text-accent" />
                  <span className="font-mono font-semibold text-accent">{briefing.needsResearch}</span>
                  <span className="text-muted-foreground">still need research</span>
                </span>
              )}
              {briefing.readyToContact > 0 && (
                <span className="flex items-center gap-1.5">
                  <Send className="size-3.5 shrink-0 text-accent" />
                  <span className="font-mono font-semibold text-accent">{briefing.readyToContact}</span>
                  <span className="text-muted-foreground">ready to contact</span>
                </span>
              )}
            </div>
            {briefing.topOpportunity && (
              <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                  <Lightbulb className="size-3.5 shrink-0" />
                  Your best opportunity right now
                </p>
                <p className="mt-1 text-sm font-medium">
                  {briefing.topOpportunity.businessName}{" "}
                  <span className="font-mono text-xs font-normal text-muted-foreground">({briefing.topOpportunity.overallScore}/5)</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{briefing.topOpportunity.pursueBecause}</p>
              </div>
            )}
            <Button variant="link" size="sm" className="mt-3 h-auto px-0" render={<Link href="/studio/prospects" />}>
              View all prospects
              <ArrowRight className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {config.services && config.services.length > 0 && (
        <Card className="mt-6">
          <CardContent>
            <p className="font-heading text-sm font-semibold">What you&apos;re set up to sell</p>
            <ul className="mt-3 space-y-2 text-sm">
              {config.services.map((service) => (
                <li key={service} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="size-3.5 shrink-0 text-accent" />
                  {service}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/studio/prospects" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center transition-colors hover:bg-accent/10">
          <Search className="mx-auto size-5 text-accent" />
          <p className="mt-2 font-heading text-sm font-semibold">Prospecting</p>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-accent uppercase">Ready</p>
        </Link>
        <Link href="/studio/clients" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center transition-colors hover:bg-accent/10">
          <Users className="mx-auto size-5 text-accent" />
          <p className="mt-2 font-heading text-sm font-semibold">Client management</p>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-accent uppercase">Ready</p>
        </Link>
        <Link href="/studio/requests" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center transition-colors hover:bg-accent/10">
          <Inbox className="mx-auto size-5 text-accent" />
          <p className="mt-2 font-heading text-sm font-semibold">Requests</p>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-accent uppercase">Ready</p>
        </Link>
        <Link href="/studio/billing" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center transition-colors hover:bg-accent/10">
          <CreditCard className="mx-auto size-5 text-accent" />
          <p className="mt-2 font-heading text-sm font-semibold">Billing</p>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-accent uppercase">Ready</p>
        </Link>
        <Link href="/studio/settings" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center transition-colors hover:bg-accent/10">
          <Mail className="mx-auto size-5 text-accent" />
          <p className="mt-2 font-heading text-sm font-semibold">Integrations</p>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-accent uppercase">Ready</p>
        </Link>
      </div>
    </div>
  );
}
