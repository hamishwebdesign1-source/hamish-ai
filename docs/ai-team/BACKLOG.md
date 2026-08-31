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
