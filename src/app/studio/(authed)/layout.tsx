import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Clock } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { Button } from "@/components/ui/button";
import { StudioSidebar } from "@/components/platform/studio-nav";
import { StudioMobileNav } from "@/components/platform/studio-mobile-nav";
import { StudioCommandPalette } from "@/components/platform/studio-command-palette";
import { StudioCommandPaletteTrigger } from "@/components/platform/studio-command-palette-trigger";
import { HelpModeProvider } from "@/components/platform/help-mode-context";
import { HelpModeToggle } from "@/components/platform/help-mode-toggle";
import { StudioTour } from "@/components/platform/studio-tour";
import { IdentifyOrg } from "@/components/platform/identify-org";
import { StudioAssistantWidget } from "@/components/platform/studio-assistant-widget";

// Studio improvement — trial_ends_at was only ever shown on the Billing
// page (billing/page.tsx's own trialDaysLeft), so an agency on day 6 of
// a 7-day trial had no idea unless they happened to visit that one page.
// Same 3-day threshold trial-reminders.ts's own email reminder already
// uses (schema-trial-reminders.sql's trial_reminder_7d_sent_at, despite
// the stale column name — see that file's own comment), so the in-app
// banner and the email agree on when "ending soon" starts. Kept as its
// own local copy of the day-count maths rather than importing
// billing/page.tsx's own daysUntil() — same "own local copy" convention
// that file's own comment documents for the same reasoning (daysSince()
// in admin/(authed)/page.tsx).
function daysUntilTrialEnds(trialEndsAt: string): number {
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

// Same shape as portal/(authed)/layout.tsx, one level up: session check,
// then a membership-based gate, session-scoped client throughout so RLS
// (organisations_select_own / prospects_select_own_org) enforces the same
// boundary independently of this .eq() getting it right.
//
// Unlike the portal layout's "no portal access found" error card, no
// membership here redirects to /platform/onboarding rather than showing a
// dead end — a verified session with no org is the expected state for
// someone who hasn't finished signing up yet, not a mistake to explain.
export default async function StudioAuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const { data: org } = await supabase
    .from("organisations")
    .select("name, tour_completed_at, subscription_status, trial_ends_at, is_internal")
    .eq("id", membership.orgId)
    .single();

  const trialDaysLeft = org?.trial_ends_at ? daysUntilTrialEnds(org.trial_ends_at) : null;
  const isTrialing = !org?.is_internal && org?.subscription_status === "trialing" && trialDaysLeft !== null;
  // Studio Design Audit Tier 5 item #16 — showTrialBanner used to be the
  // *only* trial indicator anywhere in Studio, and it only lit up at
  // trialDaysLeft <= 3, meaning a trialing org had zero ambient sense of
  // being on a trial (let alone how long was left) for the first 4 of 7
  // trial days. Split into two states now: a small, low-key header pill
  // for days 4-7 remaining (showTrialPill) that just orients the org
  // without urgency, escalating to this exact same warning banner
  // (copy/styling/link untouched) once trialDaysLeft drops to <= 3 — the
  // escalation itself is preserved, just no longer the only signal.
  const showTrialBanner = isTrialing && trialDaysLeft !== null && trialDaysLeft <= 3;
  const showTrialPill = isTrialing && trialDaysLeft !== null && trialDaysLeft > 3;
  // 7-day trial (onboarding-wizard.tsx's own "7-day free trial" copy,
  // trial-reminders.ts's schedule) — Day X counts up from 1, not down
  // from trialDaysLeft, since "Day 6 of 7" reads as progress while
  // "1 day left" (already covered by the warning banner below) reads as
  // urgency; two different jobs for two different remaining-time ranges.
  const trialDayNumber = trialDaysLeft !== null ? Math.min(7, Math.max(1, 8 - trialDaysLeft)) : null;

  // Studio improvement — the Requests nav badge. Same embedded-resource
  // filter (clients!inner(org_id)) requestBelongsToOrg() (requests/actions.ts)
  // already uses to scope a requests query by org without a separate
  // client-id-list round trip first — one query, on every Studio page
  // load via this layout, so it stays this cheap on purpose (count-only,
  // head: true, no rows returned).
  const { count: requestsBadgeCount } = await supabase
    .from("requests")
    .select("id, clients!inner(org_id)", { count: "exact", head: true })
    .eq("clients.org_id", membership.orgId)
    .is("responded_at", null);

  return (
    <HelpModeProvider>
      <IdentifyOrg orgId={membership.orgId} />
      {!org?.tour_completed_at && <StudioTour />}
      {/* Studio Mission Control redesign — dark, deliberately, not a mode
          a user toggles (see globals.css's own comment on .studio-shell
          for the full reasoning). bg-background (solid) replaces the old
          bg-secondary/20 (a 20%-opacity tint over the site's light page)
          on purpose: that tint was designed to sit over a light body, and
          at 20% opacity over the new dark scope it would let the site's
          still-light global background bleed through underneath.
          text-foreground alongside it for the same reason body itself
          pairs bg-background with text-foreground: `color` inherits as
          an already-resolved value, not a live var() re-evaluation — any
          descendant with no text-* class of its own (a bare <h1>, this
          layout's own logo Link) would otherwise inherit body's
          light-mode near-black text straight through this dark scope,
          nearly invisible against it. Re-asserting color here is what
          makes this div a real new inheritance root, the same way body
          is for the rest of the site.

          aurora-bg activates the dormant ambient-mesh utility from
          globals.css, re-tuned for this dark shell by the
          .studio-shell.aurora-bg::before override in globals.css (see
          its own comment there) rather than the light-marketing-hero
          defaults — dropped violet, much lower alpha, blobs biased to the
          outer gutters outside the centred max-w-6xl column below, slower
          drift.

          Reported live (3 Sep 2026): the sidebar's own `sticky top-8`
          (studio-nav.tsx) wasn't actually staying in view on scroll —
          confirmed by checking its rendered position at scrollY 1000 vs
          0, moving in lockstep with the page instead of sticking. Root
          cause was aurora-bg's own `overflow: hidden` (needed to clip
          the ::before glow's oversized -20% inset bleed) sitting on this
          same div the sidebar is a descendant of — an ancestor's
          overflow:hidden breaks position:sticky for everything inside
          it, a real, easy-to-miss CSS interaction, not a styling choice
          anyone made on purpose. Fix: the glow is now its own decorative
          sibling div (absolute, negative z-index, non-interactive) with
          its own isolated overflow:hidden, instead of wrapping the real
          content — same visual result (still full-bleed, still behind
          everything), but the sidebar's containing-block chain up to
          the actual page scroller no longer passes through an
          overflow:hidden box, so sticky works as originally intended. */}
      <div className="dark studio-shell relative isolate min-h-screen bg-background text-foreground">
        <div className="studio-shell aurora-bg pointer-events-none inset-0 -z-10" style={{ position: "absolute" }} aria-hidden="true" />
        <StudioCommandPalette />
        <header className="relative border-b border-border/60 bg-background">
          {/* Reported live (3 Sep 2026): asked to move the sidebar rail
              further left to free up room for real content, and to give
              it a visible border. The rail itself wasn't the problem —
              this row and the content row below it both sat inside the
              same shared max-w-6xl, which padded the rail in from the
              true edge on any screen wider than that column. Widened
              both rows to the same px-6 gutter with no shared
              max-width, so the header's own content and the sidebar
              line up against the same true edge instead of the header
              staying narrower than the row now below it. Each page's
              own content still centres itself independently (every
              /studio page already wraps its own children in its own
              mx-auto max-w-4xl/max-w-6xl — unaffected, just now
              centring within more real room). */}
          <div className="flex items-center justify-between gap-3 px-6 py-4">
            {/* Studio Design Audit, Tier 1 #4 — a long org name had no
                truncation and forced horizontal overflow at narrow
                widths (no shrink-0/min-w-0 guard on this row at all).
                min-w-0 on the Link (so this flex item is allowed to
                shrink below its content size) + truncate on the name
                itself; the "Studio" badge keeps shrink-0 so it's never
                what gets clipped. */}
            <div className="flex min-w-0 items-center gap-2">
              <Link href="/studio" className="flex min-w-0 items-baseline gap-2 font-heading text-lg font-semibold">
                <span className="min-w-0 truncate">{org?.name ?? "Your Agency"}</span>
                <span className="shrink-0 font-mono text-xs font-normal tracking-wide text-muted-foreground uppercase">
                  Studio
                </span>
              </Link>
              {/* Studio Design Audit Tier 5 item #16 — low-key, always-on
                  trial indicator for days 4-7 remaining (see showTrialPill's
                  own comment above); deliberately muted (bg-secondary, no
                  warning colour) since this is just orientation, not the
                  "act now" moment the banner below is for. */}
              {showTrialPill && trialDayNumber !== null && (
                <span className="shrink-0 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Trial · Day {trialDayNumber} of 7
                </span>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <div className="w-full max-w-40 sm:max-w-56">
                <StudioCommandPaletteTrigger />
              </div>
              <div className="hidden md:block">
                <HelpModeToggle />
              </div>
              <form action="/api/platform/logout" method="post" className="hidden md:block">
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
              <StudioMobileNav requestsBadgeCount={requestsBadgeCount ?? undefined} />
            </div>
          </div>
        </header>
        {showTrialBanner && (
          <div className="border-b border-warning/30 bg-warning/10 px-6 py-2 text-center text-xs font-medium text-warning">
            <Clock className="mr-1 inline size-3.5 align-text-bottom" />
            Your trial ends in {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} —{" "}
            <Link href="/studio/billing" className="underline underline-offset-2">
              subscribe to keep access
            </Link>
            .
          </div>
        )}
        <div className="flex gap-8 px-6">
          <StudioSidebar requestsBadgeCount={requestsBadgeCount ?? undefined} />
          {/* overflow-x-hidden here, not on this row or the outer shell —
              live-verifying the row-width change above surfaced a real,
              separate bug: help-tip.tsx's plain-CSS tooltip (no collision
              detection, by design — see tooltip.tsx's own comment on why
              Base UI's version got dropped) sits `absolute left-1/2
              -translate-x-1/2 w-max`, and once content got genuinely
              wider a tooltip trigger near the right edge could push its
              (invisible-until-hovered, but still layout-participating)
              content past the viewport, growing document scrollWidth
              and producing a real horizontal scrollbar on every page,
              not just ones using a tooltip. Scoped to `main`
              specifically — NOT the shared row or shell wrapper above —
              because an ancestor's non-visible overflow is exactly what
              broke the sidebar's own position:sticky earlier this
              session (this file's own comment on the aurora-bg fix);
              `main` is the sidebar's sibling, not its ancestor, so this
              can't recreate that bug. Doesn't touch the Kanban board's
              own intentional inner overflow-x-auto either — nested
              overflow contexts are independent. */}
          <main className="min-w-0 flex-1 overflow-x-hidden py-10">{children}</main>
        </div>
        <StudioAssistantWidget orgName={org?.name ?? "your agency"} />
      </div>
    </HelpModeProvider>
  );
}
