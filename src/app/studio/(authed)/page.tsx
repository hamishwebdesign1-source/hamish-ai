import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Users, CreditCard, CheckCircle2, Lightbulb, ArrowRight, Mail } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getStudioBriefing } from "@/lib/studio-briefing";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/eyebrow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// The end of the onboarding journey (Section 5, step 6 — "workspace
// generated"). Prospecting, client management, billing and integrations
// are all real past this confirmation screen. The "Reporting" tile that
// used to sit here as a "Coming soon" placeholder is gone — the stats row
// above is a real, honest first version of it (actual counts, not the
// homepage's illustrative marketing numbers), not a promise of something
// not built yet.
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
    .select("name, plan, prospecting_config")
    .eq("id", membership.orgId)
    .single();

  const config = (org?.prospecting_config ?? {}) as { agencyType?: string; services?: string[] };
  const briefing = await getStudioBriefing(supabase, membership.orgId);
  const hasBriefingContent =
    briefing.newThisWeek > 0 || briefing.needsResearch > 0 || briefing.readyToContact > 0 || briefing.followUpsDue > 0;

  // Real counts, not the illustrative marketing-page numbers — the
  // homepage's KPI teaser is fictional-data-and-labelled-as-such
  // (aiInsights/dashboardKpis), deliberately kept out of Studio entirely.
  // Head-count queries only (no rows fetched) since this page just needs
  // the totals, and RLS scopes both to this org independently of the
  // .eq() below getting it right.
  const [{ count: prospectCount }, { count: clientCount }] = await Promise.all([
    supabase.from("prospects").select("id", { count: "exact", head: true }).eq("org_id", membership.orgId),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("org_id", membership.orgId),
  ]);
  const conversionRate =
    prospectCount && prospectCount > 0 && clientCount != null
      ? `${Math.round((clientCount / prospectCount) * 100)}%`
      : "—";

  return (
    <div className="max-w-2xl">
      <Eyebrow>Workspace ready</Eyebrow>
      <h1 className="mt-3 font-heading text-2xl font-semibold md:text-3xl">
        Welcome to {org?.name ?? "your agency"}.
      </h1>
      <p className="mt-2 text-muted-foreground">
        Find prospects, convert them into clients, and manage your subscription — all from here.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Badge variant="secondary">{config.agencyType ?? "Agency"}</Badge>
        <Badge variant="secondary" className="capitalize">{org?.plan ?? "starter"} plan</Badge>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl border border-border bg-background p-5">
        <div>
          <p className="font-heading text-2xl font-semibold">{prospectCount ?? 0}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Prospects found</p>
        </div>
        <div>
          <p className="font-heading text-2xl font-semibold">{clientCount ?? 0}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Clients</p>
        </div>
        <div>
          <p className="font-heading text-2xl font-semibold">{conversionRate}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Conversion rate</p>
        </div>
      </div>

      {hasBriefingContent && (
        <Card className="mt-6">
          <CardContent>
            <p className="font-heading text-sm font-semibold">Your briefing</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {briefing.newThisWeek > 0 && (
                <span>
                  <span className="font-mono font-semibold text-accent">{briefing.newThisWeek}</span>{" "}
                  <span className="text-muted-foreground">new this week</span>
                </span>
              )}
              {briefing.needsResearch > 0 && (
                <span>
                  <span className="font-mono font-semibold text-accent">{briefing.needsResearch}</span>{" "}
                  <span className="text-muted-foreground">still need research</span>
                </span>
              )}
              {briefing.readyToContact > 0 && (
                <span>
                  <span className="font-mono font-semibold text-accent">{briefing.readyToContact}</span>{" "}
                  <span className="text-muted-foreground">ready to contact</span>
                </span>
              )}
              {briefing.followUpsDue > 0 && (
                <span>
                  <span className="font-mono font-semibold text-destructive">{briefing.followUpsDue}</span>{" "}
                  <span className="text-muted-foreground">follow-up{briefing.followUpsDue === 1 ? "" : "s"} due</span>
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

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
