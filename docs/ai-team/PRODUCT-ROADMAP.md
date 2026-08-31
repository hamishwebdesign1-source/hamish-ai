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
- "AI ROI" mission (2026-08-31, `74651a2`..`d256e99`): a new `src/lib/studio-ai-roi.ts` computes a real, disclosed attribution figure — a client counts as AI-assisted if a sales kit or website mockup was generated for its source prospect before it signed (correlation, not causation, stated as such in the card's own HelpTip) — surfaced as a new "AI-assisted clients" card on Billing, right below the existing usage-metering card it directly answers. No new schema, no new usage-event type; every column already existed. QA caught and fixed a real date-comparison bug (raw ISO-string `<=` inverting real chronological order across JS-vs-Postgres timestamp format differences); UX/UI Director caught and fixed a real product gap (the honest "0 of N" zero-state reading as a bare discouraging verdict with no next action attached). 298 tests passing. Not yet pushed to production.
- "/studio-focused SaaS improvements" mission (2026-08-31, `73e1c82`..`f3b1bc4`): motion (Reveal/CountUp) extended to Analytics/Billing with the scope rule documented; route-specific loading skeletons for Settings/Billing/Prospects/Feedback; `useOptimistic` on prospect status actions (ContactTrackingControl/PipelineStageControl) plus 3 adjacent silent-failure bugs fixed; PostHog activation funnel spec defined (two funnels, not one — Growth caught that a single sequential funnel would have misreported real pay-now subscribers as drop-offs); Studio's background moved off flat-black to a toned cool-navy with an activated ambient glow (live-verified in a real session, intensity corrected from imperceptible to actually visible after Hamish's own live check); Command Centre's "recommend → act" gap closed for the top-opportunity card — a real one-click "Generate outreach kit" button wired to the existing `generateSalesKit()` pipeline, live-verified linking through to a genuine, specific generated kit. 244 tests passing.

## Known real gaps (verified against the codebase, not guessed)

- **No campaign UI on the Prospects page** — the only place to see/change a prospect's campaign is Campaigns itself.
- **`docs/RUNBOOK.md` is stale** — describes 5 cron jobs; there are 13 (`src/lib/cron-schedule.ts`). Same class of drift `ARCHITECTURE.md` just got fixed for.
- **No real user-research or usage-analytics history yet** — see `PRODUCT.md`'s "current real status." Growth & Analytics work right now is mostly about building the instrumentation, not reading conclusions off numbers that don't exist yet.
- **`stripKit()` (`draft-sales-kit.ts`) has no defensive coercion** against malformed AI tool-call output, unlike its two siblings (`stripBrief()`, `reconcilePhases()`) — throws instead of degrading gracefully. Low-severity (caught by the outer try/catch), but inconsistent with the established pattern.
- ~~`sender.isInternal` in `triage-request.ts` fails open on a transient org-lookup DB error~~ — **fixed and deployed** (`c188ca6`, Hamish signed off 2026-08-27). `resolveSender()` now fails closed on any lookup error.
- ~~`email-inbox.ts`'s inbound-triage matching is From-header-only~~ — **fixed and deployed** (`a92d344` + `5880446`, Hamish signed off 2026-08-27). Requires DKIM+SPF pass from a header whose `authserv-id` matches Gmail's own (`mx.google.com`); QA built a working proof-of-concept against the first version of this fix trusting *any* Authentication-Results header, which is what `5880446` closed.
- ~~Motion (`Reveal`/`CountUp`) exists only on the Command Centre~~ — **fixed 2026-08-31**. Extended to Analytics/Billing's numeric stat surfaces; scope rule documented so the other 10 list/CRUD routes staying motion-free reads as intentional, not a gap.
- ~~`loading.tsx` is one Command-Centre-shaped skeleton shared by all 13 `/studio` routes~~ — **fixed 2026-08-31**. Settings/Billing/Prospects/Feedback now have route-specific skeletons; the other 9 routes stay on the shared one (close enough in shape).
- ~~`NEXT_PUBLIC_POSTHOG_KEY` not set in production~~ — **fixed 2026-08-28**, funnel spec defined 2026-08-31 (two funnels — Activation and Monetization — not one, since a single sequential funnel would have misreported real pay-now subscribers as drop-offs). Hamish still needs to click through the spec in PostHog's own UI to actually create the funnel views.
- **Zero `useOptimistic` usage anywhere in the codebase** — partially addressed 2026-08-31: prospect status actions (ContactTrackingControl/PipelineStageControl) now use it, with real rollback UI. Two more scoped candidates (task/campaign/project status toggles) remain a real, not-yet-built follow-up. See `BACKLOG.md`.
- ~~Command Centre's AI recommendations stop at "here's where to look," not "here's what to do"~~ — **fixed 2026-08-31** for the "Your briefing" card's single top-opportunity callout: a real one-click "Generate outreach kit" button now calls the existing `generateSalesKit()` pipeline directly, live-verified. The 5-row `top_prospects` list is a scoped, identical fast-follow, not yet built. Two bigger AI-agentic opportunities (AI-drafted check-in messages off `engagement_risk`; tenant-scoped autonomous triage) remain deliberately unscoped, pending a future call.
- **Studio's background was flat black** — **fixed 2026-08-31**: toned cool-navy + an activated ambient glow, live-verified visible after a live-session correction (initial intensity was technically correct but imperceptible).

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
