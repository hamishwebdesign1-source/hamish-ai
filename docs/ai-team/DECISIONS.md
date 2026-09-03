# HamishAI — decisions log

One entry per real product/technical decision worth a future reader knowing
the reasoning behind, not just the outcome. Newest first. Every specialist
agent should add an entry here when they make a call that isn't obvious from
the code alone — the same instinct as this codebase's own inline comments,
just at product-decision scope instead of line scope.

---

## 2026-09-03 — Prospects mockup → Website Builder prefill built, per the Product/UX-approved spec, no deviations

**Decision**: Built exactly what the two 2026-09-03 entries above and
`BACKLOG.md`'s own field-by-field mapping specified, with no schema
migration and no deviation from the agreed mechanism (`client`/`prefill=1`
search params on the existing `/studio/website-builder/new` route,
scoped-lookup-from-`source_lead_id` security requirement, hard/soft/blank
field-provenance tiering).

**Implementation**:
- `buildWizardPrefill()` + `prospectHasPrefillSource()`
  (`src/lib/website-brief.ts`) — pure functions; the former maps a
  prospect row to a `WizardPrefill` (six real fields only: `businessName`,
  `industry`, `location`, `existingWebsiteUrl` all hard-tier direct
  columns; `servicesProducts` hard-tier, preferring `research.services`
  over `website_mockup.services` names, falling back to the mockup only
  when `research` is entirely absent, not merely empty; `usps` soft-tier
  from `research.strengths` only, no mockup fallback). 13 new unit tests
  in `website-brief.test.ts` cover the full-data case, the mockup-only
  fallback, the "research present but empty" non-fallback case, the
  no-source-at-all case, null-column absence (not empty string), and that
  none of the honestly-blank fields ever appear.
- `src/app/studio/(authed)/website-builder/new/page.tsx` — accepts
  `client`/`prefill` search params; `prefill=1` triggers a scoped
  `clients` lookup (by id + `org_id`) to get `source_lead_id`, then a
  scoped `prospects` lookup (by id + `org_id`) for the six source
  columns — never trusts a client-supplied prospect id, matches the
  decision's own stated security requirement.
- `src/components/platform/website-project-wizard.tsx` — `initialClientId`/
  `prefill` props seed local state once via `useState(() => ...)`, never a
  server default; per-field `PrefillTag` badges next to six `<Label>`s
  (secondary+`Link2`+"Prefilled" for hard, `ai`+"Needs review" for soft,
  matching `DESIGN-SYSTEM.md`'s "Field-provenance tags on a prefilled
  form" entry exactly); one-time `border-accent/30 bg-accent/5` banner
  when `prefill` is present.
- `src/app/studio/(authed)/clients/page.tsx` — added `source_lead_id` to
  the existing `clients` select; one additional scoped `prospects` query
  (`id`/`website_mockup`/`research`, `.eq("org_id", ...)`, `.in("id", ...)`
  over each client's own `source_lead_id`) computes `prefillEligibleByClient`
  — passed to `ClientsPanel`, never the actual mockup/research content
  itself (that's only ever fetched again, freshly, by `/new/page.tsx` at
  the moment prefill is actually requested).
- `src/components/platform/clients-panel.tsx` — `source_lead_id` added to
  the `Client` type; new `StartWebsiteBuildFromProspectControl` (a plain
  `Link`-rendered `Button` to `/studio/website-builder/new?client=…&prefill=1`)
  placed right after `GenerateReportControl` inside the expanded
  `ClientCard`; a collapsed-row `ai`-variant "Mockup ready" `Badge` (Sparkles
  icon) in the same slot the existing "AI chatbot" badge uses, both gated
  on the new `prefillEligible` prop.
- `src/components/platform/prospecting/convert-to-client-control.tsx` —
  optional secondary pointer built: the post-conversion "Client" badge
  state now also shows a `text-accent underline` "Start website build in
  Clients" line (linking to `/studio/clients`, not a deep link — this
  component doesn't know the resulting `client_id`) when
  `prospectHasPrefillSource(prospect)` is true, same "no toast, inline
  text" convention used everywhere else.

**Verification**: `npx tsc --noEmit -p .` clean; `npx eslint` clean on
every touched file; `npx vitest run` 424/424 green (the previously-known
flaky `command-centre-section-cards.test.tsx` test passed on this run,
not re-run separately since it passed the first time); `npm run build`
succeeded (only pre-existing, unrelated warning: a font-override warning
for "Big Shoulders"). Not verified in an authenticated live browser
session — no test Studio credentials were available in this session,
same caveat the "Website mockup preview visual upgrade" decision entry
above already flagged; worth a real click-through (convert a prospect
with a mockup, confirm the badge/control appear, confirm the wizard opens
prefilled and every field stays editable) before/shortly after this
reaches production.

**No deviations from the approved spec** — flagging this explicitly per
this mission's own instruction to note any deviation: none were needed.
The one open judgement call (the `convert-to-client-control.tsx` pointer
linking to `/studio/clients` generically rather than a specific client)
was already anticipated as "optional... do it if cheap" scope, not a
deviation from a firm requirement.

---

## 2026-09-03 — "Projects Kanban Command Centre" mission: phased 27-point spec into A/B/C, corrected two of the brief's own seed assumptions

**Decision**: Split Hamish's 27-point Projects Kanban spec into three real
tiers rather than scoping (or recommending) a single all-at-once build —
Phase A (Kanban board + drag-and-drop stage persistence + a real per-project
detail workspace + Task/Request/Client linking, `BACKLOG.md`, Ready) is
build-worthy now on entities that already exist; Phase B (files-on-a-project,
invoice linkage, the `projects`↔`website_projects` cross-link decision,
Researching) is real but deliberately sequenced after Phase A ships and is
used; Phase C (meetings/formal deliverables-with-approval/an AI project
assistant/client-portal visibility splitting, Not started) requires net-new
entities or subsystems and, for two items, crosses this team's own
documented approval boundaries. Full detail in `BACKLOG.md`'s three matching
entries.

**Why phase rather than build all 27 points**: `PRODUCT.md`'s own
"genuinely early-stage... build the next layer only once real data
justifies it" plus Hamish's own point 26 ("if something already works,
improve it rather than rebuilding it unnecessarily") — most of the spec's
later items (an AI project assistant, a formal deliverable-approval
workflow, portal-visibility splitting) describe genuinely new subsystems
this product has no evidence yet of needing at its current real usage
volume, the same reasoning that already deferred adjacent AI-agentic ideas
in the 2026-08-27 "best in market" mission.

**Two of the mission brief's own seed assumptions were wrong, verified not
repeated**: the dispatch guessed Meetings, Deliverables-as-their-own-entity,
and Proposals-as-a-distinct-workflow "may not exist" and asked me to verify
rather than assume. Deliverables genuinely doesn't exist (confirmed via a
full schema grep — no table, no approval flag anywhere). But **Meetings
does exist** (`lead_meetings`, `schema-lead-meetings.sql` — Phase 1 of a
documented Teams-meeting-intelligence plan, scheduling only) and
**Proposals does exist** (`proposal_tokens` + `sendProposal()` + a public
`/proposal/[token]` view/accept flow, `schema-proposal-tokens.sql`) — both
real, working features, just narrowly scoped to `prospect_id`
(pre-conversion), not to a converted client or a delivery project. This
matters for Phase C: the honest gap isn't "meetings/proposals don't
exist," it's "they exist but stop at the sale" — a materially different,
smaller-sounding gap than the brief's own seed guess implied, and the
`proposal_tokens` pattern is real, adaptable precedent for a future
deliverable-approval workflow rather than something to build from scratch.

**The single most important architecture finding**: there are already two
unrelated "Project" concepts in this codebase — `projects` (the thin
table this mission is about: `name`/`target_date`/`status`/`assigned_to`,
one row per client-scoped deliverable) and `website_projects` (a much
richer, separately-built tracker with its own discovery→brief→tool→build→
qa→launched stage machine, its own files table, its own troubleshooting
log). Hamish's own description of what a Project should represent — "what
are we delivering, what's blocked, what files are relevant" — describes
`website_projects`' existing shape far more than `projects`' current one,
but the two tables have zero relationship today: a website build and a
generic delivery project for the same client are unconnected rows unless a
human manually keeps them in sync. Deliberately did not resolve this
unilaterally (merge vs. cross-link vs. leave separate) — flagged as a real
Phase B decision, not assumed, since committing to a shape before Phase A's
real detail-workspace layout exists risks building against a UI that
doesn't exist yet.

**A real, non-obvious migration constraint found and built into Phase A's
acceptance criteria rather than left for Lead Engineer to discover
mid-build**: `projects.status` (currently only `active`/`done`) is read as
a two-value enum by at least 7 real call sites beyond the Projects page
itself — `owner-digest.ts`'s overdue-project detection, `digest-action-
tokens.ts`'s one-click "mark project done" email action, command palette
search, the AI assistant's client summary, the task-assignment dropdown on
Requests, the client cascade-delete, and the raw data export route. Phase
A's `stage` column must be additive with `status` derived/kept in sync for
all seven, not a replacement — written directly into the backlog entry's
acceptance criteria so this doesn't get missed or rediscovered as a
regression during Phase 4/6.

**Not resolved here, explicitly handed to UX/UI Director next**: exact
stage labels/count (Hamish's own brief already says don't blindly copy his
suggested 7 stages if the architecture suggests otherwise — a real design
call, not a technical one), the Kanban card's exact visual design, the
detail workspace's layout, and responsive/mobile behaviour. This dispatch
covered Phase 1 (Audit) and Phase 2 (Architecture) only, per its own scope
— Phase 3 (Design) is the next dispatch.

---

## 2026-09-03 — Prospects mockup → Website Builder prefill: no migration needed, opt-in not silent, one brief assumption corrected

**Decision**: scoped as a read-only, additive prefill of the Website
Builder discovery form from a converted prospect's existing
`website_mockup`/`research`, gated behind an explicit new entry point
(a "start build from this prospect" action), not a silent autofill that
fires whenever the wizard happens to be able to trace a `source_lead_id`.
Full scope in `BACKLOG.md` under "Prefill the Website Builder discovery
form from a converted prospect's mockup/research."

**Why explicit opt-in, not silent**: `PRODUCT.md`'s "thin and honest over
impressive and fake" principle plus a concrete failure mode — a user
opening the generic wizard for a manually-added client (no prospect at
all) would have no reliable way to distinguish "this form is blank
because nothing exists" from "this form is blank because prefill quietly
failed," and stale mockup/research data (possibly generated weeks before
conversion) appearing with no user action attached reads as the tool
guessing on the user's behalf, not assisting them.

**Two things verified, not assumed, that change the shape of this task**:
1. **No migration required at all.** The mission brief asked me to
   determine whether `clients`/`website_projects` can already trace back
   to the originating prospect. It can — `clients.source_lead_id`
   (`schema-client-source-lead.sql`) already exists and is already set on
   every conversion by `convertProspectToClient`. This isn't a "safe,
   additive migration to approve," it's zero migration, so nothing in
   this scope touches the destructive-migration approval boundary at all.
2. **The mission brief's own assumption about `existingWebsiteUrl` having
   "likely nothing real to prefill from" was wrong, and I corrected it
   rather than repeating it.** `prospects.website` exists and is already
   carried forward verbatim to `clients.website_url` at conversion time
   (confirmed by reading `convertProspectToClient`'s own insert). It's
   actually one of the more reliable prefills available, sourced from the
   `clients` row itself. The three genuinely design-blind fields
   (`designStyle`, `designColours`, `designFonts`) plus `designExamples`
   stay correctly unprefillable — nothing in the mockup/research pipeline
   ever discusses visual design.

**Not built yet** — this is a backlog scope, status "Ready," handed to
UX/UI Director (entry-point placement, prefilled-field visual treatment)
then Lead Engineer.

---

## 2026-09-03 — Website mockup preview visual upgrade shipped; Website Builder prefill entry point designed, not built

**Decision (Task 1, shipped)**: `WebsiteMockupPreview`
(`website-mockup-section.tsx`) now renders inside a browser-chrome frame
(three dots + a centred pill reading "Homepage preview," never a
fabricated domain) with three visually distinct bands (hero / body /
closing CTA) instead of one flat stack. An `ai`-variant Badge
("AI-drafted") sits in the chrome bar; the file's existing honesty
caption stays, now permanently visible under the frame rather than only
in the empty state. No content changed, no new AI call, no schema touch
— purely presentational. `npx tsc --noEmit` and `npx eslint` both clean.
Not verified in an authenticated live browser session — no test Studio
credentials were available in this session; recommend a real visual check
before/shortly after this reaches production, same as the "Toned Ink"
background entry above.

**Decision (Task 2, designed only — handed to Lead Engineer)**: the
primary entry point for "start a Website Builder project pre-filled from
a converted prospect" is the expanded `ClientCard`
(`clients-panel.tsx`), not the prospect's own post-conversion moment.
**No `/studio/clients/[id]` route exists** — checked, not assumed; the
"client detail page" `BACKLOG.md`/the brief pointed at is this
expand-in-place card, the actual client-detail surface in this codebase
today. Chose it over the prospect-side moment because it's persistent
(discoverable any time the owner comes back to Clients, not just in the
few seconds after clicking "Confirm" on conversion, after which
`ConvertToClientControl` collapses to a static "Client" badge with no
room left to act) and it sits naturally alongside this client's other
real actions (`GenerateReportControl`, invoicing, portal access).
Recommended (not required) a small secondary pointer on the prospect side
too: `ConvertToClientControl`'s post-conversion "Client" badge state gets
one line of `text-accent underline` text ("Start website build in
Clients") when the source prospect has a mockup/research, using the same
"no toast, inline text" convention as everywhere else — reinforces
discoverability from the other direction without adding a second
competing entry point.

**Mechanism**: reuses the existing `/studio/website-builder/new` route
rather than a new page — adds two optional search params, `client` (just
preselects the client dropdown, always safe) and `prefill=1` (the actual
explicit-opt-in signal; only present because the user clicked "Start
website build from this prospect," never implied by `client` alone). The
server component re-derives the source prospect from the given
`clientId`'s own `source_lead_id`, scoped to the caller's `org_id` both
times (client lookup and prospect lookup) — never trusts a raw prospect
id from the URL, so a tampered `prefill=1` on someone else's client can't
leak cross-tenant data.

**Field-tag tiering**: per `BACKLOG.md`'s own three-tier breakdown (hard
1:1 / soft-approximate / honestly blank), used two visually distinct
Badge treatments, not one blanket "prefilled" style — see
`DESIGN-SYSTEM.md`'s new "Field-provenance tags on a prefilled form"
entry for the exact classes. Grouped `servicesProducts` (technically
AI-observed, from `research.services`) with the hard/neutral tier rather
than the soft/`ai`-styled one, matching `BACKLOG.md`'s own classification
of it as "real, direct" rather than approximate — flagged here in case a
future reviewer wants a finer split, not treated as settled beyond what
the backlog entry already decided.

Full field-by-field mapping, `WizardPrefill` shape, exact query changes
to `clients/page.tsx` and the new `/new/page.tsx` search-param handling,
and the `buildWizardPrefill()` pure-function spec (for
`src/lib/website-brief.ts`, unit-testable per the backlog's acceptance
criteria) are in the UX/UI Director's handoff to Lead Engineer — nothing
in this task was implemented yet, by design, given the cross-file data
plumbing and required test coverage make it a build task, not a design
one.

---

## 2026-09-03 — Studio Design Audit's 20 commits reached production before review; Hamish confirmed leaving them live

**What happened**: `PRODUCT-ROADMAP.md` recorded the Studio Design Audit
mission as "not yet pushed to production — pending Hamish's review," 20
commits sitting local-only on `main`. A later, unrelated session (this
one) ran a standing SEO/metadata-audit loop that routinely committed and
pushed its own real, verified fixes throughout. Since `git push` fast-
forwards whatever is already on local `main`, each of those routine pushes
carried the Design Audit's 20 unpushed commits to `origin/main` along with
it — nobody force-pushed or deliberately shipped them, but the review gate
the roadmap note described was bypassed as a side effect.

**Why this is logged, not just silently fixed**: per `docs/ai-team/
README.md`'s own approval boundaries, pushing to production is one of the
actions meant to get Hamish's sign-off first. Finding a real gap between
what the docs described ("pending review") and what was actually true
(already live) is exactly the kind of thing worth surfacing plainly rather
than assuming and moving on — see the global safety framework's own
instruction on this.

**Decision**: Flagged directly to Hamish via `AskUserQuestion` before doing
anything else (not before continuing other, unrelated pushes — those had
already happened by the time this was noticed). He reviewed the options
(leave it live / show him the diff first / roll it back) and chose to
leave it live — the fixes were individually reasonable and tests were
green (415/415) throughout. `PRODUCT-ROADMAP.md`'s entry updated from
"not yet pushed... pending review" to "live in production... flagged
directly, confirmed fine" rather than silently marked shipped with no
trace of the gap.

**Process note for future missions**: a mission that intentionally holds
its own commits unpushed pending review is fragile against *any* other
session's routine `git push` on the same branch — there's no technical
gate stopping it, only the roadmap note itself. If a future mission
genuinely needs to hold work for review, consider a separate branch
rather than relying on "committed locally, not yet pushed" as the actual
control.

---

## 2026-09-03 — Consolidated the three "ask about your business" AI surfaces onto one engine and one usage meter (Studio Design Audit, Tier 2 item #5)

**Decision**: Retired the Clients-page embedded `ClientsCopilot` (and the
`askClientsCopilot()` Server Action / `answerClientsQuestion()` wrapper it
called) entirely, and repointed the two remaining call sites — the command
palette's Ask flow (`studio-command-palette.tsx`) and the Clients page
itself — onto the global `StudioAssistantWidget`'s `askStudioAssistant()` /
`answerStudioQuestion()`. Before this, three surfaces that looked like one
feature (global widget, embedded Clients copilot, command palette) ran two
separate engines and two separate 10/month usage caps
(`studio_assistant_question`, `clients_copilot_question`) for the same
underlying capability — confirmed redundant by `answer-studio-question.ts`'s
own pre-existing code comment, not a new finding: `answerStudioQuestion()`
already reused `answer-clients-question.ts`'s own `buildClientsSummary()`/
`buildAnalyticsSummary()` and was a strict superset (it also answers
"how do I…" product questions from the Help FAQs) of what
`answerClientsQuestion()` could do.

**What was removed**: `src/components/platform/clients-copilot.tsx` (the
component, deleted outright — not mounted anywhere else after its removal
from `clients-panel.tsx`); `askClientsCopilot()`
(`src/app/studio/(authed)/clients/actions.ts`); `answerClientsQuestion()`
and its `buildSystemPrompt()` helper (`src/lib/answer-clients-question.ts`);
`clients_copilot_question` as a `UsageEventType`
(`src/lib/usage-limits.ts`) — `ALL_USAGE_EVENT_TYPES` drops from 13 to 12
entries, `USAGE_LABELS` loses its entry, `usage-limits.test.ts` updated to
match (also removed the now-nonexistent event type from its multiplier
`it.each` table).

**What was kept, deliberately**: `buildClientsSummary()`,
`buildAnalyticsSummary()`, and the exported `ClientSummary` type in
`answer-clients-question.ts` — confirmed via grep these are still
genuinely imported and used by `answer-studio-question.ts`, not dead code
riding along with the deletion.

**Historical `usage_events` rows**: rows already recorded with
`event_type = 'clients_copilot_question'` are left exactly as they are —
no migration, no backfill, no deletion (none of which are safely doable
from this environment against production data regardless). Confirmed
directly against `getUsageStatus()`'s own implementation
(`src/lib/usage-limits.ts`) that this is inert, not a lurking bug: it
computes usage with `.eq("event_type", eventType).gte("created_at",
startOfMonth())` — a fixed `eventType` string match, scoped to the current
calendar month only, never a UNION or fallback across event types. Since
nothing calls `getUsageStatus()` (or `recordUsageEvent()`) with
`"clients_copilot_question"` anymore after this change, those historical
rows simply stop being queried by anything going forward. They remain in
the table as an accurate historical record of real past usage, just under
a retired label — the same "sever the link, don't touch historical data"
instinct `docs/ARCHITECTURE.md` documents elsewhere for nullable-FK
deletes, applied here to a retired enum value instead of a deleted row.

**Not touched, out of scope**: `ai_call_log`'s own `"business_analyst"`
feature type (`src/lib/ai-call-log.ts`, `src/lib/studio-model-performance.ts`)
is a separate, older log of AI *cost/latency* (not usage-cap) data that
`answerClientsQuestion()` used to write to. It's left as-is — a future
`ai_call_log` row will simply never be logged under `"business_analyst"`
again, the same "retired label, real history preserved" shape as the
usage-events decision above, but that enum wasn't in this task's scope and
touching it wasn't necessary to close the AI-surface consolidation.

---

## 2026-08-31 — Scoping "AI ROI" as an attribution rule over existing prospect timestamps, not a new metering/analytics system

**Decision**: Scoped the mission's "AI ROI" goal into one buildable
`BACKLOG.md` item (`AI-assisted signed value`) rather than a bigger
analytics build, after confirming three things directly against the
schema/code: (1) `usage_events` has no entity reference at all (`org_id`,
`event_type`, `created_at` only) — it cannot attribute an AI action to a
specific prospect, so attribution has to come from timestamp columns
already living on the `prospects` row itself
(`sales_kit_generated_at`/`website_mockup_generated_at`); (2) `prospects`
has no `converted_at` column — `clients.created_at`
(inserted atomically inside `convertProspectToClient`, with
`source_lead_id` pointing back) is the real, reliable proxy for "when this
deal closed," not any prospect-side field; (3) `deal_value_pence` (a
tenant's own optional, manual estimate, already trusted for Command
Centre's "Pipeline value" card) is the only real monetary figure available
at conversion time — `invoices.amount_pence` is real billed money but
requires a separate invoicing step this platform doesn't force, and would
make the feature return near-nothing at current real volume (2 signed-up
orgs).

**Attribution rule chosen**: a client counts as AI-assisted for a month if
it was created that month, has a `source_lead_id`, and that prospect's
`sales_kit_generated_at` or `website_mockup_generated_at` is not null and
predates the client's `created_at`. `research_generated_at` was
deliberately excluded — `discover-leads.ts` now researches every prospect
found through normal discovery automatically, so that timestamp no longer
distinguishes "AI did something for this deal" from "this prospect exists
at all"; including it would make the metric fire on nearly every
conversion regardless of real AI-driven outreach effort, which is a
correctness bug dressed as a feature, not a stricter rule.

**Home chosen**: Billing, not Command Centre, for v1 — the mission's own
framing ("instead of usage metering that tracks activity but never ties it
to outcome") names Billing's existing "Usage this month" card as the exact
surface being complained about, so pairing an outcome figure there directly
answers the stated problem rather than starting a new dashboard concept.
Command Centre gets a scaled-down fast-follow later, not v1 — kept thin
per `PRODUCT.md`'s own Campaigns precedent.

**Explicitly not resolved unilaterally, correctly deferred to build time**:
exact card copy/placement (flagged for UX/UI Director), and whether the
count-only vs count+£ split reads well live — flagged in the backlog item
itself, not decided here.

**Ruled out**: using `invoices.amount_pence` as the money source (too
sparse/laggy at real current volume, and conflates "AI helped win this"
with "this org also chose to invoice through the platform," a separate
adoption question); including `research_generated_at` in the attribution
set (see above — no longer a meaningful signal); treating a `null`
recorded deal value as `£0` in the sum (would silently understate/misrepres-
ent "no data" as "we checked and it's worthless").

---

## 2026-08-31 — Scoping "clear Command Centre like an inbox": two real candidates backlogged, several ruled out, "queue" framing flagged as needing a caveat

**Decision**: Scoped Hamish's brainstorm idea ("extend recommend→act to
every signal Command Centre computes") by testing every one of the 9
section-card signal types (`command-centre-section-cards.tsx`) against the
same bar the shipped `topOpportunity` action was held to: does this signal
carry a real, specific, addressable entity id, and does a real existing
pipeline already exist to act on it. Two candidates passed and were written
into `BACKLOG.md`: (1) extending the already-shipped `TopOpportunityKitAction`
to all 5 rows of the `top_prospects` list — literally the "identical
fast-follow" the shipped entry's own note already named, zero new plumbing;
(2) a one-click "Send payment reminder" on `engagement_risk` rows with a
real overdue invoice, wiring the already-existing, already-in-production
(`/admin`-only) `sendInvoiceReminder()` pipeline into `/studio` for the
first time — real id (`invoices.id`, already fetched, zero new query), real
pipeline, no new AI, no new usage-metered action type.

**Ruled out, not backlogged**: `studio-insights.ts`'s entire `Insight[]`
feed (KPI deltas, health-component warnings, overdue-project *count*,
`no-conversions`) is aggregate-only end to end — the same test that
excluded `no-conversions` from v1 applies to every insight this file
generates, not just that one; none carry a single addressable id. The
`actions_required` card is likewise aggregate-only *as currently rendered*
(3 rolled-up counts with a filtered-list `href` each) even though the
underlying rows (which specific request, which specific overdue project)
do technically exist elsewhere on the same page load — turning that into
a real per-item queue would mean redesigning the card to expose individual
rows, a materially bigger scope change than "add a button to an existing
signal," and wasn't asked for here. `model_performance`, `client_ai_adoption`,
`recent_activity`, and `health_breakdown` are genuinely informational
aggregates with no plausible one-click action to attach. Engagement risk's
*quiet-client* half (as opposed to its overdue-invoice half) — a one-click
AI-drafted check-in message — was **not** backlogged: this is AI/Agent
Architect's opportunity #2 from the 2026-08-31 mission, already deliberately
deferred pending real usage evidence that the shipped recommend→act pattern
actually gets used, which doesn't exist yet (the pattern shipped the same
day this scoping happened). It would also need a genuinely new AI pipeline
and a new metered usage-event type — a bigger call than either backlogged
candidate, correctly left for its own future sign-off once there's real
usage data to justify it, not decided here.

**Verdict on the "clear it like an inbox" framing itself**: right for the
two candidates backlogged, but the framing needs an explicit caveat, not
blanket adoption. Both backlogged actions preserve this product's
documented "propose then human applies" strength in different ways: the
outreach-kit action generates *content for the owner to review* and send
themselves; nothing goes to a real prospect without a human copying it out.
The payment-reminder action does not have that buffer — it fires a real
email to a real client on one click, with no draft/review step, the first
Command Centre control that would do that. It's lower-risk than it might
sound (deterministic template, not AI-generated; already ships bare, with
no confirmation step, via `/admin` for Hamish's own real invoices today),
but it's a materially different action shape than the shipped precedent,
flagged for Hamish's explicit sign-off in the backlog entry itself rather
than folded into "same as before." The honest read: "queue-clearing" is a
good frame for *reviewable* AI outputs (kits, and — if ever built — drafted
check-in messages), but a worse frame for *send* actions, where "clearing
the queue fast" and "sent something to a real client you didn't mean to
send yet" are in real tension. Any future candidate that skips the
review-then-apply step should get the same explicit sign-off flag this one
did, not be waved through because the UI pattern already exists.

---

## 2026-08-31 — Process fix: commit shared docs between parallel agent dispatches, don't rely on recovery

**Decision**: When running multiple specialist agents in parallel who each
update `BACKLOG.md`/`DESIGN-SYSTEM.md` as part of their own task, the
orchestrator should commit those docs to git between dispatch rounds
whenever practical, rather than letting several agents' uncommitted edits
sit in the working tree simultaneously.

**Why**: Hit this twice in the same mission (2026-08-31). Two different
Lead Engineer agents, each following the repo's own "don't blanket-`git
add`" discipline, each independently did a `git reset` on `BACKLOG.md` to
avoid bundling unrelated concurrent uncommitted work into their own commit
— but each reset target predated other agents' genuinely-finished
uncommitted edits (the orchestrator's own stale-entry cleanup, Growth &
Analytics' full PostHog funnel spec, UX/UI Director's `useOptimistic`
scoping note). Both times the lost content was recoverable because the
authoring agent's own handoff report (still in the orchestrator's context)
contained the full text — but that's luck, not a real safety net; a longer
mission or a summarized context could have lost it for good.

**Not done**: didn't add file-locking or a stricter multi-agent-docs
protocol — that's more process than this team's actual collision rate
justifies. The fix is simpler: commit `docs/ai-team/*.md` right after each
agent that touches them reports back, before dispatching the next round,
so a `git reset` anywhere only ever loses uncommitted seconds of work, not
whole scoping notes.

## 2026-08-27 — Added an SPF+DKIM authenticity check to `email-inbox.ts`'s inbound triage (Hamish sign-off)

**Decision**: Implemented the P1 `BACKLOG.md` item once Hamish explicitly
lifted the sign-off block. `checkEmailInbox()`'s Gmail search (`from:
${client.email} in:inbox`) matched purely on the message's From header, with
no independent check that the message genuinely came from that address — a
convincingly spoofed email carrying a real client's address could reach
`triageRequest()` and, if it cleared the AI's own complexity/maintenance/
priority gates, the unsupervised auto-send path.

Confirmed what's actually available before designing the fix, per the
backlog item's own explicit dependency: `gmail.users.messages.get(...,
{ format: "full" })` — already called for every message fetched, no
additional API request needed — returns every header on the message,
including `Authentication-Results`, the header Gmail's own receiving mail
server appends recording its SPF/DKIM/DMARC verdicts for that specific
message. No new Gmail scope or API call was needed.

`isAuthenticatedSender()` requires an explicit `dkim=pass` *and* `spf=pass`
(the backlog item's own framing — "checking Authentication-Results for an
SPF+DKIM pass") across any Authentication-Results header present, and fails
closed on everything short of that: header absent, single-pass-only,
`neutral`/`none` verdicts, or malformed values all resolve to "unverified" —
this repo's standing instinct (`PRODUCT.md`'s fail-closed-on-trust-sensitive-
paths rule, the same one the P0 fix above cites) applied to an ambiguous
verdict rather than a hard failure.

Decided *what happens* when a message is unverified, since the backlog item
explicitly left this open: rather than dropping the message or refusing to
triage it, `triageRequest()` gained a `forceHumanReview` option that
suppresses every unsupervised email it would otherwise send under Hamish's
own identity, while still triaging and saving the request for a human to
review in Studio. Extended this beyond exactly what the backlog literally
named (the auto-send reply) to also cover the "we need more info" email —
both are unsupervised sends from Hamish's identity built on unverified
inbound content, the same category of risk, even though only one of them
answers as if the work were already assessed and complete. This is the one
place this fix went beyond the letter of the backlog item; flagging it here
rather than letting it look like scope crept in unnoticed.

**Open tradeoff, not fully resolved — flagged rather than guessed past
silently**: `isAuthenticatedSender()` trusts any Authentication-Results
header present claiming a double pass, without verifying which mail server
appended it. The trustworthy one is the receiving server's own header
(identified by its authserv-id before the first `;` — consistently
`mx.google.com` for personal Gmail), but a message relayed through an
intermediate hop could in principle carry an earlier, forged
Authentication-Results header of its own from a less trustworthy mail
server. This wasn't verified against real production headers before
shipping — the backlog item's own stated open dependency ("Gmail messages
from real senders already carry Authentication-Results in practice — needs
confirming against real fetched headers, not assumed"). The core fail-closed
guarantee (anything short of an explicit double pass is unverified) holds
regardless of this open question; the tradeoff only narrows a false-positive
edge case (a genuine but multi-hop-relayed email being wrongly trusted), not
the false-negative direction that actually matters for the spoofing threat
this item exists to close. Flagged for Security Auditor re-verification
against real fetched headers rather than resolved by assumption.

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

---

## 2026-08-27 — Closed the `authserv-id` gap in `isAuthenticatedSender()` (Security Auditor)

**Decision**: The tradeoff Lead Engineer flagged when the SPF+DKIM check
shipped (commit `a92d344`) was real and exploitable, not a theoretical
nitpick — fixed directly rather than just reported, per this being a small,
scoped hardening of an already-approved control.

**Verification**: Fetched RFC 8601 directly (rfc-editor.org) and
cross-checked against independent documentation (smtpedia's
Authentication-Results reference). RFC 8601 §5 ("Removing Existing Header
Fields") only *requires* a receiving MTA to strip a pre-existing
Authentication-Results header that claims, via its `authserv-id`, to have
been added by that same MTA — i.e. Gmail is only obliged to strip a header
impersonating `mx.google.com`. Nothing requires stripping a header carrying
a *different*, attacker-chosen `authserv-id`. §7.1 ("Forged Header Fields")
names this exact attack and recommends trusting only an explicit allowlist
of known-good hostnames — never "any header claiming a pass."

**Concretely**: an attacker can append their own line to the raw message
they send, e.g. `Authentication-Results: attacker-host.example;
dkim=pass; spf=pass`, which Gmail has no obligation to remove (it isn't
impersonating Gmail's own identity), sitting alongside Gmail's own genuine,
failing verdict for the real spoofed message
(`mx.google.com; dkim=fail; spf=fail`). The shipped `.some()` check —
scanning every Authentication-Results header for a double pass regardless
of who wrote it — would find the attacker's fabricated line and wrongly
report the sender as verified, defeating the entire point of the control.

**Fix**: `isAuthenticatedSender()` (`src/lib/email-inbox.ts`) now extracts
each header's `authserv-id` (the token before the first `;`, per RFC 8601
§2.5) and only evaluates dkim/spf on a header whose `authserv-id` is in an
explicit allowlist (`TRUSTED_AUTHSERV_IDS`, currently just `mx.google.com`
— confirmed as Google's consistent identity for both personal Gmail and
Google Workspace mailboxes per its own documentation, though not yet
confirmed against a real header fetched from this specific mailbox in
production). Any header with a different or missing `authserv-id` is
ignored outright — reject, don't half-trust, this codebase's standing
pattern (`isSafeHref()`'s allowlist being the house standard cited in the
Security Auditor's own brief). Added `src/lib/email-inbox.test.ts` cases
covering the exact injection scenario (forged header + genuine failing
Gmail header together), a forged-header-only case, and confirming a
genuine `mx.google.com` pass still works alongside an unrelated forged
header. All 229 repo tests, lint, and `tsc --noEmit` pass.

**Open item, not fully closed**: `mx.google.com` as Gmail's authserv-id has
not been confirmed against a real, live-fetched header from the actual
mailbox this cron polls (per `.env.example`, described as a Google
Workspace integration). If a real production header ever shows a different
value, add it to `TRUSTED_AUTHSERV_IDS` rather than loosening the match to
a substring/prefix check. This is a stop-the-line-caliber control (it gates
unsupervised auto-send under Hamish's identity) — shipping this hardening
to production should still get Hamish's explicit confirmation per
`docs/ai-team/README.md`'s approval boundaries, even though the code change
itself was small enough to implement directly for review.
