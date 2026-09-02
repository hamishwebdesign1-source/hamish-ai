import { redirect } from "next/navigation";
import { CircleAlert, CheckCircle2, CreditCard, ExternalLink, Clock, Activity, Bot, Briefcase } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getOrgMembership } from "@/lib/org-membership";
import { timeAgo } from "@/lib/time-ago";
import { hasPlatformMsConfig } from "@/lib/tenant-graph-auth";
import { SettingsPanel } from "@/components/platform/settings-panel";
import { BrandingPanel } from "@/components/platform/branding-panel";
import { EmailSenderPanel } from "@/components/platform/email-sender-panel";
import { BookingLinkPanel } from "@/components/platform/booking-link-panel";
import { CompetitiveIntelPanel } from "@/components/platform/competitive-intel-panel";
import { AutomationRulesPanel } from "@/components/platform/automation-rules-panel";
import { RateCardPanel } from "@/components/platform/rate-card-panel";
import type { RateCardItem } from "@/lib/rate-card";
import { DataPrivacyPanel } from "@/components/platform/data-privacy-panel";
import { CommandCentreLayoutPanel } from "@/components/platform/command-centre-layout-panel";
import { NotificationsPanel } from "@/components/platform/notifications-panel";
import { TodayStripPanel } from "@/components/platform/today-strip-panel";
import { TeamPanel } from "@/components/platform/team-panel";
import { resolveLayout } from "@/lib/command-centre-layout";
import { resolveTodayStrip } from "@/lib/today-strip-config";
import { listTeamMembers, seatLimitForPlan } from "@/lib/team-members";
import type { PlatformPlanSlug } from "@/lib/platform-plans";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findAgencyType } from "@/lib/agency-types";

// Server-side data assembly only, same split as /studio/prospects — the
// connect/disconnect/check actions live in settings/actions.ts and
// api/platform/ms-connect + ms-callback, called from SettingsPanel below.
export default async function StudioSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    ms_connected?: string;
    ms_error?: string;
    stripe_connected?: string;
    stripe_pending?: string;
    stripe_error?: string;
  }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  // Session-scoped client — RLS (email_connections_select_own_org,
  // schema-email-connections.sql) enforces the same org boundary
  // independently of this .eq() getting it right.
  const { data: connection } = await supabase
    .from("email_connections")
    .select("email_address, connected_at, last_checked_at")
    .eq("org_id", membership.orgId)
    .eq("provider", "microsoft")
    .maybeSingle();

  // organisations_select_own RLS (schema-organisations.sql) — same policy
  // every other /studio page's org read already relies on.
  const { data: org } = await supabase
    .from("organisations")
    .select(
      "name, brand, is_internal, plan, stripe_connect_account_id, stripe_connect_charges_enabled, deletion_requested_at, command_centre_layout, owner_digest_enabled, today_strip_stats, prospecting_config"
    )
    .eq("id", membership.orgId)
    .single();
  const brand = (org?.brand ?? {}) as {
    accentColor?: string;
    replyToEmail?: string;
    autonomousOutreachEnabled?: boolean;
    bookingLink?: string;
    competitiveIntelEnabled?: boolean;
    autoDraftHighScoreProspectsEnabled?: boolean;
    rateCard?: RateCardItem[];
  };
  const commandCentreBlocks = resolveLayout(org?.command_centre_layout);
  const plan = (org?.plan ?? "starter") as PlatformPlanSlug;
  const seatLimit = seatLimitForPlan(plan);
  // Content enrichment — the agency type picked once at onboarding was
  // never surfaced anywhere in Studio again afterwards (agencyType is
  // otherwise only ever read by draft-sales-kit.ts, to shape AI-generated
  // outreach voice, never displayed back to the tenant). See agency-
  // types.ts's own comment for the full "what Studio does vs. what you
  // bring yourself" reasoning behind the howItWorks content shown below.
  const agencyType = findAgencyType((org?.prospecting_config as { agencyType?: string } | null)?.agencyType);

  // Command Centre Phase 5e — command_centre_layout_history_select_own_org
  // RLS (schema-rls-command-centre-layout-history.sql) enforces the same
  // org boundary independently of this .eq() getting it right. Capped to
  // the 10 most recent server-side too (the write path already prunes to
  // this same limit, this is just matching it on read).
  const { data: layoutHistory } = await supabase
    .from("command_centre_layout_history")
    .select("id, created_at")
    .eq("org_id", membership.orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Real-improvement pass — the weekly health/adoption snapshot cron
  // (api/cron/health-snapshot) runs for every org with no way for a
  // tenant to actually see it's working for theirs specifically — the
  // Command Centre's own health trend and adoption chart show the
  // *effect* (a delta, a chart point) once there's enough history, but
  // never "is this actually current." These two dates are the one
  // thing genuinely derivable per org — not a fabricated broader "job
  // status" system, just the real, most recent row each table actually
  // has. studio_health_snapshots/studio_adoption_snapshots are service-
  // role-only (same convention as ai_call_log), read through the admin
  // client.
  // Team seats gap — teamMembers reuses this same admin client
  // (memberships is SELECT-only for a session client scoped to the
  // caller's own row via organisations_select_own's RLS shape, not every
  // member of the org — same reasoning this snapshot read already
  // documents for going through `admin` instead of `supabase`).
  const admin = getSupabaseAdmin();
  const [{ data: lastHealthSnapshot }, { data: lastAdoptionSnapshot }, teamMembers] = admin
    ? await Promise.all([
        admin
          .from("studio_health_snapshots")
          .select("created_at")
          .eq("org_id", membership.orgId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("studio_adoption_snapshots")
          .select("created_at")
          .eq("org_id", membership.orgId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        listTeamMembers(admin, membership.orgId),
      ])
    : [{ data: null }, { data: null }, []];

  const canInviteMore = !org?.is_internal && teamMembers.length < seatLimit;
  const params = await searchParams;

  return (
    // Centered column, not left-aligned-and-capped — see prospecting-panel.tsx's
    // comment for why that distinction is the actual fix.
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connect your own inbox to automate follow-up tracking.</p>
      </div>

      {params.ms_connected && (
        <p className="flex items-center gap-1.5 text-sm text-accent">
          <CheckCircle2 className="size-4 shrink-0" /> Inbox connected.
        </p>
      )}
      {params.ms_error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" /> {params.ms_error}
        </p>
      )}
      {params.stripe_connected && (
        <p className="flex items-center gap-1.5 text-sm text-accent">
          <CheckCircle2 className="size-4 shrink-0" /> Stripe connected — you can invoice clients now.
        </p>
      )}
      {params.stripe_pending && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-4 shrink-0" /> Stripe account created — finish their verification steps to start
          invoicing.
        </p>
      )}
      {params.stripe_error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" /> {params.stripe_error}
        </p>
      )}

      {/* Command Centre Phase 1 (§28) — grouped into real, labelled
          sections instead of a flat card list. Only sections with real
          content in this app today: Integrations, Branding, Data &
          Privacy. Not inventing Profile/Users/Permissions/AI-settings
          placeholder sections for features that don't exist yet — same
          "only show what's real" rule as everywhere else in Studio. */}
      <div>
        <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Integrations</h2>
        <div className="mt-3 space-y-4">
          <SettingsPanel connection={connection ?? null} configured={hasPlatformMsConfig()} connectHref="/api/platform/ms-connect" />

          {/* Not rendered for HamishAI's own internal org — HamishAI
              invoices its own clients on the platform's own Stripe
              account directly (create-invoice.ts's isInternal branch),
              it has no need to "connect" to itself. */}
          {!org?.is_internal && (
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2.5 font-heading text-sm font-semibold">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <CreditCard className="size-4" />
                    </span>
                    Client billing
                  </p>
                  {org?.stripe_connect_charges_enabled ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="size-3" /> Ready
                    </Badge>
                  ) : org?.stripe_connect_account_id ? (
                    <Badge variant="warning">Verification pending</Badge>
                  ) : (
                    <Badge variant="secondary">Not connected</Badge>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Connect your own Stripe account so you can invoice your clients directly — payments go straight
                  to you, not through us. Stripe handles the onboarding (identity, bank details); we never see or
                  store your banking details.
                </p>
                <Button size="sm" className="mt-4" render={<a href="/api/platform/stripe-connect/start" />}>
                  <ExternalLink className="size-3.5" />
                  {org?.stripe_connect_account_id ? "Finish Stripe setup" : "Connect Stripe"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Notifications</h2>
        <div className="mt-3">
          <NotificationsPanel enabled={org?.owner_digest_enabled ?? true} />
        </div>
      </div>

      <div>
        <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Command Centre</h2>
        <div className="mt-3 space-y-4">
          <TodayStripPanel initialStats={resolveTodayStrip(org?.today_strip_stats)} />
          <CommandCentreLayoutPanel initialBlocks={commandCentreBlocks} history={layoutHistory ?? []} />
        </div>
      </div>

      {/* Not rendered for HamishAI's own internal org — getPortalOrgBranding()
          ignores brand.accentColor for is_internal orgs entirely (the
          portal always reads as "HamishAI"), so this control would
          visibly do nothing for that one row. */}
      {!org?.is_internal && (
        <div>
          <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Branding</h2>
          <div className="mt-3">
            <BrandingPanel accentColor={brand.accentColor ?? null} />
          </div>
        </div>
      )}

      {/* Content enrichment — was picked once at signup and never shown
          again. Read-only here on purpose: this explains what's already
          shaping your AI-generated outreach voice (draft-sales-kit.ts),
          not a settings toggle to change it — same "the onboarding wizard
          is the one place this decision gets made" scope this session's
          own agency-type-templates fix already established. */}
      {!org?.is_internal && agencyType && (
        <div>
          <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Business model</h2>
          <div className="mt-3">
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Briefcase className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{agencyType.name}</p>
                    <p className="text-xs text-muted-foreground">{agencyType.description}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">Services you picked at signup</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {((org?.prospecting_config as { services?: string[] } | null)?.services ?? agencyType.services).map((service) => (
                      <Badge key={service} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">How this works in Studio</p>
                  <ul className="mt-1.5 space-y-1.5 text-xs text-muted-foreground">
                    {agencyType.howItWorks.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
                  This shapes the tone of your AI-generated outreach — set once during signup. Email{" "}
                  <a href="mailto:hello@hamishai.org" className="text-accent underline underline-offset-2">
                    hello@hamishai.org
                  </a>{" "}
                  if your business has genuinely changed direction and you&apos;d like it updated.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Roadmap item #1 — same isInternal gate as Branding above:
          HamishAI's own org already has a real sending identity via
          sendClientEmail(), it has nothing to configure here. */}
      {!org?.is_internal && (
        <div>
          <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Email</h2>
          <div className="mt-3">
            <EmailSenderPanel replyToEmail={brand.replyToEmail ?? null} autonomousOutreachEnabled={Boolean(brand.autonomousOutreachEnabled)} />
          </div>
        </div>
      )}

      {/* Roadmap item #9 — no dependency on Email above (a booking link
          works whether or not tenant-scoped sending is set up yet: it
          also appears in the sales-kit preview a human copies out
          manually), so its own gate is just isInternal, same as
          Branding. */}
      {!org?.is_internal && (
        <div>
          <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Booking</h2>
          <div className="mt-3">
            <BookingLinkPanel bookingLink={brand.bookingLink ?? null} />
          </div>
        </div>
      )}

      {/* Roadmap item #7 — same isInternal gate as everything else in
          this section; HamishAI's own client base isn't what this
          feature protects. */}
      {!org?.is_internal && (
        <div>
          <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Competitive intelligence</h2>
          <div className="mt-3">
            <CompetitiveIntelPanel enabled={Boolean(brand.competitiveIntelEnabled)} />
          </div>
        </div>
      )}

      {/* Roadmap item #10 — same isInternal gate; HamishAI's own
          prospecting stays the hands-on Gmail-draft pipeline this
          automation deliberately doesn't touch. */}
      {!org?.is_internal && (
        <div>
          <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Automation</h2>
          <div className="mt-3">
            <AutomationRulesPanel enabled={Boolean(brand.autoDraftHighScoreProspectsEnabled)} />
          </div>
        </div>
      )}

      {/* Roadmap item #6 — same isInternal gate; HamishAI's own pricing
          lives in site-config.ts, a completely different thing from a
          tenant's own rate card. */}
      {!org?.is_internal && (
        <div>
          <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Proposals</h2>
          <div className="mt-3">
            <RateCardPanel initialItems={brand.rateCard ?? []} />
          </div>
        </div>
      )}

      {/* Team seats gap — same isInternal gate as Branding/Email above:
          HamishAI's own login is /admin's separate password+magic-link
          path (org-membership.ts's own comment on why no membership row
          is backfilled for the internal org), not this memberships-based
          team model. */}
      {!org?.is_internal && (
        <div>
          <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Team</h2>
          <div className="mt-3">
            <TeamPanel
              members={teamMembers}
              isOwner={membership.role === "owner"}
              seatsUsed={teamMembers.length}
              seatLimit={seatLimit}
              canInvite={canInviteMore}
              upgradeReason={
                plan === "agency"
                  ? `You've reached this workspace's team limit (${seatLimit} seats).`
                  : "Your plan includes 1 seat. Upgrade to the Agency plan to add team members."
              }
            />
          </div>
        </div>
      )}

      <div>
        <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">Data &amp; Privacy</h2>
        <div className="mt-3">
          <DataPrivacyPanel orgName={org?.name ?? ""} deletionRequestedAt={org?.deletion_requested_at ?? null} />
        </div>
      </div>

      {/* Real-improvement pass — see the query above's own comment on
          why these two dates specifically, and why nothing broader. */}
      {!org?.is_internal && (
        <div>
          <h2 className="font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">System</h2>
          <div className="mt-3">
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Activity className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Business Health trend</p>
                    <p className="text-xs text-muted-foreground">
                      {lastHealthSnapshot ? `Last recorded ${timeAgo(lastHealthSnapshot.created_at)}` : "Not recorded yet — runs weekly, Monday mornings."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-t border-border pt-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Bot className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">AI adoption trend</p>
                    <p className="text-xs text-muted-foreground">
                      {lastAdoptionSnapshot
                        ? `Last recorded ${timeAgo(lastAdoptionSnapshot.created_at)}`
                        : "Not recorded yet — runs weekly, Monday mornings."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
