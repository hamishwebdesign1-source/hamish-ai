# HamishAI — backlog

Structured tasks, turned from ideas by the Product Director (see
`.claude/agents/product-director.md`) — not a dumping ground for every raw
idea. An idea earns a slot here once it has a real problem statement and an
owner. Newest first within each status. Move an entry between sections
rather than duplicating it.

## Task template

```
### <short title>

- **Problem**: what's actually wrong or missing, for whom
- **Objective**: what success looks like
- **User**: who this is for (be specific — not "users," which user)
- **Priority**: P0 (now) / P1 (next) / P2 (worth doing) / P3 (someday)
- **Expected outcome**: the real, measurable-or-observable change
- **Acceptance criteria**: how we'll know it's actually done
- **Relevant agent**: who owns driving this
- **Dependencies**: what has to be true/done first, if anything
- **Status**: Not started / Researching / Ready / In progress / Needs review / Complete / Blocked
```

## In progress

_(none yet)_

## Ready

_(none yet)_

## Researching

### Investigate `useOptimistic` for Studio's Server Actions

- **Problem**: Growth & Analytics found zero `useOptimistic` usage anywhere in the codebase (verified) — every Server Action in Studio is a full round-trip with no perceived-instant feedback, unlike the "instant feel" architecture reviewers credit category leaders (e.g. Linear) for. This is a real, sourced competitive gap, not a hunch.
- **Objective**: identify which existing Server Actions would most benefit from optimistic UI (likely candidates: toggling/deleting in list-heavy panels — Clients, Prospects, Campaigns, Projects) and produce a scoped implementation plan, not a wall-to-wall rewrite.
- **User**: any Studio user doing frequent small interactions (status toggles, deletes, marking items done) where a round-trip delay is most noticeable.
- **Priority**: P2 — genuine polish opportunity tied to the "feels premium" goal, but not a correctness or trust issue, and needs real scoping before committing engineering time.
- **Expected outcome**: a short design note naming 2-4 concrete, bounded actions to convert first, with the rollback/error-state behaviour specified (an optimistic update that silently fails is worse than the round-trip it replaced).
- **Acceptance criteria**: UX/UI Director + Lead Engineer produce a written scoping note (candidates + risks) before any code lands; if approved, first candidate ships with a test covering both the optimistic success and the rollback-on-error path.
- **Relevant agent**: UX/UI Director (scoping), Lead Engineer (implementation once scoped).
- **Dependencies**: none blocking the scoping step; implementation depends on that scoping note being reviewed.
- **Status**: Researching

## Not started

### Wire a one-click action to Command Centre's AI recommendations (recommend → act)

- **Problem**: `studio-insights.ts`'s `generateInsights()` and `studio-briefing.ts`'s `topOpportunities` already compute real, reasoned recommendations (e.g. "3 new prospects this period, no conversions yet," ranked opportunities) — but every recommendation's `action` is just `{ label, href }`, a link to a list page. The user still has to manually find the specific prospect/lead and manually trigger `researchLead()`/`draftSalesKit()` themselves. AI/Agent Architect flagged this as the single highest-leverage gap in Studio's AI-nativeness: the "observe → understand" layer is already honest and fairly strong, but "recommend → act" stops at "here's where to look," not "here's what to do, want me to do it." This is exactly the "AI surfaces feeling agentic not bolted-on" falsifiable check from the mission's original framing.
- **Objective**: at least one real recommendation type (e.g. the "no-conversions" pipeline recommendation, or a scored `topOpportunity`) gets a real one-click action that calls the existing `researchLead(leadId)` or `draftSalesKit(leadId, sender)` pipeline directly from the insight card, with a clear pending/success state — not a new AI pipeline, just wiring the existing one to the point where the recommendation already names the specific lead.
- **User**: an agency owner scanning the Command Centre who sees "this lead is worth acting on" and currently has to context-switch to Prospects, find the specific lead, and manually trigger research/kit generation themselves.
- **Priority**: P2 — real, well-evidenced opportunity, but not urgent; genuinely additive polish rather than fixing something broken, and touches usage-metering (see dependency below) which needs a considered decision, not a rushed one.
- **Expected outcome**: clicking the action on a qualifying insight card runs the real pipeline against the specific lead/prospect the insight is about, with the same loading/error handling every other AI-triggered action in Studio already has (`research-lead.ts`/`draft-sales-kit.ts` callers) — no new AI call site, no new prompt.
- **Acceptance criteria**: at least one insight/recommendation type has a working one-click action wired to an existing pipeline; the action correctly counts against the org's existing usage-limit metering for that pipeline (this is not a new free action — it's a new entry point to metered actions that already exist); test coverage for the new entry point mirrors the existing pipeline's own test conventions.
- **Relevant agent**: AI/Agent Architect (already scoped this), Lead Engineer (implementation), UX/UI Director (the in-card action/pending-state pattern).
- **Dependencies**: **Flag for Hamish** before build — even though this reuses existing metered actions rather than adding a new billable action type, it changes how easily a user can trigger metered AI usage (one click from the dashboard vs. a deliberate navigation), which is worth a conscious yes/no rather than assuming it's fine. Opportunities #2 (one-click AI-drafted check-in message off `engagement_risk`) and #3 (extending autonomous triage to tenant orgs) were also raised by AI/Agent Architect but are deliberately *not* backlogged as buildable items here — #2 is speculative until this first one proves the pattern works, and #3 is blocked on a real infra prerequisite (tenant-scoped outbound email) and is a bigger, cross-cutting call for a future mission, not a scoped task today.

- **Design spec (UX/UI Director, 2026-08-31)** — read in full before building, this is the actual interaction contract, not a suggestion:

  **Which recommendation type, and why.** Checked both real candidates against `studio-briefing.ts`/`studio-insights.ts` directly:
  - `no-conversions` (`studio-insights.ts`) only carries `pipelineKpi.value` — a count off `AnalyticsData.kpis`, never an individual prospect id. Picking "the one to act on" would mean re-deriving the scored-prospect logic `getStudioBriefing()` already owns, inside a different function that doesn't have that data — real new plumbing, not wiring. **Ruled out for v1.**
  - `briefing.topOpportunity` / `briefing.topOpportunities` (`studio-briefing.ts`) already carry a real `id` (`TopOpportunity.id` = `prospects.id`) for one specific, named lead — and every entry in `scored` is filtered to `p.research && p.score_breakdown`, meaning **research is always already done** for these. `researchLead()` is therefore never the right pipeline here — `draftSalesKit()` is, gated on whether that lead already has a `sales_kit` (the row is already selected in `getStudioBriefing()`'s own `.select()`, just not surfaced on the type yet — add one field, `hasSalesKit: Boolean(p.sales_kit)`, to `TopOpportunity`. Zero new queries.
  - **v1 target: the "Your briefing" card's single `topOpportunity` callout only** (`command-centre-section-cards.tsx`, the `briefing` section, the `border-accent/25 bg-accent/10` box), not the 5-row `top_prospects` block. Same data shape, but the singular callout is always-visible (whenever `hasBriefingContent`), has real room for a button without crowding, and only ever needs one instance of the interaction rather than five at once — the tighter, lower-risk place to prove the pattern before extending it to `top_prospects` as an identical fast-follow (same client component, no new design work, just a second call site once this one's shipped and observed).

  **Where it reuses existing plumbing.** `generateSalesKit(prospectId)` (`src/app/studio/(authed)/prospects/actions.ts`) already does everything this needs: re-derives `orgId` from the session, confirms the prospect belongs to that org, runs `checkUsage(orgId, "sales_kit_generated")`, resolves the tenant's own name/`isInternal` as the kit's sender, calls `draftSalesKit()`, records the usage event, and revalidates. **Call this Server Action directly — no new pipeline, no new usage type, no changes to `draft-sales-kit.ts` or `usage-limits.ts`.**

  **The one real code change this design needs**: `generateSalesKit()`'s error return is currently a flat `{ error: string }`, which collapses "hit your monthly cap," "rate-limited," and "the AI/DB genuinely failed" into one opaque string. Add a machine-readable discriminator alongside the existing message, sourced directly from `checkUsage()`'s own already-discriminated result (it already knows `rateLimited` vs. the monthly-usage numbers — this is exposing that, not computing anything new): `{ error: string; reason?: "usage_limit" | "rate_limited" }`. This is additive — `SalesKitSection` on the Prospects page (the existing caller) keeps reading `.error` exactly as it does today and needs no changes; only the new Command Centre call site reads `.reason`.

  **Visual placement**: inside the existing amber/accent `topOpportunity` box, directly below the `pursueBecause` paragraph (`mt-2`), as one more line in that callout — not a new card, not a new section.

  **Component states** (one new client component, e.g. `top-opportunity-kit-action.tsx`, following `HelpTip`'s existing precedent of a "use client" leaf embedded in this otherwise-server-rendered card builder; props `{ prospectId, hasKitInitially }`, local `useState(hasKitInitially)` tracks "done" so an already-generated kit and a just-generated one render identically):

  1. **Resting** (`!done`): `<Button size="sm" variant="outline">` — exact size/variant `SalesKitSection` already uses for this same action on Prospects, not a bigger/louder treatment that would fight `actions_required`'s `bg-primary` for attention. Label: `<ClipboardList className="size-3.5" /> Generate outreach kit` — identical copy/icon to the Prospects page, not new wording for the same action.
  2. **Pending** (`useTransition`): button `disabled`, label swaps to `<LoaderCircle className="size-3.5 animate-spin" /> Writing…` — byte-identical to `SalesKitSection`'s own pending copy. Wrap the whole action region in `aria-live="polite"` (precedent: `signup-form.tsx`) so the pending→result transition is announced without moving focus — an improvement on `SalesKitSection`/`ResearchTrigger`, which don't have this today; worth a follow-up note to backport there, not blocking this item.
  3. **Success**: button is replaced in place (not a toast, not a modal — matches `SalesKitSection`'s own "the real content replaces the prompt" convention) by a compact confirmation using the same inline-link style `insights` action links already use (`text-xs text-accent underline underline-offset-2`), not the bigger `Button variant="link"` used for a card's own bottom-of-card nav link: `<CheckCircle2 className="size-3.5 text-accent" /> Outreach kit ready — Open in Prospects` (linking to `/studio/prospects`, not a specific-row deep link — no per-prospect route exists anywhere in this codebase yet, confirmed against `recent_activity`'s own identical constraint; don't invent one here). Also call `router.refresh()` (precedent: `build-phase-panel.tsx`) so the Server Component tree picks up the real `hasSalesKit` on next natural re-render, even though the local `done` state is what gives the instant feedback and doesn't wait on it.
  4. **Error, generic** (`"error" in result`, no `reason`, or the AI/DB genuinely failed): button returns to enabled resting state; `<p role="alert" className="mt-2 text-xs text-destructive">{result.error}</p>` directly below it — same placement/styling `SalesKitSection` already uses, plus the `role="alert"` it's currently missing.
  5. **Error, rate-limited** (`reason === "rate_limited"`): identical treatment to #4 — the message itself ("You're doing that a lot right now — wait a few minutes and try again.") already tells the user what to do; no extra link needed.
  6. **Error, usage-limit-exceeded** (`reason === "usage_limit"`): same red `role="alert"` line, message unchanged ("Monthly limit reached (X of Y) — try again next month."), plus one appended inline link in the same compact style as the success link: `View plan` → `/studio/billing`. This is the considered answer to the backlog's open question: don't invent a modal/toast/confirm-before-you-click gate (that would be a new pattern for one call site, and the pre-click pause this removes was never a deliberate safeguard, just an incidental side effect of requiring navigation first) — instead make sure that when the org **does** hit the wall from here, the very next thing they see is where to actually fix it, not a dead-end red line. HamishAI's own internal org (`is_internal`) never reaches this state at all (`checkUsage` returns `allowed: true` unconditionally for it), consistent with every other usage check in the app.

  **This spec does not itself constitute Hamish's sign-off** on the dependency flagged above — that's still a real yes/no Lead Engineer needs before writing code, not something inferable from a design doc existing.

  **Test-visible acceptance** (QA, once built):
  - *Pending*: click "Generate outreach kit" on the Command Centre's "Your briefing" box → button disables immediately, label shows "Writing…" + spinning icon, no navigation occurs (`/studio` stays in the URL bar).
  - *Success*: on completion, the button is replaced by "Outreach kit ready — Open in Prospects" with a check icon; following that link to `/studio/prospects` and expanding that same prospect shows the real generated `SalesKitPreview` (not a decorative confirmation of something that didn't actually happen); Billing's usage display (reads the same `usage_events` table) ticks `sales_kit_generated` up by 1 for the org.
  - *Error, generic*: force via a prospect deleted/converted concurrently, or `ANTHROPIC_API_KEY` unset in a test env → button re-enables, red `role="alert"` text appears with the exact server message, retry works without a page reload.
  - *Usage-limit-exceeded*: seed `usage_events` at/over the test org's plan limit for `sales_kit_generated`, click the button → red `role="alert"` text ("Monthly limit reached…") plus a working "View plan" link to `/studio/billing`; confirm **no** new `usage_events` row was inserted for this click (the check must fail before `draftSalesKit()` is ever called) and no new Anthropic call was made.
  - *Accessibility*: confirm `aria-live="polite"` on the action region (screen reader announces the state change without needing focus to move); confirm the button is keyboard-reachable/operable (Tab, Enter/Space) with a visible focus ring; no `aria-label` needed since the button always has real visible text (not icon-only).
  - *Regression*: `SalesKitSection` on `/studio/prospects` still works unchanged — `generateSalesKit()`'s success shape is untouched, only its error shape gained an additive optional field.

- **Status**: Not started

## Complete

### Define the activation funnel over existing events now that PostHog is live

Closed 2026-08-31 — `NEXT_PUBLIC_POSTHOG_KEY` confirmed live in production
(real events captured: 2 active users, 2 sessions, 3 pageviews). Growth &
Analytics verified the authoritative event list directly (`grep -n
"trackServerEvent(" -r src`, not recalled from memory) — all 5 events this
item originally named are real: `org_signed_up`
(`platform-onboarding.ts`), `discovery_run`/`on_demand_search_run`/
`prospect_converted` (`prospects/actions.ts`), `invoice_created`
(`clients/actions.ts`), `platform_subscription_started` (the Stripe
webhook route) — plus 3 more real events not originally named:
`platform_subscription_cancelled` and `prospect_credit_pack_purchased`
(same webhook), and `on_demand_search_run` (the manual "search now"
counterpart to the cron-driven `discovery_run`).

**A single sequential 5-step funnel would have actively misreported real
paying customers as drop-offs** — checked against the real signup/billing
code, not assumed. `platform_subscription_started` is NOT downstream of
`invoice_created`: `submitOnboarding`'s `startMode: "pay-now"` branch
(`platform/onboarding/actions.ts`) sends a brand-new org straight to
Stripe Checkout before it ever reaches `/studio`, and every org's
`subscription_status`/`trial_ends_at` are DB column defaults
(`schema-platform-billing.sql`) set at row-creation, not app logic — so a
real subscriber can hit `platform_subscription_started` within seconds of
`org_signed_up`, with zero prospecting/client/invoice activity ever
happening.

**Shipped as two separate funnels instead**:
- **Funnel A — Activation** (`org_signed_up` → Action `prospecting_run`
  [combines `discovery_run` OR `on_demand_search_run` via a new PostHog
  Action, so the manual search path isn't undercounted] → `prospect_converted`
  → `invoice_created`), sequential order, 30-day conversion window (matches
  `usage-limits.ts`'s calendar-month reset cycle), broken down by
  `agency_type` (already a real property on every `org_signed_up` event,
  bounded set from `AGENCY_TYPES`).
- **Funnel B — Monetization** (`org_signed_up` → `platform_subscription_started`),
  sequential, 30-day window, deliberately separate since its timing is
  decoupled from the activation chain.

Exact click-by-click PostHog UI steps for both (create the `prospecting_run`
Action first, then two Funnels insights) were handed to Hamish to configure
directly — no agent has PostHog dashboard access. `platform_subscription_cancelled`/
`prospect_credit_pack_purchased` are better tracked as simple Trends than
funnel steps (churn/expansion signals, not funnel stages) — noted, not built.

**Honest limitation flagged**: `agency_type` breakdown won't show anything
meaningful until there's real volume across different agency types (2
users today); signup source/channel (referrer, UTM) is NOT capturable —
`analytics-provider.tsx`'s `person_profiles: "identified_only"` means
anonymous pre-signup pageviews never build a PostHog person profile for
`identify-org.tsx`'s later merge to attach UTM data to. A real
instrumentation gap, not a config option that was missed. Also: current
PostHog volume (2/2/3) blends anonymous marketing-site browsing with any
real org signups — it is not itself evidence that 2 organisations have
signed up, and any funnel numbers today are near-meaningless by volume
alone; the value shipped here is the funnel being correctly *defined and
ready*, not a conclusion drawn today. `trackServerEvent`'s fail-open
behavior on a PostHog API error (silently swallowed, per `analytics.ts`'s
own comment) hasn't been spot-checked for real dropped events — worth
revisiting once real volume exists.

### PostHog production key not set — real event taxonomy shipped but very likely capturing nothing live

Closed 2026-08-28 — Hamish set `NEXT_PUBLIC_POSTHOG_KEY` in Vercel
production. First attempt swapped the Name/Value fields in Vercel's UI
(the env var was named after the key's own value, so `process.env.
NEXT_PUBLIC_POSTHOG_KEY` resolved to nothing) — caught by pulling the
actual shipped JS bundle and confirming `posthog.init()` never received a
real key, not by trusting the dashboard's own truncated display. Corrected
and confirmed live via PostHog's own Activity view showing real captured
events (2 active users, 2 sessions, 3 pageviews).

### Route-specific loading skeletons instead of one Command-Centre-shaped skeleton for all 13 routes

Closed 2026-08-31 — read `src/app/studio/(authed)/loading.tsx` (the one
shared skeleton, confirmed a single file for the whole route group) and
the real page shapes of the four routes whose layout diverges most from
Command Centre's stat-card-row-plus-chart shape: Settings (form-heavy —
`settings/page.tsx`'s section-labelled cards), Billing (usage cards —
plan summary, usage bars, 3-column plan grid), Prospects (filter bar +
list — `prospecting-panel.tsx`'s usage card, niche config card, then a
search/filter bar above a list of prospect rows), and Feedback (a single
textarea + submit button). Added `loading.tsx` to each of those four
route folders, matching that page's real layout, using the same plain
pulsing `bg-secondary` block technique as the existing shared skeleton
and `portal/(authed)/insights/loading.tsx` (no new loading-state pattern
invented). The shared `(authed)/loading.tsx` stays as-is and remains the
fallback for the other 9 routes (Command Centre itself, Clients,
Requests, Projects, Campaigns, Website Builder, Knowledge, Help) — its
own comment now explains which routes it still covers and why the
remaining ones are close enough in shape (header + card/list content)
not to need a bespoke skeleton of their own.

tsc/eslint/vitest (229 tests) all green.

### Decide and apply a real rule for Reveal/CountUp motion beyond Command Centre

Closed 2026-08-31 — confirmed the backlog's own audit before touching
anything: read Analytics (`analytics-panel.tsx`) and Billing
(`studio/(authed)/billing/page.tsx`) directly, both genuinely have
numeric-KPI content comparable to Command Centre's stat cards (Analytics'
4 KPI cards; Billing's "usage this month" bars), the other 10 routes don't.
Analytics' `KpiCard` now renders its value through `CountUp` (money KPIs
pass `Math.round(value / 100)` with a `£` prefix, same pence-to-pounds
convention as the Command Centre pipeline-value card; count KPIs pass the
raw value) and its KPI grid is wrapped in `Reveal`, matching Command
Centre's own `<Reveal className="mt-6 grid ...">` wrapper pattern exactly.
Billing's "usage this month" card is wrapped in `Reveal`, and the `used`
half of each `used / limit` usage bar (the number that actually changes
month to month; the limit is a static plan fact) now renders via
`CountUp` — the prospect-researched bar and all 9 secondary fair-use bars.
No new motion variant invented; both routes reuse `Reveal`/`CountUp`
exactly as imported everywhere else. A code comment now lives at the top
of `src/components/reveal.tsx` documenting the scope explicitly (Command
Centre + Analytics + Billing only, the other 10 routes' lack of motion is
intentional) so this doesn't get re-flagged as a "gap" in a future audit.
`npx tsc --noEmit`, `npx eslint`, and the full `vitest` suite (229 tests)
all green.

### email-inbox.ts's inbound-triage matching is From-header-only — no spoofing check

Closed 2026-08-27 — Hamish signed off. Confirmed what's actually available
before implementing: `gmail.users.messages.get(..., { format: "full" })`
(already called for every message, no extra API request needed) returns
every header on the message, including `Authentication-Results` — the
header Gmail's own receiving mail server appends recording its own SPF/DKIM/
DMARC verdicts. `isAuthenticatedSender()` (`email-inbox.ts`) requires an
explicit `dkim=pass` *and* `spf=pass` across any Authentication-Results
header present (per the backlog item's own "SPF+DKIM pass" framing) and
fails closed on everything else — absent, malformed, single-pass, or
ambiguous (`neutral`/`none`) all resolve to "unverified."

`triageRequest()` gained a `forceHumanReview` option (`checkEmailInbox()`
sets it whenever `isAuthenticatedSender()` returns false); when set, it
suppresses every unsupervised email the function would otherwise send under
Hamish's identity — both the auto-send reply (the path the backlog item
named) and the "we need more info" email (an adjacent unsupervised-send risk
not literally named in the backlog but the same category, gated for
consistency — see `DECISIONS.md`). The request still gets triaged and saved
for a human to review in Studio either way; only the autonomous email sends
are blocked. A near-miss (an unverified message that would otherwise have
auto-sent) is logged as its own `request.auto_send_blocked_unverified_sender`
audit event so it's visible whether this protection ever actually mattered.

`computeWouldAutoSend()` and `isAuthenticatedSender()` extracted as pure,
exported, unit-tested functions (same convention as `stripTriage`/
`resolveSender`) — 7 new tests in `email-inbox.test.ts` (genuine pass,
spoofed both-fail, single-pass-only x2, header absent, headers null, case-
insensitive header name, ambiguous verdict) and 5 new tests in
`triage-request.test.ts` covering the eligibility predicate and the
`forceHumanReview` override. Full suite (225 tests) green.

**Open tradeoff, flagged rather than silently resolved**: this trusts *any*
Authentication-Results header present claiming a double pass, without
verifying which mail server appended it — the trustworthy one is the
receiving server's own (identified by its authserv-id before the first
`;`, consistently `mx.google.com` for personal Gmail), but a message
relayed through an intermediate hop could in principle carry an earlier,
forged Authentication-Results header of its own. This wasn't verified
against real production headers before shipping (the backlog item's own
open dependency). The safe default — fail closed on anything short of an
explicit double pass — is applied regardless, so this tradeoff narrows a
false-positive edge case, not the core fail-closed guarantee. Flagged for
Security Auditor re-verification against real fetched headers.

### Fail closed, not open, when `sender.isInternal` resolution errors (triage-request.ts)

Closed 2026-08-27 — Hamish signed off (this item was `Blocked (on Hamish's
sign-off)` pending exactly this). `resolveSender()` (`triage-request.ts`) now
computes `Sender` explicitly from the `organisations` lookup's own `error`
and `data`, exported and unit-tested in isolation: a genuine Supabase error
on the lookup, or an unexpected null org with no error, both resolve to
`isInternal: false` — never the old silent `isInternal: true` default.
`isInternal: true` is now reachable only via a confirmed internal org row or
`client.org_id` itself being absent (a legacy pre-backfill client, not a
lookup failure). The correctly-succeeding paths (confirmed internal org →
`isInternal: true`; confirmed non-internal org → `isInternal: false`) are
byte-for-byte unchanged. 5 new tests added to `triage-request.test.ts`
covering the error case, the null-with-no-error case, both correctly-
succeeding cases, and the legacy-`org_id`-absent case, one of which asserts
`isAutoSendEligible`'s own gate predicate directly per the backlog item's
acceptance criteria. Full suite (213 tests) green; see
`docs/ai-team/DECISIONS.md`.

### Studio's Tabs primitive missing its own CSS transition; 4 unlabelled selects

Closed 2026-08-27 (`b400beb`) — UX/UI Director's static audit found `TabsPanel`
(`src/components/ui/tabs.tsx`) never applied the `.tab-panel-enter` class
despite it already existing in `globals.css` and being used by every other
hand-wired tab panel in the codebase, plus 4 `<select>` elements
(projects-panel, website-project-files-panel, prompt-library-browser,
knowledge-panel) with no accessible label. Both mechanical, both verified
fixed in the actual diff (not just claimed) — see `PRODUCT-ROADMAP.md`.

### Structurally prioritise actions_required on the Command Centre

Closed 2026-08-27 (`2187f6b`) — Product Director scoped it once its
dependency (the screenshot-verification loop) closed: greenlit as a
small, bounded change, deliberately kept separate from show/hide (a real
per-org choice, still honoured) — only the fixed-vs-reorderable position
changed.

### Screenshot-verify the Command Centre card-hierarchy fix (commit 40e0552)

Closed 2026-08-27 — Hamish signed into a real Studio session and handed
the Browser pane to it. Confirmed via exact computed pixel values
(rgb(12,20,33) vs rgb(7,13,24)) that the fix was live and correct but
visually subtle; shipped a follow-up accent ring (`e5931f7`) on top,
re-verified live again after that deploy too.

### Move HealthRing off hardcoded text-primary-foreground

Closed 2026-08-27 (`0c4b85f`) — added an explicit `tone` prop instead of
a `currentColor` switch, since the component has 5 real consumers and a
global switch risked changing 4 of them nobody had audited.

### docs/RUNBOOK.md's stale 5-job cron table

Closed 2026-08-27 (`1ce4eb4`) — corrected to the real 13, cross-checked
against `cron-schedule.ts`'s `CRON_SPECS`.

### stripKit() missing defensive coercion

Closed 2026-08-27 (`419f363`) — brought up to the same standard as
`stripBrief()`/`reconcilePhases()`, plus a real 3-attempt retry loop in
`draftSalesKit()` matching the sibling files' own convention.

### triage-request.ts missing defensive coercion on its tool-call result

Closed 2026-08-27 — added `stripTriage()`/`isWellFormed()` plus a
3-attempt retry loop matching `draft-sales-kit.ts`'s own convention;
`missing_info` (previously read unguarded via `.length`, expected an
array) now coerces safely to `string[]` the same way `stripKit()` does.
This was the one AI call site whose output can reach an unsupervised
client email send (`isAutoSendEligible`), so it was the wrong place in the
codebase to have the weakest defensive treatment. See `DECISIONS.md` for
the full reasoning. Added `triage-request.test.ts` (15 tests). Scope held
to coercion only — `sender.isInternal` gate and auto-send thresholds
untouched.

Follow-up (same day, QA review): `priority`'s fallback was itself
fail-open (`"medium"` on an unrecognized value, which satisfies
`isAutoSendEligible`'s `priority !== "urgent"` check) unlike
`complexity`'s/`covered_by_maintenance`'s fallbacks, which already fail
closed. Changed to `"urgent"`. See `DECISIONS.md`'s follow-up entry —
also corrects that entry's comparison to `draft-sales-kit.ts`, which has
no enum fields and never shared this specific gap.

### Add render/interaction test coverage for the Command Centre card components

Closed 2026-08-27 — added `@testing-library/react`, `@testing-library/jest-dom`,
and `jsdom` as real dev dependencies (per-file `// @vitest-environment
jsdom` pragma, not a global environment switch — every other test file
stays on the faster `node` environment). 25 new tests across
`command-centre-stat-cards.test.tsx`/`command-centre-section-cards.test.tsx`
covering exactly the regression QA flagged (bg-primary reserved for
TodayStrip + actions_required only) plus real-content spot checks.
`page.tsx`'s own inline chart/text/checklist block renderers remain
untested — they're not extracted into standalone functions the way the
stat/section cards are, so covering them would mean a refactor first, not
just writing tests. A real, smaller follow-up if it matters later, not
done as part of this item.
