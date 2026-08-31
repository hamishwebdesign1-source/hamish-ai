# HamishAI — agent activity log

A running record of what agents actually did — not a duplicate of git log
(commits already say what changed), this is for the parts git doesn't
capture: what was investigated, what was considered and rejected, what a
mission's overall outcome was. Newest first. Keep entries short — one
paragraph, not a full handoff report (those, if worth keeping, go in
`DECISIONS.md` instead).

---

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
