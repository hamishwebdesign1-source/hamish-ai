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
- **Tier 1, items #1 and #4 — Shared `StudioPageHeader` + standard
  `max-w-4xl` content width, plus the three cheap header-adjacent fixes.**
  New `src/components/platform/studio-page-header.tsx` replaces the 12
  independently hand-rolled `<h1>`/`<p>` header instances across
  Prospects, Campaigns, Clients, Requests, Projects, Knowledge, Analytics,
  Billing, Settings, Website Builder, and Help & Feedback — same exact
  type scale (`text-2xl`/`md:text-3xl` h1, `mt-1 text-sm
  text-muted-foreground` p), so no page's heading visually changed size.
  Every one of those pages now wraps its content in `mx-auto max-w-4xl`
  (previously a mix of `max-w-2xl/3xl/4xl/5xl`) — the reading column no
  longer jumps width on every nav click. Analytics was the one page
  checked for needing more room (its two-chart `lg:grid-cols-2` row);
  `max-w-4xl` held up fine, no exception needed. Command Centre
  (`studio/(authed)/page.tsx`) is explicitly excluded — a comment on its
  own header explains why (full-width hero page, not a list-page header),
  so a future contributor won't "fix" it into conformity by mistake.
  Bundled in the same pass (item #4): Website Builder's hand-rolled
  `<Link>` CTA now uses `Button`+`render` (the established
  `command-centre-section-cards.tsx` pattern); the eyebrow inconsistency
  (only Command Centre and Website Builder had one) was resolved by
  extending it, not dropping it — every `StudioPageHeader` now takes a
  real nav-section name (Grow/Build/Deliver/Account, per
  `studio-nav.tsx`'s `getNavSections()`) as its eyebrow; and the global
  header's org-name `Link` (`studio/(authed)/layout.tsx`) now has
  `min-w-0 truncate` (with the "Studio" badge kept `shrink-0`) so a long
  agency name truncates instead of forcing horizontal overflow at narrow
  widths. `docs/ai-team/DESIGN-SYSTEM.md` has the full pattern writeup.
  tsc/lint clean, 416/416 tests passing.
- **Tier 1, item #2 — Backfilled `loading.tsx` on the 7 routes missing
  one.** Analytics, Campaigns, Clients, Knowledge, Projects, Requests, and
  Website Builder each got a route-specific skeleton (plain pulsing
  `bg-secondary` blocks shaped like that page's real content — KPI/chart
  grid, filter bar + list, grouped-by-stage list, etc.), following the
  same pattern prospects/billing/settings' own `loading.tsx` already
  established, rather than falling through to the generic Command-Centre-
  shaped `(authed)/loading.tsx`. That shared fallback's own comment was
  updated to reflect the smaller remaining set (Help & Feedback is now the
  only route still relying on it). tsc/lint clean, full `eslint .` matches
  the documented pre-existing baseline (68 errors/38 warnings, unrelated
  files), 416/416 tests passing.
- **Tier 3, item #8 — Billing link on the prospect-discovery limit-reached
  message.** `discovery-result-message.tsx`'s `limitReached` case (the
  single highest-intent conversion moment in the product per Growth &
  Analytics) now links to `/studio/billing` — "Top up credits or upgrade
  your plan" — matching the styling already used by that same file's
  `billingRequired` case, instead of dead-ending on plain text.
- **Tier 5, item #17 — Unified the two "usage limit hit" UI treatments.**
  New shared `src/components/platform/usage-limit-message.tsx`
  (`UsageLimitMessage`) is now the one place "Monthly limit reached (X of
  Y)" plus its optional Billing link is rendered; `discovery-result-
  message.tsx`'s `limitReached` case (Task above) and
  `top-opportunity-kit-action.tsx`'s `reason === "usage_limit"` case both
  call it now instead of independently hand-rolling their own version
  with different levels of help shown. `generateSalesKit()`
  (`prospects/actions.ts`) additively returns `used`/`limit` numbers
  alongside its existing `reason` field so `TopOpportunityKitAction` can
  pass real numbers into the shared component rather than re-parsing its
  own pre-formatted error string; `SalesKitSection`, the pre-existing
  caller that only ever read `.error`, is unaffected. Each call site still
  supplies its own `suffix` (the specific consequence of hitting the cap
  in that context) since that copy is genuinely different per caller.
  `top-opportunity-kit-action.test.tsx`'s usage-limit test updated to
  match (now asserts the shared component's "Top up credits or upgrade
  your plan" link and passes `used`/`limit` through the mock).
- **Tier 3, item #9 — Reconciled the onboarding tour with the Command
  Centre checklist.** `studio-tour.tsx`'s `STEPS` gained a Prospects step
  (Search icon, matching `studio-nav.tsx`), placed right after the Command
  Centre intro and before Analytics — finding prospects is a brand-new
  org's actual first real task, per Command Centre's own "Getting set up"
  checklist starting with "Run your first discovery search." The final
  step's copy (Knowledge) now closes with "Your first concrete steps are
  in the 'Getting set up' checklist on this page" instead of ending on an
  unrelated topic, so the tour and the checklist now tell one coherent
  "what to do first" story instead of two disjoint ones.
- **Tier 5, item #15 — Instrumented onboarding-wizard step views.**
  `onboarding-wizard.tsx`'s `next()`/`back()` now call
  `posthog.capture("onboarding_step_viewed", { step })` on every step
  transition, guarded with the exact same `if (!process.env
  .NEXT_PUBLIC_POSTHOG_KEY) return` pattern `identify-org.tsx` already
  uses — a no-op in any environment without the key configured, so
  pre-signup drop-off in this one activation funnel is finally visible.
  Also fixed a QA-confirmed accessibility regression while in this file:
  the "How does this work?" per-agency-type collapsible trigger (`type`
  step) was missing `aria-expanded`; it now carries
  `aria-expanded={expandedType === type.slug}`.
- **Tier 5, item #16 — Made trial status persistently visible.**
  `studio/(authed)/layout.tsx`'s `showTrialBanner` (renamed conceptually,
  not in code, to "the ≤3-day escalation") used to be the only trial
  indicator anywhere in Studio, invisible for the first 4 of 7 trial days.
  A new low-key `showTrialPill` now renders a small "Trial · Day X of 7"
  pill next to the org name in the header for days 4-7 remaining (muted
  `bg-secondary` styling, no urgency colour — Studio's header has no
  pre-existing "plan badge" to sit next to, so this is the calm-banner-
  variant alternative the spec allowed for). The existing ≤3-day warning
  banner's exact copy, styling, and Billing link are untouched — the
  escalation itself is preserved, the pill only widens *when some*
  indicator shows.
- **Tier 3, item #7 — Fixed the 4-way silent assignee-select rollback.**
  The Prospects assignee `<select>` (`prospecting/prospect-card.tsx`,
  relocated from the old `prospecting-panel.tsx` by the intervening
  `prospecting/` split), `requests-panel.tsx`'s `RequestCard`,
  `projects-panel.tsx`'s `ProjectCard`, and
  `website-project-assignee-control.tsx` all previously reverted the
  optimistic value on a rejected `assignProspect`/`assignRequest`/
  `assignProject`/`assignWebsiteProject` Server Action with zero
  user-visible message. All four now keep the same revert but also set a
  local `assignError`/`error` string (`r.error ?? "Failed to update —
  try again."`) rendered as `<p className="text-xs text-destructive">`
  (or `text-[11px]` for the two tighter inline rows), matching the exact
  inline-error convention every other Server-Action call in these same
  files already used (e.g. `deal-value-control.tsx`,
  `pipeline-stage-control.tsx`). Each select was wrapped in a small
  `flex flex-col gap-1` so the error sits directly under the control
  without disturbing its row's existing flex layout. Ownership checks on
  all four actions were re-confirmed intact (`.eq("org_id", orgId)`/
  `requestBelongsToOrg()`) while touching these files.
- **Tier 3, item #10 (partial) — Restored the accessibility baseline.**
  `rate-card-panel.tsx`'s "add item" row now has `aria-label`s ("New
  rate card item name" / "…price in pounds" / "…billing unit") on its
  label input, price input, and unit select, which previously relied on
  placeholder text alone. `knowledge-panel.tsx`'s entries-toolbar
  `clientFilter` select gained `aria-label="Filter knowledge base
  entries by client"`, matching the already-labelled `id="kb-client"`
  select earlier in the same file. `prompt-library-browser.tsx`'s
  per-prompt collapsible trigger and `troubleshooting-composer.tsx`'s
  "Show/Hide N earlier questions" trigger both gained
  `aria-expanded={open}`/`aria-expanded={historyOpen}`. (Two other
  controls from the original finding — `clients-panel.tsx`'s
  `ClientMembersControl` and `team-panel.tsx`'s invite-email input —
  and one other collapsible — `onboarding-wizard.tsx`'s toggle, fixed
  separately as part of Tier 5 item #15 above — were intentionally left
  out of this pass; see that item's own note.) tsc clean, scoped
  `eslint` on all eight touched files clean, full `eslint .` still
  matches the documented pre-existing baseline (68 errors/38 warnings,
  unrelated files), and `npm run test` is 415/416 — the one failure
  (`usage-limits.test.ts`'s `clients_copilot_question` case) is a
  pre-existing regression from the concurrent Tier 2 item #5 AI-surface-
  consolidation work already in this shared tree (that event type was
  retired from `usage-limits.ts` without yet updating its own test),
  not caused by this pass — none of these eight files touch
  `usage-limits.ts` or the AI-surface-consolidation files.

- **Tier 2, item #5 and Tier 5, item #14 — Consolidated the three AI
  ask-surfaces onto one engine/meter, and gave the two hand-rolled overlays
  real dialog semantics.** The Clients page's embedded `ClientsCopilot` is
  retired entirely (component deleted, not remounted anywhere), along with
  `askClientsCopilot()` (`clients/actions.ts`), `answerClientsQuestion()`'s
  question-answering wrapper (`answer-clients-question.ts` — its
  `buildClientsSummary()`/`buildAnalyticsSummary()` helpers are kept,
  confirmed still genuinely imported by `answer-studio-question.ts`), and
  `clients_copilot_question` as a `UsageEventType` (`usage-limits.ts`).
  The command palette's Ask flow and the Clients page itself now both call
  `askStudioAssistant()` — confirmed a strict superset (same client/
  analytics data, plus Help-FAQ grounding) — so all three surfaces share
  one `studio_assistant_question` meter instead of splitting one real
  monthly allowance across two invisible caps. Historical
  `clients_copilot_question` usage-event rows are left exactly as
  recorded, not migrated (`getUsageStatus()` only ever sums the current
  calendar month by exact event-type match, so they simply stop being
  queried — see `docs/ai-team/DECISIONS.md` for the full reasoning).
  Separately, `studio-command-palette.tsx` and `studio-assistant-widget.tsx`
  — both hand-rolled overlays that predate this codebase's `ui/dialog.tsx`
  — gained `role="dialog"`/`aria-modal="true"`, a shared Tab-wrap focus
  trap (new `src/lib/use-focus-trap.ts`), and an Escape-to-close handler on
  the widget (the palette already had one). `docs/ai-team/DESIGN-SYSTEM.md`
  updated to reflect `ClientsCopilot`'s retirement everywhere it was
  referenced as a live example. tsc clean, lint clean (68/38 pre-existing,
  unrelated), 415/415 tests passing (the expected count after item #10's
  above-noted retired-event-type test removal).
  **Process note**: the lead-engineer subagent that did this work stalled
  (no progress for 600s) immediately before its own commit step, after
  finishing the code and writing its own `DECISIONS.md`/`DESIGN-SYSTEM.md`
  entries. The orchestrator reviewed every diff against the stated task
  before staging (explicit pathspecs, no blanket `git add`), independently
  re-ran `tsc`/`eslint`/`npm run test`, and committed on the agent's behalf
  once satisfied nothing was broken or incomplete — see commit `e253fe0`.

- **Tier 4, item #12 — Added the two-step inline confirm pattern to the
  three real-money/real-access controls that previously fired immediately.**
  `clients-panel.tsx`'s `MaintenanceSubscriptionControl` ("Cancel
  subscription") now arms a `confirmingCancel` state on first click before
  showing a destructive "Confirm" button plus an `X` "Keep subscription"
  icon-button, with a one-line consequence statement ("This client will
  stop being billed after the current period.") shown only in the armed
  state, exactly matching `knowledge-panel.tsx`'s `EntryCard`/
  `campaigns-panel.tsx`'s `CampaignCard` shape. `ClientMembersControl`'s
  "Remove client member" and `team-panel.tsx`'s "Remove team member" both
  got the lighter version of the same pattern (a `confirmingRemoveId`/
  `confirmingRemove` state keyed by id/email since either list can have
  more than one row, destructive "Confirm" + `X` "Cancel remove", no
  separate consequence line — task scope explicitly called for the
  lightweight version here). Invoice-reminder and proposal-resend sends
  were explicitly left untouched, per Security Auditor's own finding that
  their existing sent/viewed state labels already do this job.
- **Tier 3, item #10 (remaining part) — the last two accessibility fixes
  left over from the prior pass.** `clients-panel.tsx`'s
  `ClientMembersControl` invite-email `Input` and role `<select>` now carry
  `aria-label="Email address to invite to this client's portal access"` /
  `aria-label="Role for the invited portal member"`; `team-panel.tsx`'s
  invite-email `input` — the one this control's own code comment says was
  "ported" from — now carries the matching
  `aria-label="Email address to invite to the team"`. Both were previously
  placeholder-only, same regression class `knowledge-panel.tsx:80-83`'s
  labelled controls establish the convention for. This closes out item #10
  in full (the two collapsibles/one select from the original finding not
  covered by the prior pass's own note were already fixed there).
- **Tier 3, item #11 — Surfaced the Clients-page query failure instead of
  letting it render as "no clients yet."** `clients/page.tsx` now passes a
  new `hasLoadError={Boolean(clientsError)}` prop to `ClientsPanel`
  (additive — the existing `console.error` is untouched); `ClientsPanel`
  renders a small inline notice ("Something didn't load correctly — try
  refreshing.") above the existing empty-state block whenever a real query
  failure occurred, styled with the same `border-destructive/30
  bg-destructive/5` treatment this file's own `DeleteClientControl` already
  uses for a destructive/error state — so a genuine backend failure no
  longer looks identical to a legitimate zero-clients org.

  tsc clean, scoped `eslint` on all three touched files
  (`clients-panel.tsx`, `team-panel.tsx`, `clients/page.tsx`) clean, full
  `eslint .` still matches the documented pre-existing baseline (68
  errors/38 warnings, unrelated files), and `npm run test` is 415/415 —
  restored from the prior pass's 415/416 note (that one pre-existing
  failure was itself a test-file update left over from the concurrent
  Tier 2 item #5 work, already resolved in this shared tree by the time
  this pass ran).

- **Phase 3 post-build fixes** — a final, small cleanup pass after the
  seven specialists re-reviewed the completed build (`50aba86..d6b46cb`).
  Seven confirmed, isolated findings:
  1. Fixed a real silent-failure regression in `clients-panel.tsx`'s
     `ClientMembersControl.remove()` — it discarded
     `removeClientMemberAction()`'s return value entirely, so a failed
     removal collapsed the confirm UI with zero feedback. Now checks
     `"error" in r` and surfaces it via a new `removeError` state,
     matching this same file's `invite`/`saveRate`/`start`/`cancel` and
     `team-panel.tsx`'s own remove function.
  2. Fixed a button-size token mismatch in the same control: the
     icon-only `Trash2` remove trigger now uses `size="icon-xs"` (was
     `"xs"`), matching `team-panel.tsx`'s equivalent.
  3. Fixed a stale tour reference: `studio-tour.tsx`'s "AI Business
     Analyst" step no longer says "from the Clients page" (`ClientsCopilot`
     was retired in this mission's own AI-surface-consolidation work) —
     now correctly points at "the assistant widget in the bottom-left of
     every page."
  4. Folded `prospecting-panel.tsx`'s own independent "Monthly limit
     reached" wording into the shared `UsageLimitMessage` component built
     earlier in this mission, so all three usage-limit call sites
     (`discovery-result-message.tsx`, `top-opportunity-kit-action.tsx`,
     and now this ambient usage card) render identically.
  5. Moved Website Builder's "Create Website Project" button into
     `StudioPageHeader`'s own `actions` slot, matching Analytics' range-
     switcher/CSV-export controls instead of sitting outside it.
  6. Updated a stale code comment in `clients/page.tsx` that still said
     the clients-query failure "is not surfaced to the UI" — Tier 3 item
     #11 already added that surfacing (`hasLoadError`); the comment now
     describes current reality.
  7. Deleted the `prospecting-panel.tsx` re-export shim (a 13-line barrel
     left over from the Tier 1 item #3 file split) — its two real
     importers (`prospects/page.tsx`, `prospecting-panel.test.tsx`) now
     import directly from `prospecting/prospecting-panel.tsx` and its
     sibling control files.

  tsc clean, scoped `eslint` on all eight touched files clean, full
  `eslint .` matches the documented pre-existing baseline (68 errors/38
  warnings, unrelated files), and `npm run test` is 415/415 (one
  transient full-suite flake in `command-centre-section-cards.test.tsx`,
  unrelated to any file touched in this pass, reproduced as a clean pass
  in isolation and on a subsequent full-suite re-run).

## 4. What was not built

Beyond the Phase 1 rejections in section 2 (coach-mark tour, Campaign budget/spend tracking,
merging Website Builder into Projects — all still correctly not built), two shared-primitive
refactors were scoped in Phase 1 as Medium priority but deliberately deferred rather than built in
an already-large pass:

- **`StudioEmptyState` and `ConfirmDeleteButton` shared primitives.** Phase 1 (Lead Engineer)
  quantified 15 duplicated empty-state instances and 4+ duplicated confirm-delete
  implementations. Phase 2 built and adopted the highest-priority duplication
  (`StudioPageHeader`) but correctly judged that extracting these two on top of everything
  else in the same pass was more risk than the mission's remaining time budget justified. The
  post-build review (Lead Engineer) confirmed this was the right call to make explicitly, but
  found the confirm-delete count had gone *up* in the meantime (the three new Tier 4 confirm
  controls each correctly reused the existing *shape* by hand, not a shared component) — now a
  real, named `BACKLOG.md` item rather than a silent gap.
- **Assignee-select consolidation** (4 independent components, QA's original Low-priority
  finding) — the actual bug (silent rollback) is fixed in all 4; consolidating them into one
  component is real but lower value, now in `BACKLOG.md`.
- **AI-artifact provenance line standardisation** ("Generated {date} · Regenerate" everywhere a
  cached AI output shows) — cosmetic, correctly deferred, now in `BACKLOG.md`.
- **A dormancy/re-engagement signal for inactive orgs** — Growth & Analytics flagged this in
  Phase 1 as needing new instrumentation that doesn't exist yet, and close enough to the standing
  pre-2026-11-09 no-outreach constraint that it explicitly needs Hamish's sign-off before any
  email/digest is built, not a default. Left in `BACKLOG.md` with that constraint stated
  explicitly, not built.
- **A Command Centre density pass** (fewer of the 9 section-card types) — Phase 1 (UX/UI
  Director) explicitly said this needs real usage data on which cards actually get looked at
  before cutting any of them; no such data exists yet (`PRODUCT.md`'s own "current real status").
  Not built, not backlogged as an action item — a real future opportunity once evidence exists.

## 5. Post-build review

The same seven specialists re-reviewed the actual shipped result against real current source (not
this document's own prose), answering: *"Now that the proposed improvements have been
implemented, what still feels weak, inconsistent, unfinished, or below a world-class SaaS
standard?"*

**Verdict, across all seven: every Phase 2 claim checked out under spot-check.** No specialist
found an "implemented" item that wasn't actually implemented, and no specialist found the build
had broken anything — `tsc` stayed clean, Studio/Platform stayed lint-clean, and the test suite
stayed green throughout (416→415, one test correctly removed for a retired usage-event type).

**Two real regressions were caught, both fixed in a final cleanup pass (commit `19bb349`):**
- `ClientMembersControl.remove()` (`clients-panel.tsx`) — a Tier 4 control built in the same
  commit as the fix for the *exact same bug class* (Tier 3 #7's 4-way silent assignee-select
  rollback) discarded its own Server Action's error, an identical silent-failure bug reintroduced
  by accident a few files away. Caught independently by both UX/UI Director and QA Engineer.
- `studio-tour.tsx`'s "AI Business Analyst" step still told new users to ask questions "from the
  Clients page" — the exact surface just retired by the AI-surface consolidation landing in the
  same mission. Caught by Product Director.

**Smaller loose ends found and fixed** (commit `19bb349` and a final pair of direct fixes,
`03ebf38`): a button-size token mismatch (`xs` vs `icon-xs`) in the same Tier 4 commit; a third,
unconsolidated "usage limit reached" message in Prospects' ambient usage card that the Tier 5 #17
unification missed; Website Builder's primary CTA still sitting outside the new header's `actions`
slot; a stale code comment on the Clients page describing pre-fix behaviour; a leftover
`prospecting-panel.tsx` re-export shim, cleaned up by repointing its two importers directly;
`DESIGN-SYSTEM.md`'s eyebrow rationale overclaiming a benefit that only actually holds on mobile
(the desktop sidebar already shows the same label — real, harmless, and worth being honest about
rather than silently leaving the doc wrong); a missing `aria-live` region on the command palette's
Ask-flow transition; and the onboarding wizard's very first ("start") step never being captured by
name in its own new instrumentation.

**Confirmed clean, no findings:** Security Auditor found zero ownership-check regressions across
every Server Action touched by the build, confirmed the three new confirm-step controls use the
established pattern correctly with no native `confirm()` introduced, and confirmed the
AI-consolidation didn't introduce a usage-cap gap. AI/Agent Architect confirmed zero dangling
references anywhere to the retired `ClientsCopilot`/`clients_copilot_question`.

**One process gap this document itself had to correct**: Lead Engineer's post-build pass found
that `BACKLOG.md`/`AGENT-LOG.md` updates this document's own text claimed would happen hadn't
actually happened. Fixed directly (commit `3bf3852`) rather than left as a known gap — see that
commit and `docs/ai-team/BACKLOG.md`'s new entries for the genuinely-deferred items named above.

## 6. Remaining improvements

Everything genuinely worth doing next is now a real, findable `BACKLOG.md` entry rather than a
line in this document that could quietly go stale — see the five entries added under "Not
started": `StudioEmptyState`/`ConfirmDeleteButton` primitives, assignee-select consolidation, AI-
artifact provenance-line standardisation, trial-status pill phrasing reconciliation (a new, minor
count-up/count-down inconsistency the Phase 2 pill itself introduced, caught by Growth & Analytics
in Phase 3), and the dormancy-signal instrumentation with its explicit outreach-constraint flag.
Two known, pre-existing gaps this mission didn't touch remain accurately described in
`PRODUCT-ROADMAP.md`'s own "Known real gaps" section (no campaign UI on the Prospects page;
`docs/RUNBOOK.md` still describes 5 cron jobs instead of the real 13) — not new findings, not
duplicated here.

After the two rounds above, both post-build reviews converged on describing only minor,
individually-cheap remaining items — the mission's own exit condition ("repeat until the agents
identify only minor improvements") is met.

## 7. Final scores — before vs after

Reconciled across all seven specialists' Phase 1 and Phase 3 scores (several dimensions were
scored by more than one specialist post-build; where they differed, the number below is a
justified reconciliation, not an arbitrary pick — see each specialist's own review file in
`docs/ai-team/AGENT-LOG.md`'s entry for the individual numbers).

| Dimension | Before | After | What moved it |
|---|---|---|---|
| Visual Design | 6.5 | 7.5 | The header/max-width standardisation removed the one thing every reviewer called the biggest "assembled from parts" signal. |
| UX | 6 | 7 | AI-surface fragmentation and the tour/checklist redundancy — both real, both confirmed fixed — were this dimension's two biggest drags. |
| Information Architecture | 6.5 | 7.5 | Feedback/Help merged into one coherent page; the tour now walks a new user to their actual first task. |
| Consistency | 4.5 (avg of two Phase 1 scores) | 7 | The core quantified finding (12× header duplication) is verifiably gone; confirm-delete/empty-state duplication remains and is now a named `BACKLOG.md` item rather than an open question. |
| Accessibility | 6.5 | 8.5 | Every originally-flagged gap (4 unlabeled controls, 3 missing `aria-expanded`, 2 overlays with no dialog semantics) is fixed and re-verified in Phase 3, not just claimed. |
| Responsive Design | 6 | 6.5 | The one plausible header-overflow risk (long org name) is fixed; most of this dimension remains code-derived, not live-verified — genuine headroom left, honestly not overclaimed. |
| Premium SaaS Feel | 6.5 | 7 | Direct product of the Visual Design/Consistency gains — the same bones, now visibly finished rather than undercut by drift. |
| AI-Native Experience | 7.5 | 8.5 | The one real coherence drag (three AI surfaces, two meters) this dimension had is confirmed fully and cleanly resolved; already-strong AI depth (recommend→act, honest cost transparency) was undisturbed. |

**Overall**: `/studio` is measurably, verifiably closer to "one cohesive premium AI-native
product" than it was at the start of this mission — not because this document says so, but because
every claim in it was independently spot-checked against real current source by the same
specialists who found the original problems, twice.
