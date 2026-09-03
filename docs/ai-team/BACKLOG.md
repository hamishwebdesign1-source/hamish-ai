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

_(none yet)_

## Not started

### Build `StudioEmptyState` and `ConfirmDeleteButton` shared primitives, retrofit existing sites

- **Problem**: Studio Design Audit Phase 1 (Lead Engineer) found the
  dashed-border empty-state card duplicated 15 times across 9 files and
  confirm-delete reimplemented independently 4+ times, each with slightly
  different copy/behaviour. Phase 2 built and adopted `StudioPageHeader`
  (the highest-priority duplication) but deliberately did not build these
  two — correctly scoped as Medium priority given the mission's size, but
  the Phase 3 post-build review (Lead Engineer) found the raw confirm-delete
  count actually went *up* (4+ → ~10) since Phase 2's own new confirm-step
  additions (cancel subscription, remove client/team member) each reused
  the *shape* correctly but each is still its own bespoke implementation,
  not a shared one.
- **Objective**: one `StudioEmptyState` component (icon, heading, body,
  optional CTA) and one `ConfirmDeleteButton`/`useConfirmDelete()` hook,
  each adopted everywhere the pattern currently exists by hand.
- **User**: no direct user-facing change intended — this is a
  maintainability/consistency fix so a future visual or behavioural change
  to either pattern lands in one place, not 10-15.
- **Priority**: P2 (worth doing, not urgent — the user-facing cohesion win
  already shipped via `StudioPageHeader`; this is the maintainability
  half Phase 2 didn't have room for).
- **Expected outcome**: a real reduction in duplicate markup/logic; no
  visible change to end users beyond incidental copy consistency.
- **Acceptance criteria**: both primitives built; every one of the ~15
  empty-state sites and ~10 confirm-delete sites (per Lead Engineer's
  Phase 1/Phase 3 file lists in `STUDIO_DESIGN_AUDIT.md`) adopts them;
  `tsc`/`eslint`/full test suite green; no behaviour change to any
  existing delete/empty-state flow.
- **Relevant agent**: Lead Engineer.
- **Dependencies**: none.
- **Status**: Not started.

### Consolidate the 4 duplicated assignee-select components into one shared control

- **Problem**: Studio Design Audit Phase 1 (QA Engineer) found the
  Prospects, Requests, Projects, and Website Builder assignee `<select>`
  controls independently reimplement the same optimistic-update-plus-
  error-surfacing shape. Phase 2 fixed the actual bug (silent rollback
  with no error message) in all 4, but did not consolidate them into one
  component — correctly deferred as Low priority (QA's own original
  scoping) since the bug fix, not the consolidation, was the real
  user-facing problem.
- **Objective**: one shared `AssigneeSelect` component so the same fix
  doesn't need to be applied 4 separate times if this bug class recurs.
- **User**: no direct user-facing change — maintainability only.
- **Priority**: P3 (someday) — real, but genuinely lower value than the
  empty-state/confirm-delete consolidation above since the bug itself is
  already fixed everywhere it existed.
- **Expected outcome**: one component, 4 fewer independent
  implementations to keep in sync by hand.
- **Relevant agent**: Lead Engineer.
- **Dependencies**: none.
- **Status**: Not started.

### Standardise a "Generated {date} · Regenerate" provenance line across every cached AI artifact

- **Problem**: Studio Design Audit Phase 1 (AI/Agent Architect) found
  `website-brief-panel.tsx` shows a real "Generated {date}" line on its
  cached AI output but the sales-kit and website-mockup preview components
  (now in `src/components/platform/prospecting/`) don't have an equivalent
  — inconsistent legibility of "this is cached AI output, not live" across
  otherwise-similar surfaces.
- **Objective**: one small shared component used everywhere a cached AI
  artifact is shown.
- **User**: an agency owner reviewing a generated kit/mockup/brief, so
  they can tell at a glance whether they're looking at something fresh or
  something generated a while ago.
- **Priority**: P3 (someday) — real but cosmetic; correctly deferred, not
  a build-blocking gap.
- **Relevant agent**: AI/Agent Architect (spec) + Lead Engineer (build).
- **Dependencies**: none.
- **Status**: Not started.

### Reconcile the trial-status pill's count-up phrasing with the existing count-down phrasing elsewhere

- **Problem**: Studio Design Audit Phase 2 added a "Trial · Day X of 7"
  pill (count-up) for days 4-7 of a trial; the existing ≤3-day warning
  banner and the Billing page both already use count-down phrasing
  ("X days left"). Found by Growth & Analytics in the Phase 3 post-build
  review — a new, minor inconsistency that didn't exist before this pill
  was added.
- **Objective**: pick one framing (count-down is likely more intuitive —
  "3 days left" vs. "Day 4 of 7" both work, but having both live
  simultaneously across 3 surfaces is the actual problem) and apply it
  everywhere trial status is shown.
- **Priority**: P3 (someday) — cosmetic, not confusing enough to block
  anything, but a real, named inconsistency.
- **Relevant agent**: UX/UI Director (pick the framing) + Lead Engineer
  (apply it in `(authed)/layout.tsx` and `billing/page.tsx`).
- **Dependencies**: none.
- **Status**: Not started.

### Dormancy signal for trialing/paying orgs with zero real activity

- **Problem**: Studio Design Audit Phase 1 (Growth & Analytics) found the
  only automated re-engagement mechanism today is trial-deadline-driven
  (`trial-reminders.ts`) — there's no "you signed up and never came back"
  signal, the most common real early-SaaS drop-off pattern. No
  "last active" column or query exists anywhere in `/studio` today; this
  would need new instrumentation against `usage_events`/`ai_call_log`,
  not a guess.
- **Objective**: instrumentation first (what does "inactive" actually
  mean against real rows), a real email/digest addition second.
- **Priority**: P2 (worth doing) for the instrumentation question itself;
  the email/digest half is explicitly **not** approved to build without
  Hamish's own sign-off first.
- **Explicit constraint, not to be missed**: this sits close enough to
  the standing pre-2026-11-09 no-outreach rule (`PRODUCT.md`) that Growth
  & Analytics' own Phase 1 review flagged it as a borderline case —
  arguably fine as inbound-account-lifecycle mail (same category as the
  existing trial reminders), not solicitation of a new prospect, but that
  judgment call is Hamish's to make explicitly before anything is built,
  not assumed by whichever agent picks this up.
- **Relevant agent**: Growth & Analytics (design the "what counts as
  active" query) → Product Director (confirm the outreach-constraint
  framing with Hamish before scoping further).
- **Dependencies**: Hamish's explicit sign-off on the outreach-framing
  question before any email/digest is built.
- **Status**: Not started.

## Needs review

### Wire the same outreach-kit action to Command Centre's Top Prospects list (fast-follow to the shipped topOpportunity action)

- **Problem**: the single `topOpportunity` callout in the "Your briefing"
  card already lets an owner one-click-generate a sales kit without leaving
  Command Centre (`src/components/platform/top-opportunity-kit-action.tsx`,
  shipped 2026-08-31). The `top_prospects` section card renders the
  identical data shape — `briefing.topOpportunities`, a `TopOpportunity[]`
  with the same real `id`/`hasSalesKit` fields (`src/lib/studio-briefing.ts`)
  — for all 5 top-ranked prospects, but only the first one (folded into
  "Your briefing") had the action wired; the other 4 rows (and the whole
  card, for an org that's configured `top_prospects` as its own block) still
  only linked out to `/studio/prospects`.
- **Objective**: every row in the `top_prospects` section card gets the same
  one-click "Generate outreach kit" / "Outreach kit ready" control the
  `topOpportunity` callout already has, not just the card's single featured
  row.
- **User**: an agency owner scanning Command Centre who wants to act on any
  of their top 5 real prospects without navigating to `/studio/prospects`
  first.
- **Priority**: P1 (next) — smallest possible increment on a pattern
  already built, tested, and live; zero new pipeline, zero new usage type.
- **Expected outcome**: an owner can generate (or see already-generated)
  outreach kits for all 5 top prospects directly from Command Centre; they
  only navigate to `/studio/prospects` to actually review/copy/send the
  generated content, not to trigger generation itself.
- **Acceptance criteria**: `TopOpportunityKitAction` (or an equivalent
  thin wrapper) renders under each of the 5 `top_prospects` rows in
  `command-centre-section-cards.tsx`, keyed off each row's own `id`/
  `hasSalesKit`; `generateSalesKit()` called verbatim — no new pipeline, no
  new usage-event type; resting/pending/success/error/usage-limit states
  and `aria-live` region match the shipped precedent exactly; tests confirm
  each row's pending/success/error state is independent (one row's click
  doesn't affect its siblings); `npx tsc --noEmit`, `npx eslint`, full
  `vitest` suite green.
- **Relevant agent**: Lead Engineer (build, done); UX/UI Director should
  confirm 5 independent action controls in one card doesn't read as
  visually noisy before this ships more broadly.
- **Dependencies**: none — reuses `TopOpportunityKitAction`,
  `generateSalesKit()`, and `briefing.topOpportunities` as-is.
- **Closure note (Lead Engineer, 2026-08-31)**: built as scoped.
  `TopOpportunityKitAction` gained an opt-in `compact` prop (tighter
  `xs`-size button, `mt-1.5` instead of `mt-2`) and every `top_prospects`
  row now mounts its own instance keyed off `opp.id`/`opp.hasSalesKit`,
  passing `compact`. `generateSalesKit()` is called verbatim, same
  resting/pending/success/error/usage-limit states and `aria-live="polite"`
  region as the shipped `topOpportunity` precedent — no new pipeline, no
  new usage-event type. Row independence (one row's pending/error state
  never affecting a sibling) is covered in both
  `top-opportunity-kit-action.test.tsx` (2 sibling instances) and
  `command-centre-section-cards.test.tsx` (all 5 real rows, keyed by id,
  through `buildSectionContent`'s actual `top_prospects` output). Full
  suite green: `npx tsc --noEmit -p .`, `npx eslint`, `npm run test`
  (250/250). **Left open**: the backlog's own visual-density question.
  I made the conservative call the backlog invited ("implement the most
  conservative/compact reasonable option... flag it for UX/UI Director's
  visual judgment") rather than guess confidently — `compact` shrinks the
  button and margin but doesn't otherwise redesign the row (no accordion,
  no icon-only collapse, no hover-reveal). Whether 4 real xs-buttons plus
  1 "ready" link, stacked in one already-dense card, reads as noisy on a
  live authenticated screen is a real call only UX/UI Director's visual
  judgment can close — moving to Needs review rather than Complete for
  that reason, not because any acceptance criterion is unmet.
- **Status**: Needs review

## Complete

### One-click "Send payment reminder" on Command Centre's Engagement Risk card, for rows with a real overdue invoice

- **Problem**: `engagement_risk` rows (`studio-engagement.ts`) already
  carry a real, per-client `hasOverdueInvoice` boolean, computed from real
  `invoices.status`/`due_date` — but the Command Centre card only shows a
  badge, no id, no action. A working, already-shipped, non-AI, non-metered
  pipeline for exactly this — `sendInvoiceReminder(invoiceId)`
  (`src/lib/send-invoice-reminder.ts`) — already exists and is live in
  production today via `/admin/clients/[id]`'s "Send reminder" form
  (single-tenant, Hamish's own agency) — it has simply never been wired
  into the multi-tenant `/studio` product, which currently has no invoice-
  reminder entry point anywhere.
- **Objective**: an owner viewing Command Centre's Engagement Risk card can
  send the same real payment-reminder email to a client with a real
  overdue invoice, in one click, without leaving Command Centre.
- **User**: an agency owner running Command Centre who sees a client
  flagged "Invoice overdue" and wants to nudge them immediately.
- **Priority**: P1 (next) — real signal, a real existing entity id (once
  threaded through), and a real existing pipeline; the net-new work is a
  Studio-scoped Server Action wrapper and a UI leaf, not new plumbing or a
  new AI pipeline.
- **Expected outcome**: engagement_risk rows with `hasOverdueInvoice` show
  a "Send reminder" / "Reminder sent" one-click control; clicking it sends
  the exact same email `sendInvoiceReminder()` already sends via `/admin`,
  scoped and ownership-checked for the calling org.
- **Acceptance criteria**:
  - `ClientEngagementRisk`/`computeClientEngagementRisk`
    (`studio-engagement.ts`) extended to carry the specific overdue
    invoice's `id` (and `reminder_sent_at`) alongside the existing
    boolean — zero new query: `invoices.id` is already selected on this
    same page load (`page.tsx`'s existing `invoices` fetch).
  - A new Studio-scoped Server Action (e.g. `sendClientInvoiceReminderAction`
    in `clients/actions.ts`) verifies the invoice's client belongs to the
    caller's org (same `.eq("org_id", orgId)` ownership-check pattern
    `createClientInvoice` already uses) before calling the existing
    `sendInvoiceReminder()` verbatim — no new email template, no new AI
    call, no new usage-event type.
  - A new client leaf component matching the shipped state machine
    (resting/pending/success/error — no usage-limit state needed, this
    isn't AI-metered) wired under engagement_risk rows with
    `hasOverdueInvoice`.
  - A reminder already sent (`reminder_sent_at` not null) renders as
    already-done, same "don't re-offer something that already happened"
    rule as `hasKitInitially`.
  - Tests cover the ownership check (reject an invoice belonging to
    another org), already-sent state, pending/success/error.
  - `npx tsc --noEmit`, `npx eslint`, full `vitest` suite green.
- **Relevant agent**: Lead Engineer (build, done); Security Auditor should
  spot-check the new ownership check specifically — this is a new write
  path that sends a real email to a real client off a one-click UI
  control, a materially different risk shape from the shipped precedent
  (which only *generates content for the owner to review*, sends nothing).
  Flag for Hamish's explicit sign-off before merging, on the same basis
  the shipped `topOpportunity` action needed sign-off ("does a one-click
  dashboard entry point to a real customer-facing action change the risk
  profile") — even though this path is neither AI nor metered, it's the
  first Command Centre one-click control that fires an email with no
  review step in between.
- **Dependencies**: none blocking — `sendInvoiceReminder()`, `invoices.id`/
  `reminder_sent_at`, and the ownership-check pattern all already exist.
- **Closure note (Lead Engineer, 2026-08-31)**: built as scoped, plus one
  real bug found and fixed before wiring anything up, per this item's own
  instruction to check the email's identity first.

  **The identity bug, confirmed real**: `sendInvoiceReminder()`
  (`src/lib/send-invoice-reminder.ts`) had zero sender-identity handling —
  it always called `sendClientEmail()` (hardcoded
  `"Hamish AI <hello@hamishai.org>"`, `send-client-email.ts`) and always
  signed the body "— Hamish AI", regardless of whose client the invoice
  actually belonged to. Harmless while the only caller was `/admin`
  (always genuinely Hamish's own clients), but this is the *exact* risk
  category `create-invoice.ts`'s and `triage-request.ts`'s own
  `sender.isInternal` gates already exist in this codebase to close for
  every other client-facing send — confirmed by reading those two files'
  own comments directly, not inferred. Sending a tenant's own client a
  payment reminder signed "Hamish AI" would have been a real, visible,
  first-of-its-kind identity leak the moment any non-internal org used
  this feature.

  **Fix, same precedent, not reinvented**: `sendInvoiceReminder()` now
  resolves the invoice's client's org (same shape as `create-invoice.ts`'s
  own sender resolution — a client with no `org_id` is treated as a
  legacy internal client, matching `resolveSender()`'s own rule) and
  refuses to send at all — returning `{ error, reason:
  "tenant_email_unsupported" }` — for any client whose org isn't a
  *confirmed* internal org. This fixes the gap at the shared function, so
  it also protects the existing `/admin` call site going forward, not just
  this new one (no behaviour change there today — Hamish's own clients are
  always internal-org or legacy `org_id: null`).

  **Real per-tenant email sending doesn't exist yet, so this narrows the
  feature's scope — flagged, not silently shipped**: Studio's Command
  Centre UI (`command-centre-section-cards.tsx`, gated via a new
  `isInternalOrg` prop threaded from `page.tsx`'s own already-fetched
  `org.is_internal`) now renders the "Send reminder" control *only* for
  HamishAI's own internal org — the same "isInternal check happens one
  level up, in the page" precedent `branding-panel.tsx` already
  established (there, the inverse: hidden *for* the internal org). This
  means, as shipped, only Hamish's own agency can actually use this
  one-click control today — every other real tenant org still sees the
  existing "Invoice overdue" badge with no action, i.e. no regression, but
  also not the broad multi-tenant capability the objective above
  describes. Building real per-tenant email identity (a verified sending
  domain or reply-to per org) is a separate, materially larger piece of
  infrastructure, out of scope here. **This is exactly the kind of design
  call this task's own brief said not to resolve unilaterally** — moving
  to Needs review rather than Complete for that reason, and because the
  item's own "Relevant agent" note already calls for Security Auditor
  spot-check + Hamish's explicit sign-off before this is genuinely done.
  If Hamish wants the multi-tenant capability sooner, the real per-tenant
  email-identity work is the actual next dependency, not more wiring here.

  **Separate, pre-existing data-integrity gap found and flagged, not
  fixed** (out of scope for this item): the Stripe subscription webhook's
  own `invoices` insert (`src/app/api/webhooks/stripe/route.ts`) doesn't
  set `org_id` explicitly, unlike `create-invoice.ts` (fixed earlier this
  session) — so a recurring-subscription invoice's `org_id` column
  silently defaults to HamishAI's own org id regardless of whose client
  it's actually for (same bug class `knowledge/actions.ts`'s own comment
  already names as "found and fixed on requests.org_id and
  invoices.org_id," except this one insert site was missed). Not a
  cross-tenant security hole on its own (worst case is a false-negative
  ownership check for the true tenant, not a leak to a different tenant),
  but real and worth a follow-up. Working around it rather than relying on
  it: the new ownership check in `sendClientInvoiceReminderAction`
  (`clients/actions.ts`) verifies via the invoice's `clients!inner(org_id)`
  relationship (same join `requestBelongsToOrg` already uses), not
  `invoices.org_id` directly, so this feature's own correctness doesn't
  depend on that column being reliable.

  Implementation: `ClientEngagementRisk` gained `overdueInvoiceId`/
  `reminderSentAt`; `computeClientEngagementRisk` picks the
  earliest-due-date overdue invoice when a client has more than one
  (deterministic tie-break on `id` if due dates match exactly).
  `sendClientInvoiceReminderAction` (`clients/actions.ts`) verifies
  ownership then calls `sendInvoiceReminder()` verbatim. New client leaf
  `SendInvoiceReminderAction` (`send-invoice-reminder-action.tsx`) matches
  `TopOpportunityKitAction`'s exact resting/pending/success/error shape,
  minus the usage-limit state (not AI-metered). 3 new/updated test files:
  `studio-engagement.test.ts` (tie-break + id/reminder_sent_at surfacing),
  `send-invoice-reminder.test.ts` (the new sender gate — internal org,
  legacy no-org_id client, non-internal org refused, fail-closed on an
  errored org lookup), `clients/actions.test.ts` (the ownership check —
  this codebase's first Server-Action-level test, rejecting an invoice
  belonging to another org, verbatim delegation, error passthrough) and
  `command-centre-section-cards.test.tsx` (the `isInternalOrg` gate itself,
  already-sent state, pending/success/error). All 3 real call sites of
  `computeClientEngagementRisk` (`page.tsx`, `clients/page.tsx`,
  `owner-digest.ts`) updated to select the one new `reminder_sent_at`
  column. `npx tsc --noEmit -p .` clean, `npx eslint` clean on every
  touched file, full `vitest` suite green (266 tests, up from 244).
- **Closure note 2 (2026-09-02)**: both open threads this item's own
  "Needs review" status was waiting on are now resolved. (1) The
  isInternalOrg-only scope limitation — a separate commit (`17cc359`,
  "tenant-scoped outbound email") shipped `send-org-email.ts`, closing
  the real per-tenant email-identity gap this item's own closure note
  flagged. `sendInvoiceReminder()` now sends through it for any
  non-internal org with a configured reply-to (Settings), and the
  Command Centre gate is `canSendClientEmail`, not `isInternalOrg` —
  the one-click control is now genuinely multi-tenant, not
  HamishAI-only, without any further work needed here. (2) The
  Security Auditor spot-check this item's own "Relevant agent" note
  called for is now done: the ownership check
  (`sendClientInvoiceReminderAction`) is solid — `requireOrgId()`
  re-derives the caller's org server-side, the invoice lookup joins
  through `clients!inner(org_id)` with `maybeSingle()`, so a
  cross-tenant reminder send isn't reachable. One real, low-severity
  gap found and fixed: `organisations.name` was only whitespace-trimmed
  at signup, with no control-character stripping, and landed directly
  in `sendOrgEmail()`'s From header — hardened in `send-org-email.ts`
  (commit `d91d310`). Not a confirmed exploit (Resend's API almost
  certainly already rejects header-injection attempts), pure defense
  in depth, and no cross-tenant boundary was ever at risk (a tenant's
  own org name only ever affects their own outgoing email). Both
  original blockers closed — moving to Complete.
- **Status**: Complete

### AI-assisted signed value — a real, computed "AI ROI" number on Billing

- **Problem**: Billing's "Usage this month" card (`src/app/studio/(authed)/billing/page.tsx`)
  shows an agency owner 10 real, plan-limited action counts ("14 of 30 sales
  kits generated") with no outcome ever attached — pure activity metering.
  It never answers the question that actually drives renewal/upgrade
  decisions: did any of that AI activity turn into a real client. There is
  no existing metric anywhere in the app that ties a specific AI action to
  a specific won deal — `studio-analytics.ts`'s "Revenue" KPI and Command
  Centre's "Pipeline value" stat are both real, but neither is AI-attributed
  (Revenue is all paid invoices regardless of origin; Pipeline value is
  every open deal's estimate regardless of whether AI touched it).
- **Objective**: an agency owner can see a real, computed, honestly-labelled
  figure — "this month, N of your M signed clients had a sales kit or
  website mockup generated for them before they signed, worth £X in
  recorded deal value" — turning usage metering into an outcome-tied
  retention lever, without fabricating anything usage-limits.ts's own data
  can't actually support.
- **User**: an agency owner (especially one on the fence about renewing or
  upgrading) who wants evidence the AI activity they're paying for is
  actually landing clients, not just running.
- **Priority**: P1 — directly answers a stated product goal, is fully
  computable from columns that already exist today (zero migration), and
  is a natural extension of an already-shipped pattern (Billing's usage
  card, Command Centre's Pipeline value card) rather than new plumbing.
- **What's actually real and computable (verified against the schema/code,
  not assumed)**:
  - `usage_events` (`schema-usage-events.sql`) carries only `org_id`,
    `event_type`, `created_at` — **no entity reference at all**. It cannot
    tell you *which* prospect a sales-kit generation touched, only that the
    org generated one. Any per-prospect attribution has to come from the
    `prospects` row itself, not this table.
  - `prospects` gained real, timestamped AI-touch columns via separate
    migrations: `sales_kit_generated_at` (`schema-sales-kit.sql`) and
    `website_mockup_generated_at` (`schema-website-mockup.sql`) — both set
    only by an explicit, tenant-triggered action
    (`generateSalesKit`/`generateWebsiteMockup`,
    `prospects/actions.ts`), never automatically. `research_generated_at`
    (`schema-lead-research.sql`) also exists but is **excluded from this
    metric's attribution rule** — `discover-leads.ts`'s `researchLead()`
    call now runs automatically for every prospect found through normal
    discovery (confirmed by reading `insertCandidates()`'s own call site,
    not assumed), so it no longer distinguishes "AI did something for this
    specific deal" from "this prospect exists at all." Including it would
    make nearly every converted prospect qualify by default, diluting the
    signal into meaninglessness.
  - `prospects.status = 'converted'` is set by `convertProspectToClient`
    (`prospects/actions.ts`), but **there is no `converted_at` timestamp
    column on `prospects`** — confirmed via a full grep of every
    `alter table prospects` statement in `supabase/`. The real, reliable
    proxy is `clients.created_at`: the `clients` row is inserted atomically
    in the same function, at the exact moment of conversion, with
    `source_lead_id` pointing back at the prospect
    (`schema-client-source-lead.sql`). Use `clients.created_at`, not any
    prospect column, as "when this deal closed."
  - `prospects.deal_value_pence` (`schema-prospect-pipeline.sql`) is the
    only real monetary figure available at/around conversion — a tenant's
    own manual, optional estimate (`updateProspectDealValue`'s own comment:
    "null is a valid, common state... haven't sized this one yet"), never
    AI-generated. Already trusted at face value for Command Centre's
    existing "Pipeline value" stat card (`page.tsx`, summed over open
    deals) — this task reuses that exact same trust level and field, just
    summed over a different (closed, AI-touched) subset. **It is not
    verified/billed revenue** — `invoices.amount_pence` is the only real
    billed-money table, but requires the org to have separately invoiced
    that client through the platform, which is a materially sparser,
    laggier data source at this org's real current volume (2 signed-up
    orgs) — using it would make this feature return near-nothing, near-
    always. `deal_value_pence` is the honest, already-established choice;
    it just must never be labelled as "revenue" or "billed."
- **The attribution rule** (disclosed to the user, not a black box): a
  client counts as **AI-assisted** for a given calendar month if —
  1. `clients.created_at` falls in that calendar month (same calendar-month
     convention as `usage-limits.ts`'s `startOfMonth()`, not a rolling 30
     days).
  2. `clients.source_lead_id` is not null (manually-added clients have no
     prospect to check an AI touch against, and are excluded from this
     metric's population entirely — still counted everywhere else, e.g.
     the "New clients" KPI, just not here).
  3. The referenced prospect's `sales_kit_generated_at` OR
     `website_mockup_generated_at` is not null **and is `<=`
     `clients.created_at`** — the AI deliverable existed before the deal
     closed, not generated afterwards as an unrelated coincidence.
  - **What this does NOT claim**: this is correlation ("AI touched this
    prospect before it became a client"), not causation ("AI is why it
    signed"). The UI copy and its `HelpTip` must say so explicitly, e.g.:
    *"Counts a client as AI-assisted if you generated a sales kit or
    website mockup for them before they signed. This shows the AI action
    happened first — not that it's the reason they signed. Deal value, if
    recorded, is your own estimate on the prospect, not verified invoiced
    revenue."*
  - The £ figure sums `deal_value_pence` only across AI-assisted clients
    that have a non-null value — clients with no recorded estimate simply
    don't add to the sum (never treated as £0 requiring display, never
    invented). The **count** ("N of M clients signed this month were
    AI-assisted") is real and useful independent of whether deal values are
    recorded at all, and should be the headline figure with £ as a
    secondary line only when at least one non-null value exists in that
    set — this also means the feature doesn't collapse to a discouraging
    "£0" the moment `deal_value_pence` adoption is low, which is the
    likely real state today given how optional that field is.
- **Where this surfaces, and why**: **Billing**, not Command Centre, for
  v1 — this is a direct answer to the mission's own framing ("instead of
  usage metering that tracks activity but never ties it to outcome"):
  Billing's existing "Usage this month" card *is* that exact usage-metering
  surface today, so pairing an outcome figure right next to/above it is the
  most direct fix to the actual problem, not a new dashboard concept. A
  scaled-down Command Centre version (a stat card alongside "Pipeline
  value") is a real, obvious fast-follow — same incremental-shipping
  pattern as `topOpportunity` → `top_prospects` this session — but not v1
  scope, to keep this thin.
  - When zero clients converted this month at all (the likely common case
    at current real volume), **hide the card entirely** rather than show
    an empty "0 of 0" state — same "only render what has real content"
    rule `studio-insights.ts`/Command Centre's section cards already
    follow, and a bare zero on a feature meant to demonstrate value would
    read as "nothing's working," the opposite of a retention lever.
- **Expected outcome**: Billing shows a new card (module suggestion:
  `src/lib/studio-ai-roi.ts`, matching the pure-function-plus-real-rows
  convention of `client-health.ts`/`studio-engagement.ts`/
  `studio-briefing.ts`) with the AI-assisted client count this month, and
  (when real deal-value data exists for at least one of them) the summed
  estimated deal value, with an honest `HelpTip` disclosure of the
  attribution rule and its correlation-not-causation limit.
- **Acceptance criteria**:
  - New pure function (e.g. `computeAiAssistedSignedValue`) takes real rows
    only — `clients` (`id`, `created_at`, `source_lead_id`) and `prospects`
    (`id`, `deal_value_pence`, `sales_kit_generated_at`,
    `website_mockup_generated_at`) already scoped to the org and to clients
    created this calendar month — and returns `{ signedThisMonth: number,
    aiAssistedCount: number, aiAssistedValuePence: number | null,
    aiAssistedClients: Array<{ clientId, businessName, dealValuePence:
    number | null, touchedVia: "sales_kit" | "website_mockup" | "both" }>
    }`. `aiAssistedValuePence` is `null` (not `0`) when no AI-assisted
    client in that set has a recorded `deal_value_pence`, so the UI can
    distinguish "no data" from "genuinely zero."
  - Zero new usage-event type, zero new schema/migration — every column
    referenced already exists in production.
  - Query added to `billing/page.tsx` follows the same session-scoped
    org-membership pattern every other query on that page already uses;
    `is_internal` orgs are included (this isn't a plan-limit concept, no
    reason to exclude Hamish's own org the way usage bars do).
  - Card hidden entirely when `signedThisMonth === 0`; count-only shown
    when `aiAssistedValuePence === null`; count + £ shown when it isn't.
  - `HelpTip` (or equivalent) states the attribution rule and the
    correlation-not-causation limit in plain language, matching this
    entry's own suggested copy or materially equivalent.
  - Tests cover: a client with no `source_lead_id` excluded from the
    population; a prospect whose AI-touch timestamp is *after*
    `clients.created_at` excluded (touched-after-signing doesn't count); a
    prospect with only `research_generated_at` set (no sales kit/mockup)
    excluded; the null-vs-zero distinction for `aiAssistedValuePence`; a
    client outside the current calendar month excluded.
  - `npx tsc --noEmit`, `npx eslint`, full `vitest` suite green.
- **Relevant agent**: Lead Engineer (build); UX/UI Director should confirm
  card placement/copy on Billing reads clearly next to the existing usage
  card rather than competing with it; Growth & Analytics is the natural
  owner of watching whether this number, once real volume exists, actually
  changes retention/upgrade behaviour — not something to claim now.
- **Dependencies**: none blocking — every column this relies on
  (`clients.created_at`, `clients.source_lead_id`,
  `prospects.deal_value_pence`, `prospects.sales_kit_generated_at`,
  `prospects.website_mockup_generated_at`) already exists in production.
- **Does NOT need Hamish's sign-off before building**: no schema migration,
  no billing/Stripe/payment logic change, no auth/RLS change, no new
  usage-metered AI call — purely a new read-only display computed from
  existing rows, additive to an existing page. Falls squarely inside
  `docs/ai-team/README.md`'s "safe autonomous actions," not its approval-
  required list.

Closed 2026-08-31 (Lead Engineer) — built exactly to this entry's own
attribution rule and return shape, no re-derivation. **Problem**: Billing's
"Usage this month" card metered AI activity with no outcome ever attached
— no number anywhere tied a specific AI action to a specific won deal.
**What shipped**: `src/lib/studio-ai-roi.ts` — a new pure function,
`computeAiAssistedSignedValue(clients, prospects, now)`, matching the
pure-function-plus-real-rows convention of `client-health.ts`/
`studio-engagement.ts`. It filters `clients` to the given calendar month
(own `isInCalendarMonth()` helper, same convention as `usage-limits.ts`'s
`startOfMonth()`), then for each signed client with a `source_lead_id`,
checks its referenced prospect's `sales_kit_generated_at` /
`website_mockup_generated_at` against `clients.created_at` — not null and
`<=` signing time counts as AI-assisted, `touchedVia` distinguishing
`"sales_kit"` / `"website_mockup"` / `"both"`. `research_generated_at` is
never checked, per this entry's own reasoning (now automatic on every
discovered prospect, so no longer a meaningful signal).
`aiAssistedValuePence` sums `deal_value_pence` only across AI-assisted
clients that have a non-null recorded estimate, and is `null` (not `0`)
when none do — the null-vs-zero distinction this entry's acceptance
criteria require. One deliberate, justified deviation from this entry's
literal input-column list: the `clients` row also carries `business_name`
(not listed in the "what's computable" column list, but required by the
entry's own specified return shape, `aiAssistedClients[].businessName`,
which has nowhere else to come from) — the query in `billing/page.tsx`
selects it accordingly.

Wired into `src/app/studio/(authed)/billing/page.tsx`: two new
session-scoped, org-filtered queries (`clients`
id/business_name/created_at/source_lead_id,
`prospects` id/deal_value_pence/sales_kit_generated_at/
website_mockup_generated_at), same RLS-boundary pattern every other query
on that page already uses. `is_internal` orgs are included (unlike the
usage bars above it) — not a plan-limit concept, no reason to exclude
Hamish's own org. New card renders directly below the existing "Usage
this month" card, `TrendingUp` icon, headline "N of M clients signed this
month were AI-assisted" (`CountUp` on the AI-assisted count, following
this page's existing convention of animating only the number that
actually changes month to month), a secondary £ line only when
`aiAssistedValuePence !== null`, and a `HelpTip` stating the attribution
rule and the correlation-not-causation limit in this entry's own suggested
copy verbatim. Card is hidden entirely — not an empty/zero state — when
`signedThisMonth === 0`; when clients did sign this month but none were
AI-assisted, the card still renders "0 of N," which is real, non-fabricated
data, not the empty case this entry's hide-rule is about.

8 new tests (`src/lib/studio-ai-roi.test.ts`) covering all 5 cases this
entry's acceptance criteria name (client with no `source_lead_id` excluded
from the population; AI-touch timestamp after `clients.created_at`
excluded; a prospect with neither `sales_kit_generated_at` nor
`website_mockup_generated_at` set excluded; the null-vs-zero distinction
for `aiAssistedValuePence`; a client outside the current calendar month
excluded) plus 3 more (deal-value summing skips unpriced AI-assisted
clients; `touchedVia` labelling across all three cases; a `source_lead_id`
pointing at a prospect absent from the input array is treated as no
attribution, not a crash). One real, timezone-sensitive test bug caught
and fixed while writing these: an initial test used a client
`created_at` of `"2026-07-31T23:59:59Z"` to represent "last month," which
shifted into the current month under `computeAiAssistedSignedValue`'s
local-calendar-month arithmetic on a BST-offset system clock (same
`new Date(y, m, 1)` local-time convention `usage-limits.ts`'s own
`startOfMonth()` already uses, kept for consistency rather than
"fixed" here) — moved the fixture to `2026-07-15T12:00:00Z`, safely away
from any month boundary regardless of the runner's local timezone.

`npx tsc --noEmit`, `npx eslint` (all touched files), the full `vitest`
suite (294 tests, all green), and `npm run build` (production build
succeeds — the RSC-boundary class of bug tsc/eslint/vitest can't catch)
all clean. **What's NOT verified**: no live-browser check was possible in
this session — the card's real rendering against a live org's actual
`clients`/`prospects` data (in particular, whether any org today has a
client that actually satisfies the attribution rule, given the stated real
current volume of 2 signed-up orgs) was not confirmed against a real
signed-in session. UX/UI Director should confirm card placement/copy reads
clearly next to the existing usage card, per this entry's own "Relevant
agent" note.

**QA + UX/UI Director review pass (orchestrator, 2026-08-31)** — both ran
against the finished build, in parallel; both found and fixed a real issue
rather than rubber-stamping it. **QA**: the attribution rule's date
comparison used raw ISO-string `<=`, which can invert real chronological
order when a JS `Date#toISOString()` timestamp (`draft-sales-kit.ts`/
`draft-website-mockup.ts`) is compared against a Postgres/PostgREST
`timestamptz` value sharing the same second but a different offset/
precision suffix (`"Z"` sorts after `"9"` lexically) — switched to epoch-
millisecond comparison, immune to format/precision differences; added 4
tests covering the exact bug, an inclusive exact-timestamp match, and both
calendar-month boundary edges. **UX/UI Director**: the "0 of N AI-assisted"
state (real, deliberately not hidden) read as a bare verdict with nothing
else on it, right on the page an owner reads before a renew/upgrade
decision — added a muted, actionable line instead of fabricating
positivity; also renamed the on-page heading from "AI-assisted signed
value" to "AI-assisted clients" (the old title over-promised a £ figure
the card usually won't have at current real `deal_value_pence` adoption),
and gave the £ line the same `CountUp`/`tabular-nums` treatment every
other real figure in Studio already has. Live-browser check still not
possible (port 3000 held by another session; no test credentials past the
auth wall) — this remains the one unverified acceptance criterion, flagged
for Hamish to eyeball on `/studio/billing` whenever convenient, not
blocking. `npx tsc --noEmit`, `npx eslint`, full `vitest` suite (298
tests), and `npm run build` all re-verified clean by the orchestrator
after both agents' changes, not just each agent's own self-report.
- **Status**: Complete

### Studio's background — off flat black, toward a toned, "some imagery" identity

- **Problem**: Hamish's own read on `/studio` today: the background reads as
  flat black/near-black, not "a nice slightly toned background... a bit more
  interesting and professional... some imagery." Verified against the actual
  tokens (`src/app/globals.css`'s `.studio-shell`, applied on
  `src/app/studio/(authed)/layout.tsx`'s root div): `--background: oklch(0.12
  0.025 260)` — L 0.12 at chroma 0.025 is functionally black to the eye; a
  human can't distinguish "very dark navy" from "very dark grey" at that
  little colour information. This is a real visual-identity gap, not a bug.
- **Objective**: land on one deliberate direction for Studio's background —
  a toned (not flat-black) base colour, plus an honest answer to "some
  imagery" — that Hamish picks from real options, not one the AI team guesses
  at and ships silently.
- **User**: every Studio user, every session — this is the base surface of
  the entire authed product, the single highest-exposure visual decision in
  the app.
- **Priority**: P1 — visual identity work Hamish explicitly asked for, but
  correctly gated on his own aesthetic judgment call before it's buildable.
- **Findings** (UX/UI Director, 2026-08-31):
  - `.studio-shell`'s three surface tokens sit within 0.03-0.04 OKLCH
    lightness units of each other (`--background` L0.12 → `--card` L0.16 →
    `--primary` L0.19) — already flagged elsewhere in
    `DESIGN-SYSTEM.md`'s `bg-primary` note as "read as one flat visual
    tier" for card-vs-primary; the same flatness is true one layer down,
    of background-vs-card, and is very likely a real contributor to "feels
    flat" independent of the primary-discipline fix already made.
  - `.aurora-bg` (`globals.css`) — a 3-blob radial-gradient mesh using the
    brand's own `--gradient-violet/-blue/-cyan-soft` tokens, with a slow
    drift animation and a `prefers-reduced-motion` off-switch already
    wired — is fully defined but **not applied anywhere in the live
    codebase today** (confirmed: a repo-wide search for `aurora` only
    hits `globals.css` itself and doc references, zero component/page
    usage). `CLAUDE.md`'s description of it as "used for hero washes" is
    stale/aspirational, not a description of a page you can currently
    visit. This matters for the proposal below: adopting it in Studio
    isn't "borrowing the marketing site's signature moment" (there isn't
    one live to borrow) — it's activating a dormant, already-on-brand
    utility for the first time, in the one part of the product where a
    tasteful ambient wash fits (a persistent app shell, not a one-off
    landing hero).
  - `public/images/ai-solutions/*.png` (the real, established custom-
    illustration brand language per `CLAUDE.md`'s "Brand imagery pipeline")
    is deep-navy-background, glassy 3D icon renders with a soft blue/cyan
    glow and a faint constellation/node line-graph motif scattered around
    the subject. This is the actual reference point for "imagery" here —
    not stock photography, and not literally embedding these
    solution-specific icons (they're each about one AI capability, not a
    generic backdrop) but their *background treatment* (deep navy + soft
    cyan/blue glow + faint node-graph texture) is a legitimate, on-brand
    pattern to lift for an ambient app-shell background.
  - Structural point that changes the shape of the recommendation: Studio's
    cards are opaque (`bg-card`, not translucent), and most real Studio
    screens are card-dense (Command Centre alone has 7-8 stacked blocks).
    Any background treatment is only ever visible in the gaps *between*
    cards — margins, the header band, and, concretely, **the open gutters
    outside the centred `mx-auto max-w-6xl` content column on any viewport
    wider than ~1152px+padding**, which today are permanently flat
    `bg-background` with nothing in them. That's the highest-payoff, lowest-
    risk canvas for "some imagery": always visible, never overlaps a real
    card, and scales with viewport width rather than fighting content
    density. A treatment aimed at "make the whole page feel textured" would
    mostly get hidden behind opaque cards anyway on the busiest pages.
- **Recommendation — three concrete directions, cheapest to most involved**:

  **1. "Toned Ink" (tokens only — do this regardless of what else is picked).**
  Move `.studio-shell`'s three surface tokens off near-black, keeping their
  existing tier order and (per the flatness note above) slightly widening
  the deltas between them rather than just shifting all three by the same
  amount:
  ```
  --background: oklch(0.145 0.035 258)   /* was 0.12  0.025 260 */
  --card:       oklch(0.19  0.035 258)   /* was 0.16  0.025 260 */
  --primary:    oklch(0.225 0.04  258)   /* was 0.19  0.03  260 */
  ```
  Hue nudged from 260→258 to exactly match `--accent`/`--gradient-blue`'s
  own hue (was 2° off — imperceptible alone, but free to align while
  touching these tokens anyway). Chroma raised modestly (0.025→0.035,
  0.03→0.04) so the surface reads as a deliberate ink-navy rather than
  desaturated charcoal — at these lightness levels OKLCH's chroma ceiling
  is naturally tight, so this is close to the practical maximum before it
  stops looking like "a serious dark app" and starts looking like a
  midtone blue panel. `--foreground`/`--card-foreground` stay at L~0.95 —
  contrast against the new L0.145-0.225 range is still far in excess of
  WCAG AA (the delta is nearly as large as the current 0.12-0.19 range;
  OKLCH lightness doesn't map 1:1 to WCAG relative luminance, so this
  needs a real contrast-checker pass as part of the live visual check
  below, but there is no scenario at these deltas where AA fails). This
  alone answers "toned" and "more professional" — it does not answer
  "some imagery."

  **2. "Ambient signal" (Toned Ink + a tuned-down `.aurora-bg`) — recommended.**
  Activate `.aurora-bg` for the first time, on the `.studio-shell` root div
  in `layout.tsx`, but re-tuned for a dark, work-surface context rather than
  a light marketing hero:
  - **Drop violet entirely.** `globals.css`'s own comment on
    `--gradient-violet` states it's "reserved as the single flourish on the
    Facet mark itself" — using it as a diffuse background wash directly
    contradicts that already-documented rule. Use blue+cyan only, which is
    also Studio's own existing accent family (`--accent` already reuses
    `--gradient-blue`'s hue).
  - **New, much lower alpha tokens** rather than reusing `-soft` (16-20%,
    tuned for sitting *under opaque white cards* per `:root`'s comment —
    at that alpha over a dark shell the blobs would be gaudy and, per the
    structural point above, would mostly show up in gutters where they'd
    read as much brighter, more saturated patches than intended):
    `--gradient-blue-soft-dark: oklch(0.58 0.21 258 / 5%)`,
    `--gradient-cyan-soft-dark: oklch(0.78 0.13 200 / 6%)`. Target: the
    brightest point of the glow should stay visibly below `--card`'s new
    L0.19, so it never reads as a competing surface tier — it's
    background texture, not a fourth card tier.
  - **Reposition the blobs toward the edges**, not the current 20/20,
    80/10, 60/70 percent spread (tuned for a hero image's rule-of-thirds
    composition) — e.g. `circle at 5% 10%` and `circle at 95% 15%`, biased
    toward the outer gutters identified above rather than the centre where
    the `max-w-6xl` content column always sits.
  - **Slow the drift** from 20s to ~45s — calm ambient life behind a
    productivity tool, not marketing-hero energy — `prefers-reduced-motion`
    already turns it off entirely via the existing `.aurora-bg::before`
    rule, no new work needed there.
  - This is CSS/token-only, reuses infrastructure that already exists and
    is already on-brand, ships in the same pass as Toned Ink, and directly
    answers "some imagery" without any new asset production.

  **3. "Signal constellation watermark" (most bespoke, defer for now).**
  A real, custom SVG echoing the ai-solutions illustrations' node-graph
  motif (faint dots + thin connecting lines), placed as a subtle watermark
  — scoped to the Command Centre header band only, not tiled across all 13
  Studio route folders (that would read as wallpaper fatigue on the pages
  that don't need it). This is the most genuinely "premium/bespoke" option
  and the closest literal match to "some imagery," but per `CLAUDE.md`'s
  brand imagery pipeline, the existing illustrations were produced through
  a real Canva/Figma process, not hand-coded — an AI-agent-coded SVG
  standing in for that pipeline's actual output would be a worse
  substitute, not a faithful extension of the established visual language.
  Recommend deferring this until/unless Hamish decides directions 1+2 don't
  go far enough, and if so, producing it through the real pipeline rather
  than approximating it in code.

  **My recommendation: ship 1+2 together.** It's the cheapest real answer
  to both "toned" and "some imagery," reuses a dormant but already-on-brand
  utility instead of inventing a new visual device, respects the
  violet-reserved-for-the-Facet-mark rule, and is structurally aimed at the
  part of the page (the outer gutters) where it'll actually be seen instead
  of hidden behind opaque cards. Direction 3 is a legitimate future option,
  not a "no."
- **What needs Hamish's own call, not the AI team's**: the exact chroma/hue
  target in Direction 1 is a real aesthetic choice with more than one valid
  answer — the recommendation above is a **cool navy** ink (hue 258, matches
  the brand's Signal Blue), staying inside the established "Edinburgh-ink
  navy + Signal Blue" identity from `globals.css`'s own `:root` comment. An
  equally valid but different-feeling alternative is a **warm neutral ink**
  (hue ~50-55, matching `--clay`'s warmth instead — e.g. `oklch(0.145 0.014
  50)`/`oklch(0.19 0.016 50)`/`oklch(0.225 0.018 50)`), which would feel more
  "boutique studio," less "generic SaaS dark mode," but drifts away from the
  navy identity the rest of the site is built around. Neither is more
  "correct" — this is the one part of this proposal that's a taste call, not
  an engineering one, and shouldn't be picked silently on Hamish's behalf.
- **Acceptance criteria**: Hamish picks a direction (1+2 cool-navy, 1+2
  warm-ink, or defers to scope Direction 3 first); Lead Engineer implements
  the chosen token changes plus (if 2 is included) the new `-soft-dark`
  tokens and the `.aurora-bg` activation on the shell; UX/UI Director does a
  **live, authenticated visual check** in the real Browser pane before
  calling this done — no live session was available for this research pass,
  so nothing here has been seen rendered, only reasoned from tokens/CSS.
  Contrast should be re-verified with a real contrast checker at that point,
  not just the OKLCH-lightness-delta reasoning above.
- **Relevant agent**: UX/UI Director (this proposal; live visual sign-off
  once built), Lead Engineer (token + CSS implementation once a direction is
  picked).
- **Dependencies**: Hamish's direction pick (cool-navy vs warm-ink vs
  defer-to-Direction-3) blocks implementation; a live authenticated `/studio`
  session (Hamish handing over the Browser pane, as done previously for this
  exact kind of visual verification) is needed for final sign-off.
- **Implementation note (Lead Engineer, 2026-08-31)**: Hamish picked
  **Direction 1+2, cool-navy**. Shipped exactly as scoped:
  `.studio-shell`'s `--background`/`--card`/`--primary` moved to the exact
  proposed values (`oklch(0.145 0.035 258)` / `oklch(0.19 0.035 258)` /
  `oklch(0.225 0.04 258)`); two new tokens
  `--gradient-blue-soft-dark: oklch(0.58 0.21 258 / 5%)` and
  `--gradient-cyan-soft-dark: oklch(0.78 0.13 200 / 6%)` added to `:root`;
  `.aurora-bg` activated on the `.studio-shell` root div in
  `src/app/studio/(authed)/layout.tsx`, overridden for Studio via a
  higher-specificity `.studio-shell.aurora-bg::before` rule in
  `globals.css` that drops the violet blob, uses the two new -dark tokens,
  repositions both blobs to the outer edges (`5% 10%` / `95% 15%`), and
  slows the drift to 45s (was 20s) — `.aurora-bg`'s own
  `prefers-reduced-motion` off-switch already covers this variant with no
  extra work. `bg-primary`/`text-primary-foreground`'s
  TodayStrip/`actions_required`-only reservation was not touched, and the
  glow (pseudo-element, z-index -1, behind the whole shell) is naturally
  confined to the gutters/margins since every card is opaque `bg-card` and
  the header is opaque `bg-background`. Ran a real WCAG contrast-ratio
  calculation (OKLCH→OKLab→linear-sRGB→relative-luminance, not eyeballed
  lightness deltas) for every combination the backlog flagged: foreground/
  card-foreground/primary-foreground vs. their new surfaces land 15.7–
  17.1:1; `--accent`, `--destructive`, `--success`, `--warning`/`--clay`,
  and `--muted-foreground` all still clear 5.5:1+ against both the new
  `--background` and `--card` — comfortably past AA's 4.5:1 (text) / 3:1
  (large text/UI) thresholds in every case. Also checked the aurora glow's
  brightest blended point stays below the new `--card` lightness (≈0.167
  and ≈0.183 vs. `--card`'s 0.19), per the spec's own target. `npx tsc
  --noEmit -p .`, `npx eslint` on the touched files, and the full
  `npm run test` suite (244 tests) all pass — this is CSS/token-only, no
  logic changed. **Not calling this Complete**: per this entry's own
  acceptance criteria, a live authenticated visual check by UX/UI Director
  (real Browser pane, real contrast-checker tool against actual rendered
  pixels rather than the token math above) is still outstanding — Hamish
  will need to sign into a real Studio session and hand over the Browser
  pane, same as the earlier Command Centre visual fix, before this is
  actually done.
- **Live check (orchestrator, via Hamish's real signed-in session, 2026-08-31)**:
  Hamish signed into a real Studio session and handed the Browser pane over.
  Confirmed via `getComputedStyle`/`getBoundingClientRect` at actual desktop
  width (1780px) that the glow renders exactly where designed — both blobs
  land in the true left/right gutters outside the `max-w-6xl` content
  column, not occluded by the header or sidebar as a narrower test width
  had first suggested. The real problem: at the spec's original 5%/6%
  alpha, the blended lightness only moves ~2 points on a 0-100 scale —
  correct per the design math, but visually imperceptible, especially once
  screenshotted/compressed. Hamish's own reaction confirmed this ("where?").
  Bumped `--gradient-blue-soft-dark`/`--gradient-cyan-soft-dark` from 5%/6%
  to 16%/18% alpha directly (no new proposal round needed — this is a
  magnitude adjustment within the already-approved direction, not a new
  design decision). Re-checked contrast math at the new values: blended
  peak lightness still lands around L10-16 (base ~L2.6, text foreground
  ~L90+) — nowhere close to threatening the 15-17:1 contrast ratios already
  verified, since the glow only ever sits in card-free gutters with no text
  in them. `npx tsc --noEmit -p .` clean. Confirmed live post-deploy: a
  real screenshot of the signed-in Command Centre now shows a genuinely
  visible blue wash in the top-left corner fading toward black — reads as
  intentional, not a flat-black default. Direction 2 ("Ambient signal")
  is done.
- **Status**: Complete

### Wire a one-click action to Command Centre's AI recommendations (recommend → act)

Closed 2026-08-31 (Lead Engineer) — Hamish had already approved this ("yes
build") so the spec's flagged dependency (whether a one-click dashboard
entry point to metered AI usage is acceptable) was resolved before this
build started, not decided unilaterally here. Built exactly to UX/UI
Director's 2026-08-31 design spec, v1 scope: the "Your briefing" card's
single `topOpportunity` callout only, not the 5-row `top_prospects` list
(an identical fast-follow once this is observed live, per the spec).

`generateSalesKit(prospectId)` (`src/app/studio/(authed)/prospects/actions.ts`)
is called verbatim — no new pipeline, no new usage type. Its error return
gained an additive `reason?: "usage_limit" | "rate_limited"` field, sourced
directly from `checkUsage()`'s own already-discriminated result;
`SalesKitSection` (the existing Prospects-page caller) is unchanged and its
own tests still pass. `TopOpportunity` (`src/lib/studio-briefing.ts`) gained
`hasSalesKit: Boolean(p.sales_kit)` — zero new query, the row was already
selected.

New client leaf `src/components/platform/top-opportunity-kit-action.tsx`
(same "use client"-leaf-in-a-server-built-card precedent as `HelpTip`),
wired into the `briefing` section card in
`command-centre-section-cards.tsx`, directly below the `pursueBecause`
paragraph. Button copy/icon/size is byte-identical to `SalesKitSection`'s
own "Generate outreach kit" control. States implemented per spec: pending
(disabled + spinner + "Writing…"), success (button replaced in place by an
"Outreach kit ready — Open in Prospects" link to `/studio/prospects` +
`router.refresh()`), generic/rate-limited error (`role="alert"` destructive
text), and usage-limit error (same alert text plus a "View plan" link to
`/studio/billing`). Whole action region wrapped in `aria-live="polite"`
per spec, an accessibility improvement not yet backported to
`SalesKitSection`/`ResearchTrigger` (flagged in the spec as a real,
separate follow-up, not done here). `hasKitInitially` seeds the component's
local "done" state directly (spec point 6): an opportunity whose prospect
already has a kit renders the "Outreach kit ready" link immediately, with
no click required and no re-offer of "Generate outreach kit" for something
that already exists.

7 new tests (`top-opportunity-kit-action.test.tsx`) covering resting,
already-done, pending, success (+ router.refresh call), generic error,
rate-limited error (no extra link), and usage-limit error (working "View
plan" link, and confirming `router.refresh()` is *not* called on an error
path). One real bug caught and fixed during test-writing, worth flagging:
a test that intentionally leaves an async `startTransition` callback
permanently unresolved (to assert the pending state) must still resolve it
before the test ends — left dangling, it silently broke a *later*,
unrelated test's button re-enabling in the same file when run as a full
suite (passed in isolation, failed in sequence). Also added
`@testing-library/jest-dom/vitest` to this test file, which turned out to
retroactively fix a pre-existing, already-failing `toBeInTheDocument`/etc.
matcher gap in a different, concurrently-authored test file
(`prospecting-panel.test.tsx`) that had never actually registered jest-dom's
matchers — not this task's scope to have introduced or been required to
fix, but a genuine improvement landed as a side effect.

`npx tsc --noEmit`, `npx eslint`, and the full `vitest` suite (244 tests)
all green.

**Live verification (orchestrator, via Hamish's real signed-in session,
2026-08-31)**: QA's static pass flagged two things it couldn't check without
a live session — confirmed both, one fully, one partially. (1) The
`hasSalesKit`-true path renders correctly with real data: Command Centre's
"Your briefing" card showed W Fitness (a real, 5/5-scored prospect) with
"Outreach kit ready — Open in Prospects" already displayed, correctly
reflecting that a kit already existed for it — no click required, exactly
per spec. Followed the link and opened the real "Outreach kit" tab on that
prospect: a genuine, specific, non-generic generated kit (outreach email,
follow-up email, call script, all referencing W Fitness's actual owners and
actual site gaps), confirming the Command Centre entry point correctly
links through to real generated content, not a stub. (2) NOT verified live:
the fresh click → pending → success transition — this org's current top
opportunity already had a kit, so the "Generate outreach kit" button never
appeared in its resting state to click. Lower risk than it sounds: that
exact click path reuses `generateSalesKit()` verbatim, the same function
`SalesKitSection` on the Prospects page has exercised in production for a
while — the new code is only the surrounding component's state machine,
which the 7 unit tests already cover directly. Worth a real click-through
whenever a fresh, kit-less top opportunity naturally comes up, not worth
manufacturing one to force the test.
- **Status**: Complete

### Investigate `useOptimistic` for Studio's Server Actions

Closed 2026-08-31 (Lead Engineer, implementing UX/UI Director's 2026-08-31
scoping note) — **candidate 1 only** shipped; candidates 2 and 3 are a real,
scoped follow-up, not silently dropped (see below). Note: the scoping
note's full text (ranked candidates, the two hand-rolled-vs-none gaps it
found, the "flagged as wrong candidates" list) was lost from this file
between being written and this closure, apparently overwritten by a
concurrent edit to this same file from another agent's session (the same
class of issue the "Recover PostHog funnel spec…" entry above hit) — its
substance is restated here from the implementing session's own record of
it, so the reasoning isn't lost a second time.

**What the scoping note found and ranked**, restated: `prospecting-panel.tsx`
had zero optimism at all on `ContactTrackingControl`
(`markProspectContacted`/`markProspectReplied`) and `PipelineStageControl`
(`markProspectQualified`/`markProspectLost`) — button goes pending/disabled
only, no local state flip. Separately, `CampaignCard.toggleStatus`,
`ProjectCard.toggleDone`, `TaskRow.setTaskStatus`, and
`TaskRow.setTaskProject` already had *hand-rolled* optimism (a `useState`
flip + `startTransition` + silent revert on error) predating this item.
Ranked candidates to convert: **1. Prospect status actions** (this closure —
highest frequency, safest, zero prior optimism to migrate, build fresh with
the hook). **2. Task status toggle** (`TaskRow.setTaskStatus`,
`requests-panel.tsx`) — already hand-rolled correctly, so converting is
close to a mechanical proof of the pattern; not done in this pass. **3.
Campaign + project status toggles** (`CampaignCard.toggleStatus`,
`ProjectCard.toggleDone`) — bundled together, lower frequency; not done in
this pass. Flagged as **wrong candidates for optimism, do not build**:
`convertProspectToClient` (irreversible, server-dependent outcome),
`deleteProspect`/`deleteCampaign`/`deleteClientData` (irreversible deletes —
wait for confirmation), and any AI-generation action (no plausible "guess"
to render optimistically).

**Candidate 1 shipped**: `ContactTrackingControl` and `PipelineStageControl`
(`src/components/platform/prospecting-panel.tsx`) rebuilt with real
`useOptimistic` — an immediate visible status flip (contacted/replied,
qualified/lost) before the Server Action round trip resolves, reverting
automatically on `{error}` (React's own `useOptimistic` unwind, not a
manual reset). Rollback UI matches the scoping note's exact spec: an inline
`text-destructive` line under the row ("Failed to update — try again." as
the fallback copy) plus a transient `bg-destructive/10` highlight on the
row, cleared after 1.5s via `setTimeout` — the same transient-boolean-plus-
timeout mechanism `CopyButton`/`EmbedChatbotControl` already use for their
own "copied" state. One real design correction made mid-implementation:
`PipelineStageControl`'s "hide once terminal" guard now checks the *real*
`prospect` prop, not the optimistic local guess — checking the optimistic
value would hide the whole row (rollback message included) the instant
"mark as lost" was clicked, before the server ever confirmed it, defeating
the rollback UI's own purpose.

Also fixed while in this file, per the scoping note's own flag:
`DealValueControl` (`updateProspectDealValue`) previously discarded its
Server Action's result entirely and unconditionally closed the editor,
silently reverting to the stale value on failure. Now checks the result,
keeps the editor open, and shows the same inline error on failure. Not
converted to `useOptimistic` itself — the scoping note explicitly flagged
it as safe but too low-frequency (set once per prospect, rarely revised)
to be worth bespoke optimistic-UI engineering.

New test coverage (`prospecting-panel.test.tsx`, 8 tests): both the
optimistic-success path (visible flip before the mocked action resolves,
using a manually-controlled deferred promise) and the rollback-on-error
path (reverts, inline error text, fallback copy) for both controls,
including the qualified→lost and contacted→replied sequences.

**Not done, real follow-up**: candidates 2 (`TaskRow.setTaskStatus`,
`requests-panel.tsx`) and 3 (`CampaignCard.toggleStatus` +
`ProjectCard.toggleDone`) from the scoping note above — same rollback-UI
treatment needed, since today they revert completely silently on error
(the exact anti-pattern this backlog item's objective warns about, already
shipped). Left as a follow-up, not claimed done here.

**Separate, already-fixed adjacent bugs** (not `useOptimistic`, flagged by
the same scoping note as a quick fix while in the area):
`AssignedProspectRow.remove`/`AddProspectControl.add`
(`campaigns-panel.tsx`, both call `assignProspectToCampaign`) and
`RequestCard.markResponded` (`requests-panel.tsx` → `markRequestResponded`)
never checked their Server Action's result, silently re-enabling the button
on failure with no message. All three now show the same inline
`text-destructive` error convention on failure.

`npx tsc --noEmit`, `npx eslint` (touched files), and the full `vitest`
suite all green for every file this closure touched. One unrelated failure
was observed in the full suite (`top-opportunity-kit-action.test.tsx`) —
confirmed via `git status` to be another agent's own untracked,
concurrently-in-progress work on a different backlog item ("Wire a
one-click action to Command Centre's AI recommendations"), not caused by
or related to this change; not touched here.

### Define the activation funnel over existing events now that PostHog is live

Closed 2026-08-31 — `NEXT_PUBLIC_POSTHOG_KEY` confirmed live in production
(real events captured: 2 active users, 2 sessions, 3 pageviews). Growth &
Analytics verified the authoritative event list directly (`grep -n
"trackServerEvent(" -r src`, not recalled from memory) — all 5 events this
item originally named are real: `org_signed_up`
(`platform-onboarding.ts`), `discovery_run`/`on_demand_search_run`/
`prospect_converted` (`prospects/actions.ts`), `invoice_created`
(`clients/actions.ts`), `platform_subscription_started` (the Stripe
webhook route) — plus 3 more real events not originally named:
`platform_subscription_cancelled` and `prospect_credit_pack_purchased`
(same webhook), and `on_demand_search_run` (the manual "search now"
counterpart to the cron-driven `discovery_run`).

**A single sequential 5-step funnel would have actively misreported real
paying customers as drop-offs** — checked against the real signup/billing
code, not assumed. `platform_subscription_started` is NOT downstream of
`invoice_created`: `submitOnboarding`'s `startMode: "pay-now"` branch
(`platform/onboarding/actions.ts`) sends a brand-new org straight to
Stripe Checkout before it ever reaches `/studio`, and every org's
`subscription_status`/`trial_ends_at` are DB column defaults
(`schema-platform-billing.sql`) set at row-creation, not app logic — so a
real subscriber can hit `platform_subscription_started` within seconds of
`org_signed_up`, with zero prospecting/client/invoice activity ever
happening.

**Shipped as two separate funnels instead**:
- **Funnel A — Activation** (`org_signed_up` → Action `prospecting_run`
  [combines `discovery_run` OR `on_demand_search_run` via a new PostHog
  Action, so the manual search path isn't undercounted] → `prospect_converted`
  → `invoice_created`), sequential order, 30-day conversion window (matches
  `usage-limits.ts`'s calendar-month reset cycle), broken down by
  `agency_type` (already a real property on every `org_signed_up` event,
  bounded set from `AGENCY_TYPES`).
- **Funnel B — Monetization** (`org_signed_up` → `platform_subscription_started`),
  sequential, 30-day window, deliberately separate since its timing is
  decoupled from the activation chain.

Exact click-by-click PostHog UI steps for both (create the `prospecting_run`
Action first, then two Funnels insights) were handed to Hamish to configure
directly — no agent has PostHog dashboard access. `platform_subscription_cancelled`/
`prospect_credit_pack_purchased` are better tracked as simple Trends than
funnel steps (churn/expansion signals, not funnel stages) — noted, not built.

**Honest limitation flagged**: `agency_type` breakdown won't show anything
meaningful until there's real volume across different agency types (2
users today); signup source/channel (referrer, UTM) is NOT capturable —
`analytics-provider.tsx`'s `person_profiles: "identified_only"` means
anonymous pre-signup pageviews never build a PostHog person profile for
`identify-org.tsx`'s later merge to attach UTM data to. A real
instrumentation gap, not a config option that was missed. Also: current
PostHog volume (2/2/3) blends anonymous marketing-site browsing with any
real org signups — it is not itself evidence that 2 organisations have
signed up, and any funnel numbers today are near-meaningless by volume
alone; the value shipped here is the funnel being correctly *defined and
ready*, not a conclusion drawn today. `trackServerEvent`'s fail-open
behavior on a PostHog API error (silently swallowed, per `analytics.ts`'s
own comment) hasn't been spot-checked for real dropped events — worth
revisiting once real volume exists.

### PostHog production key not set — real event taxonomy shipped but very likely capturing nothing live

Closed 2026-08-28 — Hamish set `NEXT_PUBLIC_POSTHOG_KEY` in Vercel
production. First attempt swapped the Name/Value fields in Vercel's UI
(the env var was named after the key's own value, so `process.env.
NEXT_PUBLIC_POSTHOG_KEY` resolved to nothing) — caught by pulling the
actual shipped JS bundle and confirming `posthog.init()` never received a
real key, not by trusting the dashboard's own truncated display. Corrected
and confirmed live via PostHog's own Activity view showing real captured
events (2 active users, 2 sessions, 3 pageviews).

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
