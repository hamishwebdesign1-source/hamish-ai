# Studio Design Audit

A full-team review-then-build pass on `/studio`, the Agency Platform, run as a `/mission`.
Seven specialists (UX/UI Director, Product Director, AI/Agent Architect, Lead Engineer, QA
Engineer, Growth & Analytics, Security Auditor) independently reviewed the entire live codebase
read-only before any code changed. Their full individual reports are preserved in
`docs/ai-team/AGENT-LOG.md`'s entry for this mission; this file is the consolidated result.

**Mission goal** (Hamish): make `/studio` feel like one cohesive, premium, world-class AI-native
SaaS product across the full customer journey — Dashboard → Find opportunities → Analyse
prospects → Manage leads → Outreach → Convert → Manage clients → Deliver work → Analyse
performance → Grow the business — not individually prettier pages.

**Method**: no authenticated Studio session was available to the review agents, so every finding
below is code-derived (read from real source, cited by file/line) unless marked live-verified.
Baseline established before any change: 46 test files / 416 tests passing, Studio and Platform
code lint-clean (the repo's 68 lint errors/38 warnings are all pre-existing, in unrelated
marketing/admin pages).

---

## 1. Original review — what the seven specialists found

### What's genuinely working (converged across reviewers, not to be disturbed)

- **The journey is a real, connected product, not 13 disconnected pages.** One org model, one
  RLS boundary, Command Centre genuinely aggregates numbers the other pages independently
  compute. "Real data or nothing" is actually held — zero fabricated stats, fake testimonials, or
  dead "coming soon" features found anywhere in the 13 routes.
- **Recommend → act is real.** The Command Centre's one-click outreach-kit and invoice-reminder
  actions wire real ids to real, already-existing pipelines — not decorative buttons.
- Command Centre's `bg-primary` reservation (exactly TodayStrip + `actions_required`, everything
  else `bg-card`) is a genuinely disciplined, already-audited hierarchy fix.
- State coverage, accessibility auditing, and the confirm-delete pattern are unusually mature for
  this stage — evidence of real, repeated design passes, not a first draft.
- AI call sites are mature end to end: tool-forced schemas, defensive coercion, bounded retries,
  honest per-feature cost/latency tracking (`ai_call_log` → Model Performance card), deliberate
  model tiering, and a correct propose-then-human-saves trust boundary on the AI Design Assistant.
  The requests-triage → reply flow is the platform's best example of AI decomposed into first-class
  UI rather than a text blob.
- Ownership checks are clean: a full sweep of all 13 `/studio` Server Action files found **zero**
  org-scoping gaps (Security Auditor, independently confirming `docs/ARCHITECTURE.md`'s prior claim).
- Architecture is sound: correct server/client boundaries, batched (non-N+1) data fetching,
  consistent `requireOrgId()` convention.

### What's weak — the real, convergent findings

**Cohesion (UX/UI Director + Lead Engineer, independently quantified the same problem):**
Every one of 11 content pages hand-rolls an identical page-header pattern, but each sits in a
different, content-unjustified max-width (`max-w-2xl/3xl/4xl/5xl`) — the reading column visibly
jumps width on every nav click, the single most "assembled from parts" feeling issue in the
product. Lead Engineer quantified it: **12 duplicated header instances, 15 duplicated empty-state
instances, confirm-delete reimplemented independently 4+ times**, only 4 of 13 routes have a
route-specific `loading.tsx`, and `prospecting-panel.tsx` (1,920 lines, no internal file
boundaries) is a maintainability risk concentrated in the single highest-traffic page.

**AI surface fragmentation (Product Director + AI/Agent Architect, independently converged on the
same finding without coordinating):** three separate "ask about your business" entry points
(global assistant widget, embedded Clients Copilot, command palette) look like one feature but run
two different engines with two separate 10/month usage caps — confirmed redundant by the
codebase's own comments, not a hypothetical.

**Activation gaps (Growth & Analytics + Product Director):** the onboarding tour and the Command
Centre's onboarding checklist tell a new user two different, non-overlapping "what to do first"
stories, and neither actually walks them to Prospects — the real first task. The single highest
intent conversion moment in the product (the prospect-discovery usage-limit message) has no
upgrade/credit-pack link, unlike its sibling limit messages. The onboarding wizard has zero
client-side instrumentation, so pre-signup drop-off is invisible to the one activation funnel that
exists.

**Reliability/accessibility (QA Engineer):** four components share one silent-failure bug
(an assignee-select reverts on a rejected Server Action with no message at all); four files have
form controls with no accessible name and three collapsibles are missing `aria-expanded`,
regressing from `DESIGN-SYSTEM.md`'s own previously-audited baseline; the Clients page's own code
comment confirms a real query failure renders identically to a legitimate "no clients yet" empty
state.

**Security-adjacent UX (Security Auditor):** three real-money/real-access controls (cancel
subscription, remove client member, remove team member) fire immediately with no confirm step,
inconsistent with every delete-* control elsewhere in the same codebase. No cross-tenant leak, no
XSS, no rate-limit gap found anywhere — this is a UX-severity gap, not a security hole.

### Full page-by-page and dimension scorecards (averaged across reviewers, code-derived)

| Page | UX/UI | Product | Lead Eng (maint.) | AI-Native | Growth |
|---|---|---|---|---|---|
| Command Centre | 7 | 8 | 6 | 9 | 8 |
| Prospects | 7 | 7 | 4 | 8 | 7 |
| Campaigns | 6 | 6 | 6 | 6 | 6 |
| Analytics | 7 | 7 | 6 | 6 | 6 |
| Website Builder | 5 | 7 | 6 | 9 | 6 |
| Clients | 7 | 7 | 5 | 7 | 6 |
| Requests | 7 | 7 | 6 | 9 | 6 |
| Projects | 7 | 6 | 6 | – | 6 |
| Knowledge | 6 | 6 | 6 | 7 | 5 |
| Billing | 7 | 8 | 6 | 7 | 8 |
| Settings | 6 | 7 | 6 | 8 | 6 |
| Feedback | 6 | 5 | 7 | – | 5 |
| Help | 6 | 6 | 7 | 6 | 6 |

**Overall dimension scores, before build (1–10, averaged/reconciled across reviewers):**

| Dimension | Before | Notes |
|---|---|---|
| Visual Design | 6.5 | Solid tokens, inconsistent application |
| UX | 6 | Individually strong pages undermined by AI-surface and tour/checklist redundancy |
| Information Architecture | 6.5 | Sound sidebar grouping; two real seams (Feedback/Help, Website Builder/Projects) |
| Consistency | 5 (UX/UI) / 4 (Lead Eng) | The 12×/15× duplication is the core, quantified finding |
| Accessibility | 6.5 | Strong baseline undercut by specific, repeated regressions |
| Responsive Design | 6 | Disciplined `flex-wrap` use; one plausible unverified header-overflow risk |
| Premium SaaS Feel | 6.5 | Real bones (block canvas, AI Design Assistant) undercut by header/width drift |
| AI-Native Experience | 7.5 | Ahead of "AI bolted on"; fragmented ask-surfaces are the one real drag |

---

## 2. Prioritised improvements — what was selected, and why

Ranked by convergence across specialists, real user/business value, and effort. Items flagged by
2+ independent specialists were treated as confirmed, not merely plausible.

### Tier 1 — Structural foundation (blocks everything else, highest cohesion value)
1. **Shared `StudioPageHeader` + one standard content max-width (`max-w-4xl`)** across all 12
   non-Command-Centre pages. *(UX/UI Director High, Lead Engineer High — independently converged)*
2. **Backfill `loading.tsx`** on the 7 routes missing one. *(Lead Engineer High)*
3. **Split `prospecting-panel.tsx`** (1,920 lines) into a `prospecting/` folder along its own
   visible seams, before its header/markup is touched by #1. *(Lead Engineer High, Product
   Director Medium — sequencing dependency)*
4. Fix Website Builder's hand-rolled CTA to use `Button`+`render`; resolve the eyebrow
   inconsistency; guard the global header against long org names. *(UX/UI Director
   Medium/Low, cheap — bundled with #1 since both touch the same header work)*

### Tier 2 — AI coherence (highest-leverage "feels like one product" fix)
5. **Consolidate the three "ask about your business" surfaces onto one engine and one usage
   meter** — repoint the command palette and Clients page at the global assistant, retire
   `ClientsCopilot` as a standalone surface. *(Product Director High, AI/Agent Architect High —
   independently converged, zero new AI cost, pure consolidation)*
6. Remove the `Sparkles` "Recommended" badge from the deterministic (non-AI)
   `chooseWebsiteTool()` output — it's borrowing AI's trust signal for a feature that isn't AI.
   *(AI/Agent Architect Medium, cheap)*

### Tier 3 — Activation and reliability (real user-facing bugs, cheap fixes)
7. **Fix the 4-way silent assignee-select rollback** — surface the error instead of reverting
   with no message. *(QA Engineer High)*
8. **Add a Billing/credit-pack link to the prospect-discovery limit-reached message** — the
   single highest-intent conversion moment in the product currently dead-ends. *(Growth &
   Analytics High)*
9. **Add Prospects to the onboarding tour**, and reconcile the tour with the Command Centre
   checklist so a new user gets one "what to do first" story, not two. *(Product Director High)*
10. **Restore the accessibility baseline**: add `aria-label` to 4 unlabeled form controls, add
    `aria-expanded` to 3 collapsible triggers. *(QA Engineer High — these directly regress
    `DESIGN-SYSTEM.md`'s own previously-audited standard)*
11. **Surface (not just log) the Clients-page query failure** instead of letting it render as
    "no clients yet." *(QA Engineer Medium — high consequence for a paying customer)*

### Tier 4 — Security-adjacent UX hardening (cheap, bundle with touched components)
12. Add the existing two-step inline confirm pattern to **Cancel subscription**, **remove client
    member**, and **remove team member** — the only three destructive/revenue-consequential
    controls in Studio without it. *(Security Auditor Medium/Low)*

### Tier 5 — IA and polish (real but smaller wins)
13. **Merge Feedback into Help** as one page/nav item — both are the two thinnest, correctly
    minimal pages; a genuine nav-economy win. *(Product Director Medium)*
14. Give the command palette and assistant widget real dialog semantics (`role="dialog"`,
    focus trap, Escape-to-close on the widget). *(QA Engineer Medium)*
15. Add client-side PostHog step instrumentation to the onboarding wizard. *(Growth & Analytics
    High value, but additive/instrumentation-only — sequenced after the user-facing fixes)*
16. Make the trial-status indicator persistently visible (low-key days 1–4, escalating at ≤3
    days) instead of invisible for the first 4 of 7 trial days. *(Growth & Analytics Medium)*
17. Unify the two divergent "usage limit hit" UI treatments into one shared component. *(Growth &
    Analytics Medium)*
18. Document one canonical "AI is working" pending-state pattern in `DESIGN-SYSTEM.md`. *(AI/Agent
    Architect Medium)*

### Explicitly rejected or deferred — named, not silently dropped

- **A coach-mark/spotlight tour rebuild** — no usage evidence yet justifies the engineering cost
  against a 9-block configurable dashboard; fix the existing tour's *content* (item 9), not its
  *mechanism*. (Product Director)
- **Campaign budget/spend tracking** — `PRODUCT.md`'s own worked "thin and honest" example; no
  real ad-platform data exists behind it. Still correct, not revisited.
- **Merging Website Builder and Projects into one system** — genuinely different stage models; a
  nav-clarity problem, not a data-model problem worth a large, risky migration.
- **A dormancy/re-engagement email for inactive orgs** — needs new "last active" instrumentation
  that doesn't exist yet, and sits close enough to the standing pre-2026-11-09 no-outreach
  constraint that it needs Hamish's own sign-off, not a default build. Left in `BACKLOG.md`.
  (Growth & Analytics, flagged explicitly rather than built)
  - **Command Centre density pass** (fewer of the 9 section-card types) — worth revisiting once
  real usage data shows which cards actually get looked at; not a blind cut today. (UX/UI
  Director)
- **Consolidating the 4 duplicated assignee-select components into one shared control** and
  **standardising a "Generated {date} · Regenerate" provenance line on every cached AI artifact**
  — real, low-priority polish; deferred to `BACKLOG.md` rather than built in this pass given
  everything above is higher-value per effort spent.

---

## 3. What was built

- **Tier 5, item #13 — Merged Feedback into Help.** `/studio/feedback`
  (`feedback/page.tsx` + `feedback/actions.ts`) is retired; `/studio/help`
  now renders the existing FAQ list and the existing feedback form on one
  page, both real capabilities kept exactly as they worked before — only
  the UI/nav was consolidated, not the backend logic (`submitFeedback`
  moved verbatim into `help/actions.ts`, only its redirect target
  changed). `getNavSections()` (`studio-nav.tsx`) drops the standalone
  "Feedback" item and renames "Help" to "Help & Feedback" — this single
  source of truth is also read by `StudioMobileNav` and the command
  palette, so both picked up the change with no separate edit needed.
  `/studio/feedback` 301s to `/studio/help` (`next.config.ts`) so no
  stale bookmark or nav reference dead-ends. tsc/lint/416-test baseline
  unaffected.

## 4. What was not built

*(anything deliberately scoped out during build, beyond the Phase 1 rejections above)*

## 5. Post-build review

*(the same seven specialists, re-run against the built result)*

## 6. Remaining improvements

*(real opportunities left for `BACKLOG.md`)*

## 7. Final scores — before vs after

*(completed once Phase 2/3 finishes)*
