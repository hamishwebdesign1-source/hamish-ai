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

### email-inbox.ts's inbound-triage matching is From-header-only — no spoofing check

- **Problem**: `email-inbox.ts`'s Gmail search for a client's inbound email is `from:${client.email} in:inbox` (line 59) — matching purely on the message's From header, with no check against `Authentication-Results`, DKIM, or SPF. A convincingly spoofed email into Hamish's own Gmail inbox with a HamishAI-internal client's address in the From field could reach `triageRequest()` and, if it clears the existing complexity/maintenance/priority gates, the unsupervised auto-send path — impersonating a real client to get HamishAI's own AI to auto-send a reply "on their behalf." Found by Security Auditor; real, pre-existing, not introduced by any of today's fixes. Only affects HamishAI's own internal inbox flow (`isInternal: true` path) — tenants don't have this inbound-email integration.
- **Objective**: verify inbound authenticity (DKIM/SPF pass, or Gmail's own `Authentication-Results` header) before treating an email as genuinely from the named client, not just matching the display/envelope From address.
- **User**: Hamish, as the operator of the one account this affects today.
- **Priority**: P1 — real gap on the same autonomous-send path as the P0 item above, but requires actual design work (parsing/trusting `Authentication-Results`, deciding the fallback behaviour when it's absent or ambiguous) rather than a one-line fix, and is a narrower blast radius (one inbox, not every tenant).
- **Expected outcome**: a spoofed From-header email that fails SPF/DKIM either never reaches `triageRequest()` or is force-routed to human review regardless of how "small and covered" the AI judges it.
- **Acceptance criteria**: design note reviewed by Security Auditor before implementation; a test simulating a header-spoofed but auth-failed message confirms it's excluded or force-flagged; no regression to genuine client emails (Gmail messages from real senders already carry `Authentication-Results` in practice — needs confirming against real fetched headers, not assumed).
- **Relevant agent**: Security Auditor to scope the design, Lead Engineer to implement.
- **Dependencies**: **Needs Hamish's explicit sign-off before implementation** (same standing category as the P0 item above). Also needs confirming what header data `googleapis`' Gmail fetch actually returns today before committing to an approach.
- **Status**: Researching

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
- **Status**: Not started

### Decide and apply a real rule for Reveal/CountUp motion beyond Command Centre

- **Problem**: `Reveal`/`CountUp` motion exists only on the Command Centre (`command-centre-stat-cards.tsx`, `today-strip.tsx`); the other 12 `/studio` routes have no equivalent, with no documented reason why. Left as-is this reads as unfinished rather than deliberate, but mechanically spreading animation to every route (most of which are CRUD/list/settings pages with no numeric KPI cards) isn't obviously correct either — verified only Analytics and Billing have comparable numeric-stat displays among the other 12 routes; the rest (Clients, Prospects, Requests, Projects, Campaigns, Website Builder, Settings, Feedback, Knowledge, Help) are list/form-heavy with nothing analogous to animate.
- **Objective**: a made, documented decision — not a mechanical rollout. Apply `CountUp`/`Reveal` to Analytics' and Billing's numeric stat displays (the two routes with genuinely equivalent content to Command Centre's), and write down, in a short code comment or `docs/ARCHITECTURE.md` note, that motion is reserved for numeric KPI/stat-card surfaces specifically, not applied to list/CRUD pages as a default expectation.
- **User**: any Studio user moving between routes — the goal is that the *absence* of motion on, say, Settings reads as intentional (nothing there to animate) rather than as an inconsistency bug.
- **Priority**: P3 — cosmetic/consistency, not a functional gap; worth doing once, not worth blocking on.
- **Expected outcome**: Analytics and Billing's stat cards animate consistently with Command Centre's; a one-paragraph documented rule exists so this doesn't get re-litigated as a "finding" in a future audit.
- **Acceptance criteria**: Analytics/Billing stat displays use the shared `CountUp`/`Reveal` components where they show a comparable numeric KPI; a written rule exists (comment or doc) stating the scope is intentionally limited to KPI/stat surfaces.
- **Relevant agent**: UX/UI Director (confirm Analytics/Billing content matches the Command Centre pattern before implementing), Lead Engineer (apply).
- **Dependencies**: none.
- **Status**: Not started

### Route-specific loading skeletons instead of one Command-Centre-shaped skeleton for all 13 routes

- **Problem**: `src/app/studio/(authed)/loading.tsx` is a single shared skeleton (verified: one file for the whole `(authed)` route group) shaped like the Command Centre's layout, shown while *any* of the 13 routes streams in — so navigating to, say, Settings or Feedback briefly shows a skeleton that looks nothing like the page that's about to render. This directly undercuts the "consistency of interaction patterns across all 13 routes" falsifiable check from the mission's original framing: it's not that the pattern is inconsistent, it's that the one pattern that exists is actively wrong for 12 of the 13 destinations.
- **Objective**: each route (or each meaningfully-different route shape — e.g. one skeleton for list-panel pages, one for form-heavy Settings, one for the Command Centre) shows a loading state that resembles what's about to render.
- **User**: any Studio user navigating between routes, most noticeable on a slower connection or a large org's dataset.
- **Priority**: P2 — real, verified, and moderate effort (per UX/UI Director's audit); not urgent since a wrong-shaped skeleton is a flash, not a broken experience, but it's a genuine visible-polish gap most reviewers would notice.
- **Expected outcome**: no route shows a loading skeleton shaped like a different page's layout.
- **Acceptance criteria**: each route folder (or each distinct page-shape group) has its own `loading.tsx` matching its real layout; Command Centre's existing skeleton stays as-is for that route.
- **Relevant agent**: UX/UI Director (define the groupings), Lead Engineer (implement).
- **Dependencies**: none.
- **Status**: Not started

### PostHog production key not set — real event taxonomy shipped but very likely capturing nothing live

- **Problem**: Growth & Analytics found (evidence-backed, commit `44732b6` confirmed to have shipped the full PostHog event taxonomy and identity-merge code correctly) that `NEXT_PUBLIC_POSTHOG_KEY` is very likely not set in the production Vercel environment — verified in code that `analytics.ts`/`analytics-provider.tsx`/`identify-org.tsx` all correctly no-op when this env var is absent (by design, per this codebase's "degrade gracefully without env vars" pattern), which means the feature is silently inert rather than broken, but also means no real usage events have very likely been captured since it shipped.
- **Objective**: confirm whether the key is set in Vercel production; if not, set it, so the already-built instrumentation starts actually recording real usage.
- **User**: Hamish and any future Growth & Analytics work — everything downstream (activation funnel, retention analysis, feature usage) depends on this being live.
- **Priority**: P1 — blocks all real analytics; trivial to fix (an env var in Vercel), but only Hamish can do it (no agent has Vercel project access).
- **Expected outcome**: real `org_signed_up`/`discovery_run`/etc. events visible in PostHog within a day of a real Studio session.
- **Acceptance criteria**: Growth & Analytics confirms live events arriving in PostHog post-fix.
- **Relevant agent**: Hamish (the env var itself), Growth & Analytics (post-fix verification).
- **Dependencies**: none technical — purely a Hamish action outside the codebase.
- **Status**: Blocked (on Hamish setting the env var)

### Define the activation funnel over existing events once PostHog is confirmed live

- **Problem**: the event taxonomy needed for a real activation funnel already exists (`org_signed_up`, `discovery_run`, `prospect_converted`, `invoice_created`, `platform_subscription_started`) but no funnel definition has been configured, and can't meaningfully be until real events are flowing (see the item above).
- **Objective**: configure an explicit activation funnel in PostHog over these existing events — config only, no new code or new events needed.
- **User**: Hamish/Growth & Analytics, to answer "where do new orgs actually drop off" with real data instead of a guess, once there's enough volume to mean anything.
- **Priority**: P2 — genuinely useful once unblocked, but has no value at all until the key is live and some real signups accumulate.
- **Expected outcome**: a named funnel view in PostHog usable the first time someone asks "why aren't more signups converting."
- **Acceptance criteria**: funnel configured and confirmed to show real (non-zero) step-through data.
- **Relevant agent**: Growth & Analytics.
- **Dependencies**: the PostHog production key item above must be resolved and live first.
- **Status**: Blocked (on the PostHog key item above)

## Complete

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
