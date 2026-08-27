# HamishAI — roadmap

Living document. The Product Director keeps this current — update it as part
of finishing a mission, not as a separate chore that falls behind.

## Recently completed (real, shipped, verified live)

- Agency Platform self-serve: Google sign-in, live Stripe billing, real
  signup CTAs, trial-ended email — confirmed working 2026-08-24.
- Command Centre no-code block builder + AI Design Assistant (Phases 5a–5d) — live 2026-08-21.
- AI Website Creation Guide (Discovery → Brief → Tool → Build → QA → Launch) — built and end-to-end verified 2026-08-21.
- Usage-limits enforcement across all 10 metered AI actions, with proactive 80%+ warning emails and purchased-credit headroom accounted for.
- Command Centre home page split into tabs (Overview/Prospects/Clients/Performance) rather than one long scroll.
- Campaigns: create/status-toggle/delete, and an assigned-prospects list with remove — previously create+toggle only.
- Test coverage added for the previously-untested pure logic behind: the Command Centre layout validator (including the CTA-href security allowlist), usage-limit multiplier math, the cron-schedule ↔ `vercel.json` consistency, client health scoring, AI build-phase/brief defensive coercion, and the weekly lead-search rotation algorithm.
- `docs/ARCHITECTURE.md` corrected — it had silently drifted out of date and no longer described the Agency Platform layer at all (see the file's own "2026 update" note).

## Known real gaps (verified against the codebase, not guessed)

- **No campaign UI on the Prospects page** — the only place to see/change a prospect's campaign is Campaigns itself.
- **`docs/RUNBOOK.md` is stale** — describes 5 cron jobs; there are 13 (`src/lib/cron-schedule.ts`). Same class of drift `ARCHITECTURE.md` just got fixed for.
- **No real user-research or usage-analytics history yet** — see `PRODUCT.md`'s "current real status." Growth & Analytics work right now is mostly about building the instrumentation, not reading conclusions off numbers that don't exist yet.
- **`stripKit()` (`draft-sales-kit.ts`) has no defensive coercion** against malformed AI tool-call output, unlike its two siblings (`stripBrief()`, `reconcilePhases()`) — throws instead of degrading gracefully. Low-severity (caught by the outer try/catch), but inconsistent with the established pattern.

## Strategic initiatives (in progress or queued — Product Director owns sequencing)

Nothing queued here yet as of this file's creation — this section starts
empty on purpose rather than pre-filled with invented priorities. The first
real `/mission` run should populate it.

## How this file gets used

A `/mission` run should: (1) check here first for related prior work before
proposing something that either duplicates it or contradicts a real
constraint already recorded, (2) add its own outcome here once genuinely
complete, and (3) leave "known real gaps" honest — remove an item only once
it's actually fixed and verified, not once a PR merges.
