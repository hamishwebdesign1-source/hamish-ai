# HamishAI — decisions log

One entry per real product/technical decision worth a future reader knowing
the reasoning behind, not just the outcome. Newest first. Every specialist
agent should add an entry here when they make a call that isn't obvious from
the code alone — the same instinct as this codebase's own inline comments,
just at product-decision scope instead of line scope.

---

## 2026-08-27 — Closed the `sender.isInternal` fail-open gap in `triage-request.ts` (Hamish sign-off)

**Decision**: Implemented the P0 `BACKLOG.md` item once Hamish explicitly
lifted the sign-off block. `triageRequest()` previously initialised
`sender = { name: "Hamish AI", isInternal: true }` *before* the
`organisations` lookup and only overwrote it on a lookup that both
succeeded and returned a non-internal org — the lookup's own `error` was
read into a variable that was then discarded. A transient DB read failure
(network blip, connection pool exhaustion) left `isInternal: true` standing
for what could be a tenant's own client, satisfying `isAutoSendEligible`'s
`sender.isInternal &&` gate and risking an unsupervised, zero-human-review
email sent from HamishAI's own address about a business Hamish has no
relationship with.

Extracted the whole decision into a new exported, pure `resolveSender(client,
org, orgError)` function — same reasoning as `stripTriage`/`isWellFormed`
already being separated out: the failure-mode logic needed to be unit-
testable without mocking Supabase or the Anthropic client. It now fails
closed on two distinct cases the backlog item's acceptance criteria called
out as needing separate coverage: a genuine lookup `error`, and a `null` org
with no error (not just "org not found returning null" conflated with "the
query itself failed"). Both now resolve to `isInternal: false`. The only
path that still resolves to `isInternal: true` is `client.org_id` itself
being absent — a legacy pre-backfill client, a structurally different case
from a lookup failure, not something to fail closed on. The two correctly-
succeeding paths (confirmed internal org, confirmed non-internal org) are
untouched.

One deliberate, in-scope side effect worth naming: because `isInternal` now
correctly reads `false` on a lookup error (previously incorrectly `true`),
every other `sender.isInternal`-gated block in `triageRequest()` also now
behaves correctly on that same error path, not just the auto-send gate the
backlog item was scoped around — the "awaiting_info" client email (sent from
`hello@hamishai.org`, signed "Hamish AI") and the calendar-sync call (writes
into Hamish's own personal Google Calendar) both also stop firing on an org-
lookup error, instead of firing as they incorrectly did before. This wasn't
separately scoped work; it's the same variable driving all three checks, so
fixing it once correctly closes all three failure modes rather than only the
one the backlog item named. Confirmed test suite (213 tests, `npm run test`)
and `npx tsc --noEmit -p .` both green after the change.

## 2026-08-27 — Synthesis of the "best in market" mission: what's genuinely done vs. backlogged, and two security items paused for sign-off

**Decision**: Verified both "FIXED" claims from the UX/UI Director's and
AI/Agent Architect's audits directly in the git history (`b400beb`,
`eb8c12d`) rather than taking the summary handed to this pass on faith —
both real, both QA-verified, both matched what their commits actually
changed. Wrote 8 new `BACKLOG.md` entries for the genuinely real,
not-yet-built findings from this mission's three parallel specialist
passes (UX/UI Director, AI/Agent Architect, Growth & Analytics, Security
Auditor): two security gaps in `triage-request.ts`/`email-inbox.ts`'s
autonomous-send path (P0 and P1 respectively — deliberately paused on
Hamish's explicit sign-off rather than implemented directly, since both
touch the gate on an unsupervised client-facing email send, which is a
standing "needs human approval" category per `PRODUCT.md`), the AI
"recommend → act" wiring gap (P2, the single highest-leverage AI-nativeness
opportunity found — also flagged for Hamish sign-off since it changes how
easily a metered AI action can be triggered), a motion-consistency decision
(resolved now rather than left open: extend `Reveal`/`CountUp` to Analytics
and Billing specifically, since those are the only two of the other 12
routes with comparable numeric-stat content, and explicitly do *not* spread
it to the remaining list/CRUD routes), route-specific loading skeletons
(P2), the missing production PostHog key (P1, pure Hamish action — an env
var, not code), the resulting activation-funnel-definition follow-up (P2,
blocked on the key), and a `useOptimistic` scoping spike (P2, Researching —
deliberately not committing to implementation before UX/UI Director and
Lead Engineer name specific, bounded candidates).

**Deliberately not backlogged as separate buildable items**: AI/Agent
Architect's opportunities #2 (one-click AI-drafted check-in message off
`engagement_risk`) and #3 (extending autonomous triage to tenant orgs) —
both real ideas, but #2 is speculative until opportunity #1 proves the
recommend→act pattern actually gets used, and #3 is blocked on a genuine
infra prerequisite (tenant-scoped outbound email) and is a bigger,
cross-cutting call for a future mission's scoping, not a task ready to
queue today. Backlogging speculative follow-ons to a not-yet-built feature
would be exactly the kind of premature scope this role exists to push back
on.

**Final verdict on the mission** ("make Studio feel like the best AI SaaS
platform"): most of what shipped today is audit-and-safety work, not the
visible "feels premium" transformation the mission's wording implies on
its face. Concretely different for a user *today*: Studio's tab panels now
animate consistently everywhere they appear (previously only some did, an
inconsistency a careful user would eventually notice), 4 form controls are
now screen-reader accessible, and one real security gap (the `priority`
fail-open on an autonomous client email send) is closed. Against this
mission's own three falsifiable checks from the framing pass: "no dead-end/
dishonest surfaces" — no new dishonest surface found or introduced;
"consistency of interaction patterns across all 13 routes" — one real gap
closed (tabs), several real gaps found and documented but not yet closed
(motion, loading skeletons, eyebrow headers); "AI surfaces feeling agentic
not bolted-on" — the AI review found Studio's existing AI-nativeness is
already fairly strong and honest (not fabricated), identified the one
concrete gap worth closing (recommend→act), and along the way found a real
live safety issue in the AI pipeline that mattered more than the original
"feels agentic" framing and was correctly prioritised over it. That
re-prioritisation was the right call, not scope drift — a safety gap on an
unsupervised email-send path is a precondition for AI trust, not a
distraction from it. The honest summary for Hamish: today mostly produced
a well-scoped, prioritised backlog and one real safety fix, not a visible
platform-wide polish pass — the polish work is now queued, not done.

## 2026-08-27 — Fixed `priority`'s fallback fail-open gap in `stripTriage()`; corrected this doc's own comparison to `draft-sales-kit.ts`

**Decision**: `toEnum()`'s fallback for `priority` (added in the entry
directly below this one) defaulted an unrecognized/malformed value —
wrong casing, a hallucinated value outside `PRIORITY_VALUES` — to
`"medium"`. `isAutoSendEligible` requires `triage.priority !== "urgent"`
to allow an unsupervised, zero-human-review client email send, so a
malformed value that may well have been *intended* as `"urgent"` (e.g.
`"Urgent"`) silently lost its human-review guarantee, with `isWellFormed()`
still reporting `true` and no trace in `request.auto_sent`'s metadata that
any coercion happened. `complexity`'s fallback (`"M"`) and
`covered_by_maintenance`'s fallback (`false`) both already fail *closed*
(toward blocking auto-send) when malformed — `priority` was the one field
whose fallback failed *open*. Changed the fallback to `"urgent"`: this
costs nothing (it only ever routes an extra request to human review, never
blocks or mis-sends anything) and closes the gap. QA caught this in review
of the commit below; not caught at the time because the coercion work
focused on "never crash / never save a structurally wrong type," not on
each fallback's *direction* of safety once the field went on to gate a
real send decision.

**Correcting this doc**: the entry below frames this fix as "the same
`stripKit()`/`isWellFormed()` defensive-coercion standard" as
`draft-sales-kit.ts`. That's accurate for the coercion *architecture*
(guard every field, never trust the cast, retry loop) but QA flagged, and
this note confirms, that it doesn't hold for this specific failure mode:
`draft-sales-kit.ts` has no enum fields and no `toEnum()`-equivalent, so it
never had — and doesn't share — this fail-open-on-an-enum-fallback gap.
`toEnum()` and this class of "which direction does an unrecognized value
default to" question are unique to `triage-request.ts`, the one call site
whose enum output (`priority`) directly gates an autonomous send decision.
Read the entry below as "brought the coercion pattern up to the same
standard," not "had, and fixed, the identical bug."

## 2026-08-27 — Brought `triage-request.ts` up to the `stripKit()`/`isWellFormed()` defensive-coercion standard

**Decision**: `triage-request.ts` was the only AI tool-call site in the
codebase reading a forced Claude tool result with an unguarded `as
TriageResult` cast and no retry — `missing_info` (meant to be `string[]`)
was read directly via `triage.missing_info?.length`, the exact "field came
back as a bare string" failure mode `research-lead.ts` and
`draft-sales-kit.ts` already defend against. Added `stripTriage()` (coerces
every field: string enums fall back to a safe default —
`category`→`"other"`, `complexity`→`"M"`, `priority`→`"medium"` (later
corrected to `"urgent"` — see the entry above this one) —
`missing_info` coerces to `string[]` via the same `toStringArray` shape as
`draft-sales-kit.ts`'s `stripKit()`, `covered_by_maintenance` coerces to a
real boolean rather than trusting a truthy value, `suggested_task` is
dropped entirely if every one of its own fields comes back empty) plus
`isWellFormed()` and the same 3-attempt retry loop `draftSalesKit()` uses,
replacing the single unguarded `anthropic.messages.create()` call.

**Why this matters more here than on its siblings**: this is the one AI
call site whose output (`draft_response` specifically) can flow straight
into an unsupervised, zero-human-review client email send
(`isAutoSendEligible` → `sendClientEmail`) — currently gated to
`sender.isInternal` (HamishAI's own org) only, but the single most
autonomous write path in the product was also the one with the weakest
defensive treatment on its input. `missing_info.length` deciding
`awaiting_info` vs `triaged` status directly determines which branch of
that logic runs, so a bare-string `missing_info` wasn't just a rendering
bug — it could `.length` on a string (character count, not "did we ask a
question") and mis-route status.

**Scope discipline**: did not touch `sender.isInternal`, the
`isAutoSendEligible` confidence/eligibility thresholds, or any other
business logic — this is the same coercion-only scope as the prior
`stripKit()` fix (see `BACKLOG.md`'s Complete section). Added
`triage-request.test.ts` (15 tests) mirroring `draft-sales-kit.test.ts`'s
own test shape, including the exact "bare string instead of array"
regression case.

## 2026-08-27 — Set up the AI product team; corrected `docs/ARCHITECTURE.md`

**Decision**: Built a 7-agent specialist team (`.claude/agents/`) plus a
`/mission` orchestrator skill and this shared-memory folder, rather than
one general-purpose agent handling everything.

**Why**: A single agent doing strategy, design critique, implementation, and
QA on the same turn tends to rubber-stamp its own work — "the code works,
therefore we're finished" without a genuinely separate pass asking "is this
actually good?" Separate specialists with separate system prompts (and
explicit instructions to *not* automatically agree) give a real review
chain instead.

**Also found and fixed while setting this up**: `docs/ARCHITECTURE.md`
explicitly stated *"There is deliberately no `organisations` table separate
from `clients`"* — no longer true. The entire `/studio` Agency Platform
layer (multi-tenant orgs, platform billing, Command Centre, 13 cron jobs
not 5) had been built with no corresponding update to this file. Corrected
in place rather than left to keep misleading the next reader (human or
agent). `docs/RUNBOOK.md` has the same class of drift (still describes 5
cron jobs) and has not yet been fixed — flagged in
`PRODUCT-ROADMAP.md`'s "known real gaps."

**Not built**: standalone Market/Competitor Research and Content/Marketing
agents — no real recurring workload for either yet (see
`docs/ai-team/README.md`'s team table). Revisit if one shows up.
