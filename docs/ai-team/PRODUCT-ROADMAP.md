# HamishAI — roadmap

Living document. The Product Director keeps this current — update it as part
of finishing a mission, not as a separate chore that falls behind.

## Recently completed (real, shipped, verified live)

- "Projects Kanban Command Centre" mission, Phase A (2026-09-03,
  `95afe38`..`2514c2f` + a manually-run RLS migration): the flat
  per-client task list at `/studio/projects` replaced with a real
  5-stage Kanban board (Not Started/In Progress/Internal Review/Client
  Review/Completed — a deliberate cut from Hamish's own suggested 7, no
  invented "Approved" stage since no approval entity exists to back it),
  working drag-and-drop with optimistic update + rollback, and a genuine
  `/studio/projects/[id]` detail workspace (task list, real "add a task"
  capability, an audit-log-backed activity trail). Built on entities that
  already existed — no new tenancy boundary, no billing change. Full
  seven-specialist chain: Product Director's audit found the codebase
  already has two unrelated "Project" tables (flagged for a future Phase
  B decision, not resolved here) and that `projects.status` is read
  directly by 7 real call sites, so `stage` shipped as a purely additive
  column with `status` derived from it. Live verification (production,
  Hamish's own account) caught one real bug a fresh RLS policy gap
  making project-only tasks invisible to their own owner — root-caused,
  fixed, and confirmed fixed live (the 4 tasks written during the
  earlier broken attempts became visible immediately once the fix
  landed, with no new write needed). One real, small gap surfaced during
  that same test and logged separately: no delete-task control exists
  yet. 456/456 tests passing.
- "Prospects → Website Builder" mission (2026-09-03, `a752851`..`78d3678`):
  the AI-generated "Website mockup" a prospect gets during outreach no
  longer dead-ends once they convert. Two real pieces, both live-verified
  in a real Studio session: (1) `WebsiteMockupPreview` now reads as an
  actual page preview (browser-chrome framing, real hero hierarchy)
  instead of a flat text card, staying honest about what it is — never a
  fabricated URL, an "AI-drafted" badge and honesty caption both
  permanent; (2) a new, explicit "Start website build from prospect"
  entry point on the Clients page pre-fills the Website Builder discovery
  wizard from that prospect's real mockup/research data, each field
  tagged by real provenance (a neutral "Prefilled" tag for hard 1:1 data,
  a visually distinct purple "Needs review" tag for the one soft/
  approximate field, no tag at all for genuinely-nothing-upstream
  fields), every field still fully editable, opt-in only (never silent
  autofill). No database migration needed — the trace-back column
  already existed. 424/424 tests passing.
- "Studio Design Audit" mission (2026-09-03, `50aba86`..`ae9dc808` — see
  `STUDIO_DESIGN_AUDIT.md` for the full review-build-review record): full
  seven-specialist review of `/studio`, 18 prioritised fixes built across
  cohesion (shared `StudioPageHeader` + standard `max-w-4xl` on 11 pages,
  `prospecting-panel.tsx` split from 1,920 lines into 12 files, 7 missing
  `loading.tsx` routes backfilled), AI coherence (3 fragmented "ask about
  your business" surfaces consolidated onto one engine/one usage meter,
  `ClientsCopilot` retired), activation (Billing link added to the
  product's highest-intent conversion moment, onboarding tour reconciled
  with the Command Centre checklist, PostHog step instrumentation added
  to onboarding, a persistent trial-status indicator added), and
  reliability/accessibility (a 4-way silent assignee-select rollback
  fixed, 7 accessibility regressions restored, 3 destructive controls
  given a real confirm step). A second, post-build review by the same
  seven specialists caught and fixed two real regressions the build
  itself introduced. Test count held at 415/415 green throughout (one
  test correctly removed for a retired usage-event type); Studio/Platform
  code stayed lint-clean. **Live in production** — the 20 commits reached
  `origin/main` as a side effect of unrelated routine pushes during a
  later session before Hamish had reviewed them; flagged to him directly
  (2026-09-03) rather than silently marked shipped, and he confirmed
  leaving it live is fine.
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

- **Projects Kanban Command Centre** (queued 2026-09-03) — Hamish's own
  mission to rebuild `/studio/projects` from a flat per-client list into a
  connected Kanban command centre, then (2026-09-03, same day) reframed
  around a full delivery chain: Request → Task → Project → In Progress →
  Deliverable → Internal Review → Client Review → Client approves →
  Results feed Analytics → Results feed Client Report → Report
  demonstrates ROI → Agency sends next proposal. **Phase A: shipped and
  live** (board + drag-and-drop + detail workspace — covers the first
  four links). **Phase B: Researching**, sequenced after Phase A is used
  for real (files-on-a-project, invoice linkage, the `projects`↔
  `website_projects` cross-link decision). **Phase C1 (Deliverables
  entity + client-visible review): Ready** — the literal bottleneck link;
  everything past it needs real deliverable data to exist first. **Phase
  C2–C5** (client approval, results→Analytics/Client Report, an AI
  project assistant, completed-project→next-proposal): each scoped with
  its own distinct approval-boundary status, not one flat "someday"
  bucket — see `BACKLOG.md`'s matching entries and `DECISIONS.md`'s
  2026-09-03 "Hamish reframed..." entry for the full reasoning, including
  the explicit call that the no-outreach-before-2026-11-09 constraint
  does *not* apply to a tenant sending their own client a proposal. Next:
  UX/UI Director, design pass on Phase C1.

## How this file gets used

A `/mission` run should: (1) check here first for related prior work before
proposing something that either duplicates it or contradicts a real
constraint already recorded, (2) add its own outcome here once genuinely
complete, and (3) leave "known real gaps" honest — remove an item only once
it's actually fixed and verified, not once a PR merges.
