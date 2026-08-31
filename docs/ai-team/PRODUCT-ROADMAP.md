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
- "Best in market" audit mission (2026-08-27, `f4694b1`..`5880446`): Studio's `Tabs` panel now animates on switch consistently with every other hand-wired tab panel (was silently missing the CSS class despite it already existing) — `b400beb`. Four previously-unlabelled `<select>` elements (projects-panel, website-project-files-panel, prompt-library-browser, knowledge-panel) now have real accessible labels — `b400beb`. `triage-request.ts` — the one AI call site whose output can reach an unsupervised, zero-human-review client email send — brought up to the same defensive-coercion standard as its siblings (`083deeb`), then a real fail-open gap in that same fix's `priority` fallback was caught by QA and corrected (`eb8c12d`). Two further pre-existing security gaps on that same send path, found by Security Auditor and approved by Hamish: `sender.isInternal` now fails closed on a DB-lookup error (`c188ca6`), and `email-inbox.ts`'s inbound authenticity check now requires a DKIM+SPF pass from Gmail's own header specifically, not any header claiming one (`a92d344`, hardened further in `5880446` after QA built a working spoof PoC against the first version). 229 tests passing.
- `NEXT_PUBLIC_POSTHOG_KEY` set in Vercel production (2026-08-28) — confirmed live with real captured events.

## Known real gaps (verified against the codebase, not guessed)

- **No campaign UI on the Prospects page** — the only place to see/change a prospect's campaign is Campaigns itself.
- **`docs/RUNBOOK.md` is stale** — describes 5 cron jobs; there are 13 (`src/lib/cron-schedule.ts`). Same class of drift `ARCHITECTURE.md` just got fixed for.
- **No real user-research or usage-analytics history yet** — see `PRODUCT.md`'s "current real status." Growth & Analytics work right now is mostly about building the instrumentation, not reading conclusions off numbers that don't exist yet.
- **`stripKit()` (`draft-sales-kit.ts`) has no defensive coercion** against malformed AI tool-call output, unlike its two siblings (`stripBrief()`, `reconcilePhases()`) — throws instead of degrading gracefully. Low-severity (caught by the outer try/catch), but inconsistent with the established pattern.
- ~~`sender.isInternal` in `triage-request.ts` fails open on a transient org-lookup DB error~~ — **fixed and deployed** (`c188ca6`, Hamish signed off 2026-08-27). `resolveSender()` now fails closed on any lookup error.
- ~~`email-inbox.ts`'s inbound-triage matching is From-header-only~~ — **fixed and deployed** (`a92d344` + `5880446`, Hamish signed off 2026-08-27). Requires DKIM+SPF pass from a header whose `authserv-id` matches Gmail's own (`mx.google.com`); QA built a working proof-of-concept against the first version of this fix trusting *any* Authentication-Results header, which is what `5880446` closed.
- **Motion (`Reveal`/`CountUp`) exists only on the Command Centre**, none of the other 12 `/studio` routes — not yet a documented, deliberate scope (Analytics/Billing are the two other routes with comparable numeric-stat content; the rest are list/CRUD pages with nothing analogous). See `BACKLOG.md`.
- **`loading.tsx` is one Command-Centre-shaped skeleton shared by all 13 `/studio` routes** — shows the wrong page shape while 12 of the 13 routes stream in. See `BACKLOG.md`.
- ~~`NEXT_PUBLIC_POSTHOG_KEY` not set in production~~ — **fixed 2026-08-28**. Confirmed live with real captured events (2 active users, 2 sessions, 3 pageviews in PostHog's own dashboard) — the activation funnel over existing events is the real next step now that data is flowing. See `BACKLOG.md`.
- **Zero `useOptimistic` usage anywhere in the codebase** — every Server Action is a full round-trip, unlike the perceived-instant-feel pattern reviewers credit category leaders for. Real, sourced competitive gap, not yet scoped for implementation. See `BACKLOG.md`.
- **Command Centre's AI recommendations (`studio-insights.ts`, `studio-briefing.ts`) stop at "here's where to look," not "here's what to do"** — every recommendation's action is a link to a list page, with no one-click wiring to the real `researchLead()`/`draftSalesKit()` pipelines those pages would otherwise require manually triggering. The single highest-leverage AI-nativeness gap found in this mission. See `BACKLOG.md`.

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
