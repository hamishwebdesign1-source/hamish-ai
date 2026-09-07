# HamishAI — agent activity log

A running record of what agents actually did — not a duplicate of git log
(commits already say what changed), this is for the parts git doesn't
capture: what was investigated, what was considered and rejected, what a
mission's overall outcome was. Newest first. Keep entries short — one
paragraph, not a full handoff report (those, if worth keeping, go in
`DECISIONS.md` instead).

---

## 2026-09-03 — Studio Design Audit: full review → build → post-build-review loop, 18 items shipped

Hamish's mission: make `/studio` feel like one cohesive, premium, world-class
AI-native product across the full customer journey, following the explicit
review-then-build-then-review-again process rather than jumping to code.
Full detail (all seven specialists' original findings, every prioritised
item, every build entry, the post-build re-review, and before/after scores)
lives in `STUDIO_DESIGN_AUDIT.md` at the repo root — this entry is the short
summary `HANDOFF-FORMAT.md`'s own conventions ask for here.

**Phase 1 (read-only review)**: UX/UI Director, Product Director, AI/Agent
Architect, Lead Engineer, QA Engineer, Growth & Analytics, and Security
Auditor each independently reviewed the entire `/studio` codebase (no
authenticated session was available to any of them — every finding
code-derived). Two specialists independently converged on the same finding
without coordinating (AI-surface fragmentation — Product Director and
AI/Agent Architect both flagged the same 3-surface/2-meter redundancy);
UX/UI Director and Lead Engineer independently quantified the same
cohesion problem (12x duplicated page headers, 4 different content
max-widths). No cross-tenant security gap found.

**Phase 2 (build)**: 18 prioritised items built across 5 tiers — a shared
`StudioPageHeader` + standardised `max-w-4xl` across 11 pages;
`prospecting-panel.tsx` split from 1,920 lines into 12 files; 7 missing
`loading.tsx` routes backfilled; the 3 AI "ask about your business"
surfaces consolidated onto one engine/one usage meter (`ClientsCopilot`
retired); a misleading AI badge removed from a deterministic feature; a
4-way silent assignee-select rollback fixed; a Billing link added to the
product's highest-intent conversion moment; the onboarding tour and
Command Centre checklist reconciled into one "what to do first" story;
7 accessibility regressions fixed; 3 destructive controls (cancel
subscription, remove client/team member) given the established confirm
pattern; Feedback merged into Help; real dialog semantics added to two
hand-rolled overlays; PostHog step instrumentation added to onboarding;
a persistent trial-status indicator added. One lead-engineer subagent
stalled mid-task (session timeout) after finishing its actual code and
writing its own `DECISIONS.md` entry but before committing — the
orchestrator reviewed every diff against the stated task, re-ran
`tsc`/`eslint`/the full test suite independently, and committed on the
agent's behalf once satisfied (commit `e253fe0`). Baseline held clean
throughout: `tsc` clean, Studio/Platform lint-clean, test count moved from
416→415 (one test correctly deleted for a retired usage-event type), never
broke.

**Phase 3 (post-build review)**: the same seven specialists re-reviewed
the actual shipped result against real current source, not the audit
doc's own prose. Verdict: every Phase 2 claim checked out under spot-check
(no invented "fixed" claims). Two real regressions were caught and fixed
in a final pass — a silent-failure bug reintroduced in a sibling control
built in the same Tier 4 commit (`ClientMembersControl.remove()` in
`clients-panel.tsx` discarded its Server Action's error, the exact bug
class Tier 3 #7 had just fixed elsewhere), and a stale tour line still
pointing new users at the just-retired Clients-page AI copilot. Both
independently caught by 2+ specialists. One process gap this entry itself
exists to close: `BACKLOG.md`/`AGENT-LOG.md` updates that the audit doc's
own text claimed would happen didn't happen until Lead Engineer's
post-build pass caught the gap — see `BACKLOG.md`'s new entries for what
was genuinely deferred (not silently dropped).

**Not built, deliberately** (named, not silently dropped — see
`STUDIO_DESIGN_AUDIT.md` section 2 and `BACKLOG.md`): a coach-mark tour
rebuild, Campaign budget/spend tracking, merging Website Builder into
Projects, a dormancy/re-engagement email (outreach-adjacent, needs
Hamish's own sign-off), a Command Centre density pass (needs real usage
data first), and two shared-primitive refactors (`StudioEmptyState`,
`ConfirmDeleteButton`) scoped but not built this pass — real, cheap,
correctly backlogged rather than rushed at the end of an already-large
mission.

Not pushed to `main`/production — all 20 commits are local, per the
standing approval boundary.

## 2026-08-31 — "AI ROI" mission: a real, attribution-based figure shipped to Billing

Hamish's own pick, after being offered a choice between "AI ROI number,"
predictive churn detection, and a no-code automation rules engine — the
smallest, most self-contained option, deliberately, given the prior
session's own diminishing-returns finding on small polish waves. Product
Director scoped it by reading the actual schema first, not assuming: found
`usage_events` has no entity reference at all (can't attribute an action to
a specific prospect), `prospects` has no `converted_at` column
(`clients.created_at` is the real proxy), and `research_generated_at` had
to be excluded from the attribution rule because it now runs automatically
on every discovered prospect, no longer distinguishing real AI effort from
mere existence. Landed on: a client counts as AI-assisted if a sales kit or
website mockup was generated for its source prospect before it signed —
correlation, disclosed as such, not causation. Lead Engineer built it
(`src/lib/studio-ai-roi.ts` + a new Billing card), then QA and UX/UI
Director reviewed in parallel and both found real issues rather than
rubber-stamping: QA caught a genuine date-comparison bug (raw ISO-string
`<=` can invert chronological order across JS-vs-Postgres timestamp format/
precision differences within the same second — switched to epoch-ms
comparison); UX/UI Director caught that the honest "0 of N AI-assisted"
state read as a bare discouraging verdict with nothing else on it, and that
the card's own title over-promised a £ figure it usually won't have.
QA agent stalled once mid-run (600s watchdog) but had already written its
fix and tests before stalling — recovered from the working tree, not lost.
298 tests passing, `tsc`/`eslint`/`npm run build` all clean, independently
re-verified by the orchestrator after each agent's pass. Not live-browser
verified — no session/credentials available this run; flagged for Hamish
to eyeball on `/studio/billing`. Committed (`74651a2`, `d256e99`), not
pushed pending Hamish's go-ahead.

## 2026-08-31 — "/studio-focused SaaS improvements" mission: 7 shipped changes, 2 live-verified in a real session

Hamish redirected the team's focus to `/studio` specifically (not the
marketing site or `/portal`). Shipped, in order: motion consistency
(Reveal/CountUp on Analytics/Billing) + route-specific loading skeletons;
`useOptimistic` on prospect status actions (candidate 1 of 3 scoped, 2
deliberately deferred) plus 3 adjacent silent-failure bugs; the PostHog
activation funnel spec (Growth caught that a naive single funnel would
have misreported real paying customers as drop-offs — split into two);
an ambient background treatment for Studio (activated the previously-unused
`.aurora-bg` utility, cool-navy direction picked by Hamish); and the
"recommend → act" feature wiring Command Centre's AI recommendations to a
real one-click outreach-kit generator. Two real data-loss incidents hit
`BACKLOG.md`/`DESIGN-SYSTEM.md` from concurrent agents editing shared docs
without committing in between — both recovered from agents' own handoff
reports, not silently lost; worth a process fix (commit shared docs more
often between parallel dispatches) rather than relying on recovery each
time. Hamish signed into a real Studio session twice for live verification:
caught that the background glow's original alpha (5-6%) was technically
correct but imperceptible ("where?") — bumped to 16-18% and re-confirmed
visible; and confirmed the outreach-kit button links through to a real,
specific, non-generic generated kit. See `BACKLOG.md`'s "Complete" section
for full technical detail per item, `DECISIONS.md` for the concurrent-edit
process note.

## 2026-08-27 — "Best in market" mission synthesis: 8 backlog items, 2 real fixes verified, honest verdict delivered

Product Director closed out the "make Studio feel like the best AI SaaS
platform" mission after three parallel specialist passes (UX/UI Director,
AI/Agent Architect, Growth & Analytics) and two rounds of fixes. Verified
both claimed "FIXED" items directly against git history rather than
trusting the handoff summary (`b400beb` — Tabs transition + 4 unlabelled
selects; `eb8c12d` — `priority` fallback fail-open closed) — both real.
Also independently re-verified the security findings that motivated
pausing rather than shipping: `sender.isInternal`'s default-then-overwrite
pattern in `triage-request.ts` does fail open on a DB error, and
`email-inbox.ts`'s Gmail query (`from:${client.email} in:inbox`) is
confirmed From-header-only with no auth check. Wrote 8 new `BACKLOG.md`
entries covering every genuinely real, not-yet-built finding; updated
`PRODUCT-ROADMAP.md`'s shipped and known-gaps sections. Verdict: today
shipped real but narrow value (consistent tab animation, 4 accessibility
fixes, one closed safety gap) plus a well-scoped backlog — not the
visible platform-wide "feels premium" transformation the mission's
literal wording implies. That's an honest outcome, not a failure: a
security gap on an autonomous client email-send path correctly took
priority over cosmetic polish once found. Two security items and one
new AI-triggered-usage feature explicitly paused for Hamish's sign-off
rather than built unilaterally. Full reasoning in `DECISIONS.md`.

## 2026-08-27 — Closed the last Command Centre audit backlog item

Actions Required now renders in a fixed position (right after the stat
row/checklist, before any tab) rather than wherever an org's own saved
block order put it — the position half of the "look here first"
promise the color/ring fix only handled the visibility half of.
Deliberately kept show/hide as a real per-org choice via Settings —
only position is now fixed, not existence. `2187f6b`. This closes every
item opened by the 2026-08-27 Command Centre audit.

## 2026-08-27 — Retracted a backlog item: "no way to clear demo data" was wrong

Filed "Add a real clear-demo-data affordance" earlier the same day based
on a live pass that only read page text, never expanded a client card.
Clients already has a real, proper delete flow — a type-the-business-
name-to-confirm "Delete this client's data" control
(`clients-panel.tsx`), wired to `deleteClientData()` — just behind the
card's expand toggle, same collapsible convention as everywhere else in
this app. Removed the backlog item rather than leave a wrong finding
standing once it was already committed and pushed. Same self-correction
discipline as the session's earlier retracted IDOR finding: re-verify
before trusting a shallow first pass, and say so plainly when a finding
turns out wrong rather than quietly deleting it.

## 2026-08-27 — Live-verified the Command Centre fix, then closed the real gap it found

Hamish signed into a real authenticated Studio session and handed the
Browser pane to it — the actual unblock for the "no agent has Studio
credentials" gap from earlier the same day (agents still can't create
accounts or enter credentials themselves; a human signing in and letting
an already-authenticated session be driven is the legitimate path
around that, not an exception to it). Read exact computed pixel values
from the live page: `40e0552`'s bg-primary/bg-card split is real and
correctly applied (rgb(12,20,33) vs rgb(7,13,24)) but visually subtle.
Rather than widen `--primary` itself (checked first — it's shared with
`Button`'s default variant, would've silently changed every primary
button across Studio), added a scoped `ring-accent/50` highlight to
exactly TodayStrip and `actions_required`. Committed `e5931f7`, not yet
pushed/deployed/re-verified live as this entry was written.

## 2026-08-27 — First real mission: Command Centre visual hierarchy

Ran manually (the `/mission` skill and `.claude/agents/*` subagents aren't
resolvable from this session — they load once at session start and this
session's root only moved to the repo mid-conversation; needs a genuinely
fresh session to use the real `subagent_type`/`/mission` mechanism). Ran
the same chain by hand instead: UX/UI Director audited the Command Centre
(code-grounded — no Studio login available), found `bg-primary` had
drifted onto every card instead of the two genuinely-featured surfaces
(TodayStrip, actions_required), flattening the page's hierarchy. Product
Director approved the safe subset (the color-tier fix + 3 missing
aria-labels) and deferred the riskier part (always-rendering
actions_required first) pending a real screenshot. Lead Engineer
implemented, verified (tsc/eslint/full suite clean), committed as
`40e0552` — not pushed. QA independently re-verified and found one real,
non-blocking issue (`HealthRing`'s hardcoded token drift) plus a genuine
test-coverage gap over these files — both logged in `BACKLOG.md`. Full
loop closes once Hamish screenshots the actual authenticated result — see
`BACKLOG.md`'s "In progress" item.

## 2026-08-27 — AI product team stood up

Product Director, UX/UI Director, Lead Engineer, AI/Agent Architect, QA
Engineer, Growth & Analytics, Security Auditor agents created
(`.claude/agents/`), plus a `/mission` orchestrator skill and this shared
memory folder. Grounded in an actual inspection of the codebase (stack,
auth, DB, routes, testing, deployment, existing AI integrations) rather than
a generic template — see `docs/ai-team/DECISIONS.md` for the reasoning and
the real `docs/ARCHITECTURE.md` drift this surfaced and fixed. No mission
has run yet; this log starts here.

## 2026-09-06 — Public documentation for launch

Mission: "Create all public/customer-facing documentation needed to launch
the Agency Platform, and recommend where it should be hosted." Orchestrator
audited first (legal pages, existing FAQ content, route listing) before
dispatching — found Terms/Privacy already solid and a real 24-entry FAQ
(`STUDIO_FAQS`) already written but trapped behind auth. Product Director
re-verified that audit independently rather than rubber-stamping it,
confirmed the hosting call (in-app, existing Vercel pipeline — no new
tooling cost, none of `README.md`'s approval-boundary triggers apply),
and scoped the real gap tightly: one `/help` page, not a documentation
site. Explicitly rejected a status page, changelog, docs platform,
API docs, and a Trust Center, each with its own reasoning — see
`DECISIONS.md`'s matching entry. Lead Engineer built exactly that scope,
cross-checking the "Getting started" steps against real onboarding
content instead of inventing them. Orchestrator independently
re-verified (`tsc`/`eslint`/full `vitest` suite 467/467/`npm run build`,
confirmed `/help` builds as a static route) before committing —
`1bbe8ac`, pushed. Live-deploy confirmation still pending as this entry
is written.

## 2026-09-07 — Edinburgh Solutions: unlocked lead generation (account-level data change, no code)

Hamish asked directly for his own real Studio account ("Edinburgh
solutions", `org_id af543a0c-6ae2-418a-9816-8b87a7b7e844`) to get
unlimited lead generation. Investigated before touching anything:
`usage-limits.ts`/`discover-leads.ts` already have a blanket
`organisations.is_internal` flag that exempts an org from every usage
cap — but it also skips the Stripe billing requirement entirely and
rebrands all client-facing output (proposals, invoices, portal) from
the org's own name to "Hamish AI" (confirmed via a full grep across
25+ call sites, e.g. `proposal-tokens.ts`, `portal-org-branding.ts`,
`monthly-report.ts`). That's much broader than "unlimited leads," so
flagged the tradeoff to Hamish via AskUserQuestion rather than picking
one unilaterally. He chose the targeted fix.

Also found a real, separate bug while checking the account's actual
row: `trial_ends_at` was `2026-08-31`, already a week in the past —
`discoverLeads()`'s billing gate (`discover-leads.ts:448`) was
blocking this org from running lead discovery *at all* right now,
independent of any usage cap. Fixed both in one data update (existing
columns, no migration): `purchased_prospect_credits` → 999999 (the
real, existing top-up mechanism — `discover-leads.ts:472` scopes this
to `prospect_researched` only, no other usage type affected) and
`trial_ends_at` pushed to 2036 (kept `subscription_status: "trialing"`
rather than faking `"active"` with no real Stripe subscription behind
it — `stripe_customer_id` is still null for this org). Live-verified
via Claude-in-Chrome, signed into the real account: `/studio/billing`
now shows "Trial · 3403 days left", `/studio/prospects` loads with no
billing-required blocker and "Find prospects now" enabled. No code
changed, so no tsc/eslint/vitest/build ritual applies here — the only
verification is the live DB row and the live authenticated page.

## 2026-09-07 — Fixed research-lead.ts hardcoding £ (GBP) for every prospect regardless of location

Hamish reported directly, with a screenshot: searching Prospects for
"New York" returned one result, "Laundry Queen" (a real Brooklyn
laundromat), priced at "£1,500-£3,000" — pounds for a US business.
Investigated rather than assuming: `research-lead.ts`'s
`estimated_project_value_band` enum had the £ symbol hardcoded into
every value, no currency concept at all — this pipeline was originally
built only for HamishAI's own Edinburgh-based leads and never updated
for Studio's per-org, any-location search. Fixed by adding a `currency`
field (GBP/USD/EUR) the model derives from the business's real location,
making the band itself currency-neutral and combining the two at
render time. Backward compatible with existing cached research (no
migration) via a normalization helper that strips any baked-in symbol
before every lookup.

Caught a real regression while fixing it: putting the new formatting
helper in research-lead.ts itself broke `npm run build` (Turbopack
couldn't bundle its server-only `node:tls` dependency into a `"use
client"` component that imported it) — moved the pure helpers into a
new `src/lib/value-band.ts`. tsc and vitest were both clean and didn't
catch this; only the build step did.

Live-verified end to end: re-ran research on the actual "Laundry Queen"
prospect in the real Edinburgh Solutions account after deploying —
confirmed via direct DB read (`currency: "USD"`,
`estimated_project_value_band: "1,500-3,000"`) and on the live Prospects
page (`$1,500-$3,000`), with every other existing GBP prospect on the
same page still rendering correctly with `£`. Committed `42d8f5f`,
pushed. `npx tsc --noEmit`, `npx eslint`, full `vitest` suite
(467/467), and `npm run build` all green.

Logged a related but separately-scoped issue found along the way —
research-lead.ts's system prompt still hardcodes "Hamish AI, Edinburgh-
based" for every tenant, not just the currency band — as its own
"Not started" `BACKLOG.md` item rather than folding it into this fix.
Also gave an honest, evidence-based answer on the other half of what
was reported (only 1 result for "New York"): the search brief
deliberately only surfaces weak/no-web-presence businesses, so a low
yield in a saturated market like NYC is plausibly by design, not a bug
— flagged as worth watching across more searches rather than treated
as confirmed either way on one data point.

## 2026-09-07 — Prospect-generation pipeline audit (ideas-only mission)

`/mission` dispatched an AI/Agent Architect to get real evidence (not
guesses) on four open questions in `discover-leads.ts`/`research-lead.ts`:
whether the recently-fixed GBP-hardcode issue's sibling ("Hamish AI"
framing) actually contaminates tenant-facing content, whether the "New
York → 1 result" report is the search tool working as designed, whether
the currency fix's EUR path actually works (only USD had been
live-verified), and whether `computeLeadScore`/`computeScoreBreakdown`
diverging is a real problem. No code changed — evidence-gathering only,
per the mission's own "ideas only first" scope.

**Real, live-confirmed finding, escalated P2→P1**: `research-lead.ts`'s
`RESEARCH_TOOL` schema hardcodes "Which Hamish AI service(s) fit best" as
a field description (independent of the already-known system-prompt
hardcode) — live-tested against a bookkeeping-firm identity and a
marketing-agency identity, both still came back recommending
"redesign/AI chat assistant/booking system," Hamish's own catalogue, not
what those businesses actually sell. This flows unfiltered into
`draft-sales-kit.ts`/`draft-website-mockup.ts` — real outreach content a
tenant sends to their own prospects — directly undermining those two
files' own already-correct tenant-aware framing. Full writeup and fix
plan in `BACKLOG.md`'s matching entry (now "Ready").

**Saturated-market yield ("New York" question) — resolved with real
data, mostly as "working as designed"**: live-replicated the exact
production search prompt/tool/model across 6 real locations (New York,
Akron OH, American Fork UT, Leeds, Linlithgow control, Lyon). New York
reproduced the thin yield (2 candidates) and was the only location that
burned its full search budget and needed the existing no-tool-use safety
nudge — consistent with a genuinely thin market, not a broken prompt.
Every other location, including the small-town control, returned a
healthy, genuine result. Not closed as "proven," logged as "watched" —
worth re-checking if the same near-exhausted-budget pattern recurs for
another huge market (LA, Chicago, London).

**Side finding**: 5 of 6 test locations consumed the full `maxSearchUses:
10` on-demand budget, suggesting the background rotation's `maxSearchUses:
5` default is very likely leaving real yield on the table — a genuine
ongoing-cost tradeoff, logged as its own backlog entry needing Hamish's
sign-off, not decided here.

**EUR currency path confirmed working** (Lyon, France candidate returned
`currency: "EUR"` correctly) — closes the one untested case from the
42d8f5f currency fix.

**`computeLeadScore` vs `computeScoreBreakdown` divergence confirmed
real, not usually-agreeing**: since the pipeline's own brief only
surfaces no/weak-website businesses, the modal real prospect has
`siteCheck === null`, which collapses `computeLeadScore` to 2-3/5
regardless of value band or problem count — while `computeScoreBreakdown.overall`
(what Studio's default sort uses) still varies on those same inputs.
Concrete example in the backlog entry shows two very different real
leads tying on `/admin/leads`'s sort but clearly separating on Studio's.
Flagged as a product judgment call (which formula wins), not resolved
here.

Six new/updated `BACKLOG.md` entries in total (one escalated to P1/Ready,
five new P2/P3 items — scoring divergence, search-budget sign-off,
currency-blind value scoring, thin-yield messaging, dedup fallback,
discoverLeads/searchProspectsNow shared-logic duplication). Two
gitignored scratch scripts used for the live testing
(`scratch/audit-lead-pipeline.mjs`, `scratch/audit-recommended-services-skew.mjs`),
not committed.

## 2026-09-07 — Built and QA'd BACKLOG.md item #1 (research-lead.ts "Hamish AI" hardcode)

Hamish said "start 1" against the prospect-pipeline audit's ranked
findings above. Lead Engineer built it (commit `84bd34c`): `research-lead.ts`
now threads a real `sender: {name, isInternal, agencyType}` through its
system prompt, concept-analysis prompt, and `RESEARCH_TOOL`'s
`recommended_services` field description, following `draft-sales-kit.ts`'s
already-correct pattern exactly. Two real call sites updated
(`researchProspect()`, `discover-leads.ts`'s `insertCandidates()`); the
two genuinely internal-only call sites (`/admin`, the concept-page deep-
research job) correctly left on the default. 477/477 tests green.

QA then verified live against real production data, not just unit
tests: ran the actual `researchLead()` against the real "Edinburgh
Solutions" org (agencyType "AI Analytics") on a real, never-before-
researched prospect — `recommended_services` came back as that org's own
catalogue ("Custom KPI dashboards," "One-off data audit," "Monthly
performance reports"), not the old Hamish-specific default. Separately
confirmed HamishAI's own internal pipeline produces byte-identical output
to before the fix (no regression). Two real findings from QA's pass,
both closed same-session: (1) the building agent's own leftover
verification script in `scratch/` was breaking `npm run build`/`tsc` for
anyone else in the checkout — traced to `scratch/` never actually being
in `.gitignore` despite several sessions' comments assuming it was;
fixed by deleting the stray file and adding `scratch/` to `.gitignore`
(`2e968b1`); (2) `recommended_services` (the field this fix touches)
isn't actually rendered anywhere in Studio's own `research-summary.tsx`
today — a tenant only sees its effect indirectly, through the AI sales
kit it feeds into. Logged as a small new backlog item rather than
silently left unnoted.

BACKLOG.md's matching entry marked Complete.

## 2026-09-07 — Scoped a P0 cross-tenant data-isolation gap in `/admin` (found, not fixed)

Found as a side effect of the prospect-pipeline audit's #2 fix
(canonicalizing the score sort in `/admin/leads`, commit `cd1095d`):
`/admin`'s Supabase queries have no `org_id` filter anywhere.
Security Auditor's full scoping pass confirmed this is systemic across
`admin/actions.ts` (1,210 lines, zero `org_id` references) and both
`prospects` and `clients` — not isolated to the one page that surfaced
it. Live counts: 19 of 196 `prospects` rows and 3 of 7 `clients` rows
belong to a real, live, paying Studio tenant ("Edinburgh Solutions"),
currently visible inside HamishAI's own internal admin tool. Confirmed
write-side, not just read: real Stripe subscription start/cancel, real
invoice creation, real client-portal member invites, real deletes, and
real costed Anthropic calls are all triggerable against another
tenant's data by raw id, no ownership check. Root cause: `/admin`
predates the `organisations`/`memberships` layer and was never
retrofitted. Zero evidence of actual destructive/financial misuse found
in `audit_log` for the unambiguous action types — but the research/
sales-kit audit trail can't distinguish a tenant's own legitimate usage
from a possible `/admin`-side action against their data, since both
hardcode `actor: "admin"` (logged as its own separate P2 gap).

Flagged directly to Hamish as P0, with a clear ask: whether `/admin`
should simply be locked to HamishAI's own org, or whether he wants a
real, explicit, audited cross-org oversight capability instead of the
current accidental default. Nothing fixed yet — investigation only, per
this team's own security-change approval boundary. Full detail in
`BACKLOG.md`'s matching entry.
