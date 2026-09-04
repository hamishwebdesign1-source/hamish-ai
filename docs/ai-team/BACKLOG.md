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

### Projects Kanban Command Centre — Phase A: real Kanban board, drag-and-drop stage persistence, project detail workspace

This is the Phase 1 (Audit) + Phase 2 (Architecture) output for Hamish's
"transform Projects into a connected Kanban command centre" mission — see
`DECISIONS.md`'s matching 2026-09-03 entry for the full phasing reasoning.
**This entry covers only Phase A** (the build-worthy-now increment). Phases
B and C are recorded below it as separate, deliberately-not-yet-buildable
entries so they don't get silently folded into "the mission," per this
product's "build the next layer only once real data justifies it"
principle and Hamish's own point 26 ("if something already works, improve
it rather than rebuilding it unnecessarily").

**Note on scope input**: this dispatch's brief summarised Hamish's original
27-point spec (full card design, drag-and-drop, a deep detail workspace,
filtering/views, premium UX, responsive design) rather than quoting it in
full. Everything below is scoped against that summary plus the explicit
audit questions the brief asked me to answer directly. If the full 27-point
text turns out to materially differ from the summary in a way that changes
this phasing, reconcile before Phase 3 (Design) starts — flagged honestly
rather than assumed complete.

- **Problem**: `/studio/projects` (`src/components/platform/projects-panel.tsx`)
  is a flat per-client list of rows with a two-state status pill
  (Active/Done), "Mark done," and delete — not a place an agency owner can
  see what's actually happening across their delivery work. It has no
  stages beyond active/done, no per-project detail view (no `/studio/
  projects/[id]` route exists at all), and no way to see a project's own
  tasks/requests/files without leaving the page. This is real and
  confirmed by reading the component directly, not assumed from the
  screenshot alone.
- **Objective**: replace the flat list with a real Kanban board — multiple
  configurable stages, working drag-and-drop that persists to the database,
  and a genuine per-project detail view — built entirely on entities that
  already exist in production today (`projects`, `tasks`, `clients`,
  `memberships`/`assigned_to`, `audit_log`), reusing existing Server Action
  and RLS patterns rather than inventing new ones.
- **User**: an agency owner (or a team member with `memberships`) running
  more than a handful of concurrent client projects, who today has to
  mentally track "where is this at" with no structure beyond a due-date
  colour and a done/not-done pill.
- **Priority**: P1 — Hamish's own explicit mission, and everything in this
  phase is genuinely buildable now (no net-new entity, no new tenancy
  boundary, no billing/payment logic).

**PHASE 1 AUDIT — verified against the real codebase, entity by entity**
(table exists? real shape? where?):

| Entity | Exists? | Real shape |
|---|---|---|
| **Clients** | Yes | `clients` table (`schema-internal-ops.sql` + many `alter table` migrations since — `org_id`, `source_lead_id`→`prospects`, `status` active/paused/churned, `maintenance_monthly_pence`, `stripe_customer_id`). UI: `clients-panel.tsx`'s expand-in-place `ClientCard` — **no `/studio/clients/[id]` route exists** (confirmed by a prior mission's own finding, re-verified here). |
| **Leads/Prospects** | Yes | `prospects` table — pipeline stage, `deal_value_pence`, `assigned_to`, `sales_kit`/`website_mockup`/`research` columns, `source_lead_id` is how a `clients` row traces back to one. Distinct from the marketing site's unrelated `leads` table (chat-widget capture only). |
| **Requests** | Yes | `requests` table (`schema-internal-ops.sql` + alters: `org_id`, `assigned_to`, `website_project_id`→`website_projects`, `auto_sent`, `responded_at`). A client-submitted issue/question, AI-triaged (`category`/`complexity`/`priority`/`covered_by_maintenance`/`draft_response`). **Not linked to `projects` directly** — only indirectly, via a task it spawned. |
| **Tasks** | Yes, but **not a standalone system** — this answers the brief's own explicit question | `tasks` table: `request_id` (nullable in schema, but every real insert path is `triageRequest()`'s `suggested_task` — confirmed via a full grep, there is no freestanding "create a task" Server Action anywhere in the codebase today), optional `project_id`. So today's "Onboarding" row *is* the task system in miniature: a task is always born from an AI-triaged client request, and only optionally gets filed under a `projects` row afterward via `assignTaskToProject()`. |
| **Projects** | Yes, genuinely thin | `projects` table (`schema-projects.sql`): `id`, `org_id`, `client_id` (**not null** — one client per project, no multi-client/internal project support), `name`, `target_date`, `status` (**only `active` \| `done`**), `assigned_to`. One "Onboarding" project is auto-seeded on every prospect→client conversion (`prospects/actions.ts`'s `convertProspectToClient`, 14-day target date) — this is where the screenshot's "Onboarding" row actually comes from, not fixture/demo data. |
| **Deliverables** | **No** — confirmed via a full schema grep, no `deliverables` table, no approval/sign-off flag anywhere. Closest real analogues: `website_projects.build_phases` (a fixed 10-phase JSON array, scoped only to the separate Website Builder sub-product) and `monthly_reports` (a generated snapshot, not an approval workflow). |
| **Meetings** | **Yes — contrary to this dispatch's own seed guess, verified real, but narrowly scoped** | `lead_meetings` table (`schema-lead-meetings.sql`) — Phase 1 of a documented Teams-meeting-intelligence plan, scheduling only (`ms_event_id`, `scheduled_start/end`, `status`), no AI briefing/analysis columns yet per the file's own comment. **Scoped to `prospect_id` only** — there is no meetings entity for a client or project once they've converted. Real gap, not a nonexistent feature. |
| **Messages** | No dedicated entity | `requests.draft_response` is a single AI-drafted reply a tenant can edit and send (`sendRequestReply()`); `detect-replies.ts` only checks *whether* a reply exists, never stores content (a deliberate privacy-minimisation choice per its own comment). No two-way thread is persisted anywhere. |
| **Files/documents** | Exists, but **only for Website Builder projects** | `website_project_files` table + Supabase Storage bucket, scoped tightly to `website_project_id`. No generic file attachment exists on a `clients` row or a `projects` row. |
| **Analytics** | Yes | `/studio/analytics`, org-wide KPIs, not project-scoped. |
| **Reports** | Yes, per-client not per-project | `monthly_reports` table, cron-generated snapshots + a manual "Generate report" control on the Clients page. A separate AI-narrated progress-report generator (`src/lib/project-report.ts`) exists but **only in `/admin`**, the single-tenant legacy system (`getSupabaseAdmin()`, `logAuditEvent({actor:"admin"})`) — it is real precedent for an "AI project assistant," but is not currently org-scoped or usage-metered, so it isn't a drop-in reuse for Studio without real porting work. |
| **Proposals** | **Yes — also contrary to this dispatch's seed guess, verified real** | `proposal_tokens` table + `sendProposal()` + a public `/proposal/[token]` view/accept flow (`schema-proposal-tokens.sql`). Real, working send→view→accept workflow — but scoped to `prospect_id`, i.e. **pre-sale**, not a post-conversion project deliverable-approval mechanism. A genuinely promising pattern to adapt for "what does the client need to approve," not something to build from scratch — but that's an explicit architecture decision, not assumed here. |
| **Invoices** | Yes | `invoices` table, client-scoped, optional `request_id` link, Stripe-integrated, `reminder_sent_at`. **No `project_id` column** — invoices and projects are entirely unlinked today. |
| **Payments** | Yes | Per-client Stripe subscriptions/one-off invoices (`docs/ARCHITECTURE.md`'s "Billing" section) — not project-scoped. |
| **Notifications** | No persisted entity | `notifyAssignee()` is fire-and-forget email only; no in-app notification table/inbox exists anywhere. |
| **Team members** | Yes | `memberships` table, org-scoped; `assigned_to` (plain lowercased email text, not an FK) used identically across `prospects`, `requests`, and `projects` already. |
| **Client portal** | Yes | `/portal/*`, session-scoped via `client_members`. A client **can already see their own `projects` rows** (name/status/target_date only, read-only) — `portal-insights-data.ts` + `schema-rls-projects-client-portal.sql` (added specifically because `projects` originally had only an org-staff SELECT policy). No per-project detail page exists in the portal. |
| **Agency settings** | Yes | `/studio/settings` — org branding, reply-to email, booking link. |
| **Client permissions** | Yes, binary only | `client_members.role` is `owner`/`member` — no field- or item-level visibility split exists today (Hamish's "portal-visibility-split" ask is genuinely new). |

**PHASE 2 ARCHITECTURE — the real entity-relationship model, and the one
finding that most changes the shape of this mission**:

```
organisations (org_id)
 └─ clients (org_id, source_lead_id → prospects)
      ├─ requests (client_id, org_id, assigned_to, website_project_id → website_projects)
      │     └─ tasks (request_id, project_id → projects, nullable)
      ├─ projects (org_id, client_id NOT NULL, assigned_to)      ← thin tracker
      ├─ website_projects (org_id, client_id)                    ← rich tracker, UNRELATED table
      │     ├─ website_project_files (website_project_id)
      │     └─ troubleshooting_log (jsonb, on the row itself)
      ├─ invoices (client_id, request_id nullable)  — no project_id
      ├─ monthly_reports (org_id, client_id)
      └─ client_members (client_id)  → portal access
 └─ prospects (org_id, assigned_to, deal_value_pence, sales_kit, website_mockup, research)
      ├─ lead_meetings (prospect_id)
      └─ proposal_tokens (org_id, prospect_id)
 └─ memberships (org_id)  → team members
```

**There are already two unrelated "Project" concepts in this codebase**:
`projects` (the thin table this mission is about — name/target_date/
status/assigned_to) and `website_projects` (a much richer, separately
built tracker with its own discovery→brief→tool→build→qa→launched stage
machine, its own files table, its own troubleshooting log). Hamish's own
spec description of a Project — "what are we delivering, why, what's
blocked, what's been delivered, what files are relevant" — describes
`website_projects`' shape far more than `projects`' current shape, but the
two tables have **zero relationship today**: a website build and a
generic delivery project for the same client are two unconnected rows
unless a human manually keeps them in sync. This is the single most
important architecture finding from this audit and needs an explicit
decision (see Phase B below), not an assumption, before building a richer
detail workspace that might otherwise duplicate what Website Builder
already does well.

**Write/read pattern already correctly established** — `projects/
actions.ts` uses the service-role client for every write with an inline
`.eq("org_id", orgId)` (or an equivalent ownership `SELECT`) ownership
check, matching `docs/ARCHITECTURE.md`'s documented rule that this
application-level check is the *only* real protection on a write (RLS
protects the session-scoped read side via `schema-rls-projects-org-staff.sql`
+ `schema-rls-projects-client-portal.sql`'s dual policies). Every new
Kanban write (stage change, task creation on a project, activity logging)
must follow this same pattern — nothing here needs a new security model,
just consistent application of the existing one.

**Real, non-trivial migration constraint found, not assumed**: `projects.
status` (`active`/`done`) is read directly, as a two-value enum, by at
least 7 real call sites beyond the Projects page itself: `owner-digest.ts`
(overdue-project detection filters `status === "active"`),
`digest-action-tokens.ts` (`mark_project_done` sets `status: "done"` from
a one-click email action token), `command-search-actions.ts` (command
palette search results), `answer-clients-question.ts` (AI-assistant
summary), `requests/page.tsx` (the task-assignment dropdown filters
`.eq("status", "active")`), `clients/actions.ts` (cascade delete),
`api/platform/export-data/route.ts` (raw data export). **A Kanban `stage`
column must be additive, not a replacement** — add `stage text` (the real
7-value pipeline), keep `status` in sync (derived: any non-`completed`
stage → `"active"`, `"completed"` → `"done"`) so none of these 7 call
sites need to change. This is the safe path a naive "just replace status
with stage" migration would have missed.

**Phasing call (made plainly, not left as options)**: given `PRODUCT.md`'s
"genuinely early-stage... build the next layer only once real data
justifies it" and Hamish's own point 26, the 27-point spec splits into
three real tiers, not one build:

- **Phase A (this entry, Ready)** — Kanban board + drag-and-drop stage
  persistence + a real per-project detail view + Task/Request/Client
  linking. Every entity this needs already exists; nothing here crosses an
  approval boundary.
- **Phase B (see next entry, Researching)** — Files-on-a-project (clone
  the already-built `website_project_files` pattern rather than inventing
  storage infra), `invoices.project_id` tagging (no billing *logic*
  change), and the explicit `projects` ↔ `website_projects` cross-link
  decision. Real, valuable, but deliberately sequenced after Phase A ships
  and is actually used, not bundled in.
- **Phase C (see entry after that, Not started / needs Hamish sign-off to
  even scope in detail)** — Meetings/Deliverables-as-their-own-entity/
  adapting `proposal_tokens` for post-conversion approvals/an AI project
  assistant/client-portal visibility splitting. Each of these requires a
  net-new entity or subsystem that doesn't exist yet for a converted
  client (as opposed to a pre-conversion prospect), materially bigger than
  "extend the Kanban board," and in two cases (visibility splitting, an
  AI assistant with real ongoing Anthropic API cost) crosses this team's
  own documented approval boundaries.

**Acceptance criteria (Phase A)**:
- `projects` gains an additive `stage` column (7-value pipeline, exact
  labels a UX/UI Director call per the mission's own "don't blindly use
  these exact stages" instruction) with `status` derived/kept in sync for
  all 7 existing read call sites above — no call site needs to change.
- A real Kanban board (columns = stages) replaces the flat per-client list
  as the default Projects view; drag-and-drop persists via a new
  `updateProjectStage()` Server Action (same ownership-check + audit-log
  pattern as `updateProjectStatus`/`assignProject`), with an optimistic UI
  update and rollback on failure (this codebase's own established
  `useOptimistic` pattern — see the "Investigate useOptimistic" backlog
  closure — not a bespoke one).
- A new `/studio/projects/[id]` detail route/workspace: header (client,
  assignee, stage, target date), the project's own tasks (already linked
  via `project_id` — needs a new "add a task directly to this project"
  Server Action, since today tasks can only originate from AI-triaged
  requests), each task's parent request shown for context where one
  exists, and a real activity/audit trail reusing the existing
  `audit_log` table (already logs `project.assigned`/`unassigned`/
  deletion — extend to log stage changes too, don't invent a parallel
  activity-log system).
- Filtering/views: keep everything `projects-panel.tsx` already does well
  (active/all toggle, "assigned to me," client search, bulk actions) —
  reimplement as Kanban-native, don't regress any of it.
- A real drag-and-drop library is added (`@dnd-kit/core` +
  `@dnd-kit/sortable` — not in `package.json` today, confirmed; small,
  no ongoing infra cost, not an approval-boundary item).
- Responsive design: the board must degrade to something usable on
  mobile/narrow viewports (a real per-stage accordion or horizontal
  scroll — a UX/UI Director call, not decided here).
- `npx tsc --noEmit`, `npx eslint`, full `vitest` suite green; new tests
  cover the stage/status derivation logic, the new Server Actions'
  ownership checks, and the drag-and-drop persistence + rollback state
  machine.
- Portal-side: the client's existing read-only `projects` view
  (`portal-insights-data.ts`) should show the richer stage, not just
  active/done, since the RLS policy and query already exist — small,
  additive, in scope for Phase A since it's a read-only surfacing of a
  column this phase adds anyway, not a new visibility *rule*.
- Does **not** need Hamish's sign-off before Phase 3 (Design) starts: no
  destructive migration (additive column only, `status` preserved), no
  billing/payment logic change, no new tenancy/permission boundary, no new
  metered AI action. It does need his sign-off on the Direction pick this
  entry hands to UX/UI Director (stage labels/board visual direction),
  same as any other design-taste call in this codebase's precedent.

**PHASE 3 DESIGN (UX/UI Director, 2026-09-03)** — full spec below, built
directly against the real codebase (`projects-panel.tsx`,
`projects/actions.ts`, `project-stage-tracker.tsx`,
`website-builder/[id]/page.tsx`, `status-badges.tsx`, `audit-log.ts`,
`portal-insights-data.ts`, `insights-centre.tsx`, `globals.css`'s token
set, `schema-projects.sql`). Reasoning for the three biggest calls
(stage count, board page width, detail-page shape) is in `DECISIONS.md`'s
matching 2026-09-03 entry — this section is the buildable spec itself.

**1. Stage set — 5, not Hamish's suggested 7.** `not_started` →
`in_progress` → `internal_review` → `client_review` → `completed`.

| `stage` value | Studio-internal label | Badge variant | Column accent | `status` derivation |
|---|---|---|---|---|
| `not_started` | Not started | `secondary` | neutral | `active` |
| `in_progress` | In progress | `accent` | neutral | `active` |
| `internal_review` | Internal review | `secondary` | neutral | `active` |
| `client_review` | Client review | `warning` | `border-t-2 border-warning` + small warning-coloured dot in the column header (plain, not `Eyebrow`'s pulsing dot — nothing here updates live, a pulse would be dishonest) | `active` |
| `completed` | Completed | `success` | `border-t-2 border-success` | `done` |

Only `client_review` (waiting on someone outside the agency — the one
state worth a visual flag, same "external dependency" logic
`requestStatusMeta`'s `awaiting_info: "warning"` already uses for
requests) and `completed` get colour treatment. The other three stay
neutral — a 5-colour rainbow board is the generic-Kanban-template look
this mission explicitly wants to avoid, and colour that doesn't encode a
real distinction is noise. Add `deriveProjectStatus(stage): "active" |
"done"` as a small pure function (new `src/lib/project-stages.ts`,
exporting the table above as `PROJECT_STAGES: {id, label, badgeVariant}[]`
plus the derive function) — imported by `projects/actions.ts` (every
write that sets `stage` sets `status` from this function, not by hand),
`projects-panel.tsx`, the new detail page, and `status-badges.tsx`'s new
`ProjectStageBadge` (same shape as the file's existing
`TaskStatusBadge`/`RequestStatusBadge`). One source of truth for stage
metadata, not four copies drifting.

**2. The board container — deliberately breaks `max-w-4xl`.** 5 columns
of real card content inside an 896px column leaves ~150px per column —
too cramped to read a card, let alone drag one accurately. `StudioPageHeader`
+ the filter bar + the board itself all move to one shared wider
container (still inside the shell's own gutter padding, not full-bleed)
instead of forcing the board into the list-page standard. This is the
second documented exception to `max-w-4xl` after Command Centre — record
it in `DESIGN-SYSTEM.md`'s page-structure section, don't let it read as
drift.

**3. Kanban card anatomy** (`<Card size="sm">`, the denser `--card-spacing`
tier already defined in `card.tsx`, not the default list-page padding):

- **Project name** — `text-sm font-medium`, `line-clamp-2` (project names
  are short in practice, but must not silently truncate to nothing on a
  narrow column).
- **Client name** — `text-xs text-muted-foreground truncate`, directly
  under the name. Required on the card (unlike the old list, which
  grouped by client and so never needed to say it per-row) — the board is
  grouped by stage now, so client identity has nowhere else to live.
- **Task progress** — reuse `projects-panel.tsx`'s existing
  `{done}/{tasks.length} tasks done` line + the thin `bg-accent`-fill
  progress bar (`ProjectCard`'s existing `pct` logic), unchanged. Omitted
  entirely when the project has zero tasks (a real "0 of N" would be
  wrong here — 0 of 0 tasks isn't a signal, it's the absence of one).
- **Assignee** — a small 20px (`size-5`) circular monogram
  (`bg-secondary text-secondary-foreground text-[10px] font-semibold`,
  two-letter initials from the email's local part), only rendered when
  `teamMembers.length > 1` (same established gate as every other
  assignee control in this codebase) and `assigned_to` is set. Give it a
  real accessible label (`aria-label="Assigned to {email}"}` on the
  wrapping span) — initials alone aren't a real label for a screen reader.
  No fallback avatar image system — this codebase has no `Avatar`
  component and no per-user photo data; don't invent one for this.
- **Target date** — reuse `projects-panel.tsx`'s existing
  `isOverdue`/`isDueSoon`/`dueDateNote` helpers verbatim (move them to a
  new shared `src/lib/project-dates.ts` since the board card and the new
  detail page both need them now — two real call sites is the trigger to
  stop duplicating, matching this codebase's own precedent for when a
  helper earns a shared module). Same colour logic as today: `text-destructive`
  overdue, `text-warning` due-soon (`DUE_SOON_DAYS = 5`, unchanged),
  otherwise `text-muted-foreground`. Omitted when no `target_date` is set
  — never show a placeholder date.
- **Explicitly left off the compact card**: the request(s) that spawned
  its tasks. Available per the acceptance criteria, but a request-count
  chip next to a task-count chip on an already-dense card is redundant
  information density for a glance-level board surface — it belongs on
  the detail page, where each task shows its actual parent request
  inline (below). This is a deliberate omission, not an oversight — the
  brief for this review explicitly warns against "add more to the card"
  as a default; this is the one place in this design that says no.

**4. Drag-and-drop.**

- Library: `@dnd-kit/core` + `@dnd-kit/sortable` (per the acceptance
  criteria — confirmed not in `package.json` today).
- **Activation via a dedicated grip handle, not the whole card.** The
  card itself is a `<Link href="/studio/projects/[id]">` (click/Enter
  opens the detail workspace); a separate small `GripVertical` handle
  (visible on hover/focus for pointer users, always visible on touch,
  `aria-label="Drag to move {project name}"`) carries `useSortable`'s
  `listeners`/`attributes`. This avoids the classic "can't tell a click
  from a drag" problem without an activation-distance hack on the whole
  card, and — more importantly — gives keyboard users an unambiguous
  target: Tab reaches the card's Link (Enter opens it) and separately
  reaches the handle (Space picks up, arrow keys move between columns,
  Space drops, Escape cancels — dnd-kit's `KeyboardSensor` default
  behaviour, which must actually be registered alongside `PointerSensor`,
  not pointer-only). Bulk-select mode's checkbox (below) sits before the
  Link as a sibling, same reason — no interactive control nests inside
  another.
- **Custom screen-reader announcements**, not dnd-kit's generic
  index-based defaults (which announce nothing meaningful without real
  project/stage names): "Picked up {project name}" on drag start,
  "{project name} over the {stage label} column" on drag over a new
  container, "{project name} moved to {stage label}" on drop.
- **Optimistic update via `useOptimistic`, this codebase's real
  established pattern** (`ContactTrackingControl`,
  `prospecting/contact-tracking-control.tsx` — the reference
  implementation), lifted to the board level since the mutated state
  (which column a card sits in) is board-wide, not per-card: one
  `useOptimistic(projects, (state, {id, stage}) => state.map(p => p.id
  === id ? {...p, stage} : p))` in `projects-panel.tsx`'s board root. On
  drop: `startTransition(async () => { setOptimisticProjects({id,
  stage}); const r = await updateProjectStage(id, stage); if (r &&
  "error" in r) { setDragError(r.error); flagRollback(id); } })`.
  `updateProjectStage()` (new Server Action, `projects/actions.ts`, same
  ownership-check + `revalidatePath` shape as `updateProjectStatus`) is
  what lets the optimistic guess settle back to the real value
  automatically on success (revalidation refreshes the base `projects`
  prop to match) or snap back on failure (no revalidation happened, base
  prop is unchanged, `useOptimistic` reverts once the transition
  settles) — the same mechanism already shipped for prospect status,
  not a bespoke one.
- **Pending state**: while the transition is in flight, the card renders
  at `opacity-70` with a small `LoaderCircle animate-spin` (`size-3`) in
  its top-right corner — the established "one-shot action, no chat
  bubble to render dots into" treatment
  (`prospecting-panel.tsx`'s Research/Generate-mockup buttons), applied
  here since a card move isn't a chat exchange either.
- **Rollback state**: per the exact spec already shipped for
  `ContactTrackingControl` — a transient `bg-destructive/10` highlight on
  the card (now back in its original column), cleared after 1.5s via the
  same `setTimeout` mechanism, plus an inline `text-destructive text-xs`
  line under the card ("Couldn't move — try again.") shown for the same
  1.5s window. No toast — this codebase has none, and the existing
  inline-error convention already reads fine attached to a card that's
  visibly back where it started.
- **Empty column state**: `border border-dashed border-border` drop
  zone with `text-xs text-muted-foreground` "No projects in this stage" —
  and a real interaction state, not just a static empty box:
  `useDroppable`'s `isOver` flips it to `bg-accent/5 ring-2 ring-accent/30`
  while a dragged card is hovering over it, so an empty column is
  actually visible as a valid drop target while dragging, not just an
  inert gap.

**5. `/studio/projects/[id]` detail workspace** — follows
`website-builder/[id]/page.tsx`'s existing shape exactly (the one real
precedent for a Studio detail page), not a new layout language:

- `mx-auto max-w-3xl` (detail pages read as one document, narrower than
  the board's own wide container above — a real, deliberate difference
  between the two Projects surfaces, not an inconsistency).
- Back-link (`ArrowLeft` + "Projects", same treatment as
  `website-builder/[id]`'s back-link).
- `<Eyebrow>Project</Eyebrow>`, then `h1` = the **project name** (not the
  client name — unlike `website-builder/[id]`, one client can have
  several `projects` rows here, so the project itself is the unique
  identity), with the client's name as a plain `mt-1 text-sm
  text-muted-foreground` line underneath (not a link — no
  `/studio/clients/[id]` route exists to link to, confirmed in Phase 1's
  audit; don't invent a dead link).
- Header-right actions row (same slot as
  `WebsiteProjectAssigneeControl`/`DeleteWebsiteProjectControl`): a
  compact stage `<select aria-label="Change project stage">` (quick
  change without opening the board — also the *only* way to change stage
  on mobile, see below), the existing assignee control
  (`assignProject`, unchanged), and a delete control extracted into its
  own small component (`DeleteProjectControl`, mirroring
  `DeleteWebsiteProjectControl`'s exact confirm-then-delete shape) rather
  than staying inlined the way it is in today's `ProjectCard`.
- Generalised `ProjectStageTracker` (`project-stage-tracker.tsx` gains a
  `stages: {id: string; label: string}[]` prop instead of its current
  hardcoded `STAGES` constant; `website-builder/[id]` passes its own
  existing 6-stage list, the new projects detail page passes
  `PROJECT_STAGES` from `project-stages.ts`) directly under the header —
  one reusable tracker component, two real stage lists, not a duplicated
  visual pattern.
- **Tasks section**: every task with `project_id` = this project, each
  row reusing `requests-panel.tsx`'s `TaskRow` status-button trio (To
  do/In progress/Done) but replacing its "assign to project" `<select>`
  (redundant — already scoped to this project) with, when the task has a
  `request_id`, a small quoted context line ("From: '{first ~80 chars of
  request.raw_text}…'" with a link to that request on `/studio/requests`)
  — the acceptance criteria's "each task's parent request shown for
  context." When `request_id` is null (a manually-added task, see next
  point), that line is simply omitted — never fabricate a request
  association that doesn't exist.
- **"Add a task directly to this project"** — a new Server Action
  (`createProjectTask(projectId, title, description)`  in
  `projects/actions.ts`, same ownership-check pattern as `createProject`)
  and a small inline expand-in-place form (same dashed-border shape as
  the existing `NewProjectForm`), since today the *only* way a task is
  ever created is via AI triage (`triageRequest()`'s `suggested_task`) —
  a real, new capability this phase is adding, not just UI for something
  that already existed. These tasks have `request_id = null`.
- **Activity trail** — new, scoped read of `audit_log` where
  `target_type = 'project' AND target_id = {id}`, ordered by
  `created_at desc`, rendered as a compact list matching
  `/admin/activity-log`'s row shape (action label + actor badge + relative
  time via `timeAgo()`) but in Studio's own card/badge styling (`bg-card`
  rows, not the admin page's flat list) — no search bar, it's already
  scoped to one project. Covers the audit events already logged
  (`project.assigned`/`project.unassigned`/deletion) plus two additions
  this phase makes real: `project.stage_changed` (logged by
  `updateProjectStage()`, `metadata: {from, to}`, same shape as
  `client.status_changed`'s existing metadata convention) and
  `project.created` (currently **not logged at all** —
  `createProject()` never calls `logAuditEvent`; without it, a project's
  own activity trail would start mid-story on every project that predates
  this phase's first stage change, which reads as broken, not just
  incomplete — add this now, it's the same one-line call every sibling
  action already makes).

**6. Filters/views — reimplemented Kanban-native, nothing dropped:**

- **Active/all toggle → "Show completed" toggle.** The board's 4
  active-equivalent columns render by default (parity with the old
  default `active` filter); a `Button` toggle in the filter row reveals
  the 5th `completed` column on demand — Kanban already segregates done
  work into its own column, so the old flat-list reason for hiding it
  (avoiding done/active mixing in one list) doesn't apply the same way,
  but keeping it opt-in by default still avoids a long-lived agency's
  Completed column dominating the first screen.
- **"Assigned to me"** — unchanged behaviour and gate
  (`teamMembers.length > 1`), now filtering cards within every visible
  column rather than filtering list rows.
- **Client search** — unchanged client-side filter, now matching against
  every visible card's client name across all columns.
- **Bulk actions → multi-select + "Move N to…".** A `SquareCheck`
  icon-button toggle (`aria-pressed`, `aria-label="Select projects"`)
  enters select mode, showing the existing checkbox affordance (unchanged
  `size-4`, positioned before the card's Link, not inside it — see
  drag-and-drop's handle note above for why) on every card. ≥1 selected
  shows a sticky bar (bottom of viewport on mobile, inline row on desktop
  — same position `campaigns-panel.tsx`'s own selected-count row already
  uses) with a stage `<select aria-label="Move selected projects to…">`
  that runs `updateProjectStage` for each selected id via `Promise.all`,
  same "N of M failed, try again for those" error copy as today's
  `bulkMarkDone`. This is a strict generalisation of the old "mark N
  done" action (any stage, not just done), not a regression.
- **"+ New project"** — moves from `NewProjectForm`'s current per-client
  placement (the board isn't grouped by client any more) to a single
  instance in the page's filter row, same inline dashed-border
  expand-in-place shape, with one added required field: a client
  `<select>` (previously implicit from which client group the form was
  under). New projects always start at `not_started` — no reason to
  offer picking a starting stage for a project that, by definition, just
  began.

**7. Responsive behaviour — per-stage accordion below `md`, not
horizontal scroll.** Horizontal-scroll Kanban is the well-known mobile
failure mode: side-scroll gestures fight touch-drag gestures, and you
lose the "what's the next stage" at-a-glance view that's the entire point
of a board. Below `md` (matching every other Studio breakpoint, e.g.
`StudioSidebar`'s `md:flex`), the 5 columns become 5 `Accordion`/
`AccordionItem`s (Base UI, `src/components/ui/accordion.tsx` — already a
real, in-use component, `help-faq-list.tsx`/portal help page, not a new
dependency), each `AccordionTrigger` showing the stage label + card
count, each `AccordionContent` holding that stage's cards stacked
vertically. **Drag-and-drop is not attempted between accordion
sections** — touch drag-and-drop across a collapsing/scrolling list is
unreliable and a known accessibility dead end, and a stacked-section
model is a materially different interaction shape than side-by-side
columns anyway. Instead, each card on mobile shows the same stage
`<select>` already built for the detail page's header — one honest
mechanism reused twice, not a crippled version of drag hidden behind a
media query. Default-expanded sections: `in_progress` and
`client_review` (the two "day-to-day, needs a look" stages for an agency
owner checking the board on their phone); the other three start
collapsed but their counts stay visible in the trigger.

**8. Portal-side surfacing (`insights-centre.tsx`'s `OverviewTab`,
`portal-insights-data.ts`)** — replace the current binary "In
progress"/"Done" pill with the real stage, **using client-facing
copy, not the internal enum labels**:

| `stage` | Portal-facing label | Portal colour (existing file's own token usage) |
|---|---|---|
| `not_started` | Not started yet | `text-primary-foreground/50` (muted, matching the file's existing de-emphasis convention) |
| `in_progress` | In progress | `bg-accent/15 text-accent` (unchanged from today) |
| `internal_review` | In review | `bg-accent/15 text-accent` (same tier as in-progress from the client's side — "review" without "internal" reads as just another normal step, not something to act on) |
| `client_review` | Ready for your review | `bg-amber-400/15 text-amber-400` (reusing this same file's own existing amber-for-attention convention, `CATEGORY_META.risk`'s `border-l-amber-400` — genuinely the one state that wants the client to notice and act) |
| `completed` | Completed | `bg-[var(--chart-2)]/15 text-[var(--chart-2)]` (unchanged from today's "done" treatment) |

A client should never see "Internal review" verbatim — meaningless and
mildly alarming to an outsider. `portal-insights-data.ts`'s existing
`projects` select just needs `stage` added to its column list (`status`
can stay, still needed for the "In progress"/"Completed" grouping logic
elsewhere if any exists) — read-only, no RLS change, the policy already
covers the whole row.

- **Relevant agent**: ~~Lead Engineer next (Phase 4 build, against this
  spec)~~ done, 2026-09-03 — see `DECISIONS.md`'s matching entry for the
  full implementation list, the two real gaps found and fixed along the
  way (`deleteProject()` never logged `project.deleted`;
  `digest-action-tokens.ts`'s `mark_project_done` didn't keep the new
  `stage` column in sync), and the one flagged implementation
  simplification (plain `useDraggable`/`useDroppable` instead of
  `@dnd-kit/sortable`'s `useSortable`, since no order is persisted within
  a column). → **QA Engineer next** (Phase 6, verify against this spec in
  an authenticated live session — not yet done) → Product Director
  (Phase 7/8 review against this entry's original problem statement).
- **Dependencies**: none blocking — every entity Phase A touches
  (`projects`, `tasks`, `clients`, `memberships`, `audit_log`) already
  exists in production; the `stage` column is additive.
- **Status**: **Shipped and live-verified**, 2026-09-03 — `npx tsc
  --noEmit -p .`, `npx eslint`, and the full `vitest` suite (456/456) all
  green, `npm run build` succeeded, and live verification in a real
  authenticated Studio session (production, Hamish's own account) confirms
  it genuinely works:
  - Board, drag-handle cards, and 5-stage columns all render correctly;
    the existing "Onboarding" projects backfilled to `in_progress` exactly
    as the migration intended.
  - Stage changes genuinely persist (confirmed via a full page reload,
    not just client state) and correctly log a `project.stage_changed`
    audit event, visible on the detail page's Activity trail.
  - **Real bug found, fixed, and confirmed fixed**: "Add a task" on
    `/studio/projects/[id]` initially failed to ever show the created
    task — traced to a stale RLS policy (`tasks_select_own_org`) that
    only grants SELECT via a join through `requests`, which a
    project-only task's `request_id: null` can never satisfy (the write
    itself always succeeded; the read was the gap). Fixed via
    `supabase/schema-rls-tasks-via-project.sql` (one additive permissive
    policy). Re-verified live after Hamish ran it: all 4 tasks from the
    earlier broken attempts immediately became visible with no new write
    needed — direct confirmation the RLS gap was the sole cause. Full
    writeup in `docs/ai-team/DECISIONS.md`'s matching 2026-09-03 entries.
  - **New real gap surfaced by this same test, logged separately below**:
    no delete-task control exists anywhere in Phase A's UI.
  - Drag-and-drop not yet confirmed via a real pointer gesture (a tooling
    limitation on the verifying side, not a known product bug) — the
    underlying persistence mechanism it shares with the stage-select
    control is confirmed working end to end.
  - **Second real bug found live and fixed**: reported live (screenshot)
    that "Client review" needed a horizontal scroll to see — the 5
    columns were fixed at `w-72` (288px each, 1504px total), well past
    the ~900-1100px actually available once the sidebar is subtracted
    from the board's own `max-w-6xl` ceiling. Fixed via `flex-1`/
    `min-w-[190px]` columns (`project-kanban-board.tsx`) so all columns
    compress to share the available width. Re-verified live: the
    default view (4 active-stage columns, "Show completed" off) now
    fits with zero horizontal scroll. Toggling "Show completed" on to
    add the 5th (Completed) column does still need a small scroll once
    columns hit their 190px floor — a reasonable, expected trade-off
    for a secondary/opt-in view, not a regression of the original
    complaint (which was specifically about "Client review," one of
    the 4 default-visible columns).
  - Phase B/C intentionally not started, per this entry's own phasing.

### Add a delete-task control to the Projects detail page

- **Problem**: `/studio/projects/[id]` (Phase A) lets a task be created
  and have its status changed, but has no way to delete one — found live
  while cleaning up test tasks created during Phase A's own verification,
  which are now stuck on a real project with no in-app removal path.
- **Objective**: a delete control on each task row, same confirm-before-
  destructive-action pattern already used elsewhere in Studio (e.g.
  `DeleteProjectControl` on this same page).
- **Priority**: P2 — real, small, not blocking, but a genuine gap in an
  otherwise-complete feature.
- **Relevant agent**: Lead Engineer.
- **Dependencies**: none.
- **Status**: Complete/shipped (commit `e080410`). Built: `deleteProjectTask()`
  Server Action (same org-ownership-check-then-delete shape as
  `deleteDeliverable()`), confirm-before-delete UI on `TaskRow` (identical
  pattern to `DeliverableRow`/`EntryCard`), `"task.deleted"` → "Task removed"
  added to the project activity trail, 3 new unit tests. Live-verified
  2026-09-04 on the real "Onboarding / W Fitness" project
  (`/studio/projects/4edb5d53-a9eb-47bd-9ec4-4452295f74a1`) via a fresh
  Claude-in-Chrome tab: delete icon present on every task row; used it to
  delete all 4 stuck test tasks left over from Phase A's own verification
  ("Send onboarding welcome email" ×2, "Retry test task", "Second retry
  task"); confirmed each removal persisted after a full page reload (not
  just client state) and produced a matching "Task removed" Activity entry
  with the correct task title. Project's task list is now genuinely empty
  ("No tasks yet.") — the real client data this gap had left stranded is
  cleaned up.

### Projects Kanban Command Centre — Phase B: Files-on-a-project, invoice linkage, and the `projects` ↔ `website_projects` cross-link decision

- **Problem**: three real, valuable connections Hamish's spec names
  ("what files are relevant," what's been billed, and how a generic
  delivery project relates to an in-flight Website Builder build) aren't
  answerable from Phase A alone, but each has a real, bounded, already-
  proven pattern to extend rather than build from scratch.
- **Objective**: (1) a `project_files` table cloning the already-built,
  already-tested `website_project_files` storage pattern (private Supabase
  Storage bucket, signed URLs, `kind` label) but scoped to `projects.id`
  instead of `website_project_id`; (2) a nullable `invoices.project_id`
  column so "what's been billed / what's outstanding" can surface on a
  project's detail view — a tag, not a billing *logic* change, the invoice
  creation/Stripe flow itself is untouched; (3) an explicit decision (not
  an assumption) on whether/how a `projects` row should be able to point
  at its own `website_projects` row when the same piece of client work is
  both a tracked delivery project and an active website build — the
  audit's own finding that these are today two entirely unrelated tables
  for what's often conceptually the same piece of work.
- **User**: same as Phase A — an agency owner running project delivery,
  who currently can't see a project's files or billing status without
  leaving Projects, and whose Website Builder work is invisible from the
  Kanban board even when it's the actual work "AI Lead Generation System"
  refers to.
- **Priority**: P2 — real and valuable, but deliberately sequenced after
  Phase A ships and gets used, not bundled into the same build. Building
  three more schema touches into an already-substantial Phase A risks the
  exact kind of premature scope this role exists to push back on.
- **Expected outcome**: a project's detail workspace (built in Phase A)
  can show its own files and billing status without inventing new
  infrastructure; a clear, documented answer to "is a website build its
  own project or part of one" that the team builds toward consistently
  instead of guessing per-feature.
- **Acceptance criteria**: to be written properly once Phase A has shipped
  and Product Director scopes this as its own dispatch — not written in
  full here, since committing to exact schema/UI shape before Phase A's
  real detail-workspace layout exists risks designing against a page that
  doesn't exist yet.
- **Relevant agent**: Product Director (re-scope once Phase A ships) →
  Lead Engineer (`project_files` clone, `invoices.project_id` addition) +
  UX/UI Director (the cross-link decision's UI implication, if any).
- **Dependencies**: Phase A shipped and live.
- **Status**: Researching.

### Projects Kanban Command Centre — Phase C1: a real Deliverable entity + client-visible review (the literal bottleneck in Hamish's own delivery chain)

Supersedes part of the old, vaguer "Phase C" entry below (now split, not
just renamed) — see `DECISIONS.md`'s matching 2026-09-03 entry for why.
Hamish reframed this mission in his own words:

> "Client sends Request → Request becomes Task → Task gets attached to
> Project → Project moves to In Progress → Agency completes Deliverable →
> Internal Review → Client Review → Client approves → Project progresses
> → Results feed Analytics → Results feed Client Report → Report
> demonstrates ROI → Agency sends next proposal ... That's when your
> Projects system becomes genuinely differentiated. You're not building
> another project management tool. You're building the delivery layer of
> an AI agency in a box."

The first four links are real and shipped (Phase A). Everything from
"Agency completes Deliverable" onward is currently either nonexistent or,
for "Internal Review"/"Client Review," just a Kanban column label with
nothing concrete attached to it. This entry is the one piece of that gap
that's genuinely buildable now — it's also the load-bearing one: every
link further down the chain (Analytics, the Client Report, "demonstrates
ROI," the next proposal) is data that doesn't exist yet and can't be
honestly built against zero real rows (`PRODUCT.md`'s "real data or
nothing" / "build the next layer only once real data justifies it").
Building this first is what actually unlocks the rest, rather than
building five parallel half-connected pieces at once.

- **Problem**: `projects.stage` (Phase A) already has `internal_review`
  and `client_review` values, but nothing is ever attached to a project
  when it sits in either — no `deliverables` table exists anywhere
  (confirmed via a full schema grep, both in the original Phase 1 audit
  and re-confirmed here), so a project "in client review" shows a client
  the exact same read-only stage pill as a project "not started." There's
  nothing to actually review.
- **Objective**: a `deliverables` table scoped to a project, a staff-side
  submit flow on `/studio/projects/[id]`, and read-only client-portal
  surfacing gated on the project's own existing `stage` — no new
  approval/write action yet (that's C2 below, which needs sign-off before
  it's built). This alone makes "Internal Review" and "Client Review"
  real states with real content, using a mechanism that's already fully
  additive and crosses no approval boundary.
- **User**: an agency owner/team member submitting real delivered work for
  review (staff side); a client in the portal, for the first time able to
  see *what* is being reviewed rather than just a stage label (client
  side) — genuinely new value for a persona this mission hasn't served at
  all yet.
- **Priority**: P1 — Hamish's own current priority, and the literal
  bottleneck: nothing else in his chain can be honestly built without
  this existing first.

**Data model** — deliberately minimal, not front-loading C2's decision
columns before C2 is real (matching `lead_meetings`' own established
precedent of shipping only the current phase's columns, per its own
schema comment, not speculatively adding a future phase's fields):

```sql
create table deliverables (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  link_url text,        -- optional (staging link, doc, etc.)
  submitted_by text,    -- email, same loose-string convention as assigned_to
  submitted_at timestamptz not null default now()
);
```

No file attachment in this phase — defer to Phase B's `project_files`
table (already scoped, not yet built) once it exists, rather than
inventing a second storage pattern in parallel. No `status`/approval
columns yet — every deliverable in C1 is implicitly "submitted, not yet
decided," since there's no decision mechanism until C2. C2's own
migration adds `status`/`client_decision_at`/`client_decision_by`/
`client_comment` onto this same table when it ships — a second small
additive migration, not a rebuild.

**RLS — an extension of the existing boundary, not a new one:**
- Org-staff SELECT/INSERT/UPDATE/DELETE via `memberships`, identical
  shape to `schema-rls-projects-org-staff.sql`.
- Client-portal SELECT only, via a join through `projects` requiring both
  the existing `client_members` ownership check (same shape as
  `schema-rls-projects-client-portal.sql`) **and** `projects.stage in
  ('client_review','completed')`. This stage gate is the entire mechanism
  that makes "Internal Review" real: while a project sits in
  `not_started`/`in_progress`/`internal_review`, any deliverables on it
  are invisible to the client by construction — no separate visibility
  flag to remember to flip, no second state machine, just the project's
  own existing stage. The moment staff moves the project into
  `client_review`, its deliverables become visible — that transition *is*
  the real "we're ready for you to look at this" moment. No new write
  ability for the client session in this phase, only a wider read.

**Open design question, not resolved here** — the portal currently has
**no per-project detail page at all** (`insights-centre.tsx`'s
`OverviewTab` shows a flat stage pill only, per Phase A's own audit).
Surfacing deliverables client-side means either building a minimal
`/portal/projects/[id]` or embedding an expandable section into the
existing overview list — a real UX/UI Director call, not assumed here,
the same way the `projects`↔`website_projects` cross-link was left to
Phase B rather than guessed at in Phase A's audit.

- **Acceptance criteria**: additive migration only (new table); org-staff
  write via the existing Server-Action-ownership-check pattern
  (`projects/actions.ts`'s established shape); client read access is an
  extension of the client's existing session boundary (a wider read on
  data already inside their tenancy, not a new tenancy boundary); no
  billing change, no destructive migration, no new metered AI action.
  Studio-side: a "Deliverables" section on `/studio/projects/[id]`,
  same list + inline "Add a deliverable" shape as the existing Tasks
  section. Portal-side: resolved below by the UX/UI Director — a new
  `/portal/projects/[id]` detail page, the portal's first per-project
  surface.
- **Relevant agent**: Lead Engineer next (build, per the design pass
  below) → QA → Product Director.
- **Dependencies**: none blocking — `projects.stage`, `client_members`,
  `memberships` all already exist in production from Phase A. Explicitly
  does **not** depend on Phase B (files are deferred, not required).
- **Status**: Ready — design pass below complete, build not started.

**UX/UI Director design pass (2026-09-03)** — resolves both open items
above (portal placement, per-deliverable states) and corrects one
mismatch: the dispatch that requested this design pass described C1's
data model as covering "status/owner/due date/files/approval-status/
client-visibility." The real, already-written C1 schema above has none
of those columns — no `status`, no per-deliverable owner (only
`submitted_by`, set automatically, not chosen), no due date, no files
(explicitly deferred to Phase B), no `approval_status` (explicitly C2).
Designing UI for fields that don't exist would be exactly the
"dishonest UI ahead of real capability" this codebase already holds the
line against elsewhere — every state below is derived only from the
columns that are actually real in the migration above, plus
`projects.stage`, which already exists.

*Portal placement — `/portal/projects/[id]`, not an inline expansion.*
The portal currently has zero per-project detail surface — confirmed by
reading `insights-centre.tsx`'s `OverviewTab`, which renders each
project as a flat summary row (name, stage pill via
`PORTAL_PROJECT_STAGE_META`, a day-count line) with no click-through at
all today. A real `/portal/projects/[id]` page beats an inline
accordion inside that row for three concrete reasons: (1) content
volume — several deliverables × (title, description, link, submitted
date) doesn't fit cleanly inline without truncating real content, and
truncation here means hiding something the client is specifically meant
to review; (2) forward compatibility — C2 adds an actual approve/reject
decision with a comment field, which needs real page space to grow
into; building the accordion now only to redesign it into a full page
for C2 is wasted work; (3) consistency — this is exactly the "one
record, not a list" shape `DESIGN-SYSTEM.md`'s detail-page convention
already exists for (`/studio/projects/[id]`, `website-builder/[id]`),
just newly instantiated on the portal side of the app for the first
time. The existing summary row in `OverviewTab` doesn't need a
redesign — it needs a click-through: wrap it in
`<Link href={`/portal/projects/${p.id}`}>` (was a plain `<div>`), add a
trailing `ChevronRight` (`size-4 text-primary-foreground/30`,
decorative/`aria-hidden`) so it reads as clickable, and add
`transition-colors hover:bg-primary-foreground/10` — the same hover
treatment this file already uses on its "Ask" CTA row lower down, not a
new one.

`/portal/projects/[id]` itself does **not** copy `/studio/projects/[id]`'s
literal styling — it copies its *structure* (back-link → title → stacked
sections), rendered in the portal's own already-established idiom:
`text-page-title`/`text-page-subtitle` (not Studio's `Eyebrow`/
`font-heading` pair — no portal page uses `Eyebrow` today, so importing
it here would be a one-off graft, not a real portal pattern), and no
extra `max-w-3xl` wrapper — `portal/(authed)/layout.tsx` already
constrains `main` to `max-w-6xl` minus the sidebar, so every existing
portal page (`requests/page.tsx`, `insights/page.tsx`) renders straight
inside that, and this page should match them, not Studio's separate
per-page width discipline.
  - Back-link: `<Link href="/portal/insights" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Back to Insights</Link>`.
  - `<h1 className="text-page-title mt-4">{project.name}</h1>`, then a
    `text-page-subtitle` line reusing the exact same
    `PORTAL_PROJECT_STAGE_META[stage]` pill plus the day-count line
    `OverviewTab` already computes — the same visual language the client
    just clicked through from, not a second stage vocabulary. Import
    `daysUntil`/`dueDateNote`/`formatDate` from `src/lib/project-dates.ts`
    directly (a plain, non-`"use client"` module, already Studio's
    third real call site) rather than re-copying the local `daysUntil`
    `insights-centre.tsx` currently hand-rolls.
  - **Never render `ProjectStageTracker`/`PROJECT_STAGES` here** —
    `project-stages.ts`'s own comment is explicit that a client should
    never see an internal stage label like "Internal review" verbatim.
    The single portal-safe pill is the only stage UI this page gets.
  - Below that: one section, "Deliverables" (no Tasks, no
    `ProjectActivityTrail` — both stay staff-only; nothing in this
    dispatch asks for client task visibility and `PRODUCT.md`'s "thin
    and honest" principle argues against adding it speculatively).

*Deliverable states — resolved honestly against the real schema, not
invented.* C1's `deliverables` table has no `status` column, so there is
no per-deliverable "not yet submitted" vs "in review" state to design —
every row that exists is, by the schema comment's own words, "submitted,
not yet decided." The states that are real:
  1. **Zero deliverables on a project** — not a deliverable state, a
     section-empty state. Studio: `<p className="mt-2 text-xs
     text-muted-foreground">No deliverables submitted yet.</p>`, same
     shape as `ProjectTaskList`'s "No tasks yet." Portal: gated by RLS
     before it's even a UI question — see below.
  2. **≥1 deliverable exists, and visibility** — the one real "state" a
     deliverable has in C1, and it belongs to the *project*, not the
     deliverable (every deliverable on one project shares it, since it's
     C1's RLS stage-gate, not a per-row flag). Render it **once**, as a
     section-level banner above the list — reusing the exact "one banner
     at the top, not repeated per row" shape already established for
     field-provenance tags (`DESIGN-SYSTEM.md`) — never a per-card badge
     repeating the same fact `N` times:
     - `stage` in `not_started`/`in_progress`/`internal_review`:
       `border-border bg-secondary/40` + `EyeOff` icon
       (`text-muted-foreground`) + "Not visible in the client portal
       yet. Deliverables appear there once this project moves to Client
       review."
     - `stage === "client_review"`: `border-warning/30 bg-warning/5` +
       `Eye` icon (`text-warning`) + "Visible to the client now —
       everything below appears in their portal."
     - `stage === "completed"`: `border-success/30 bg-success/5` + `Eye`
       icon (`text-success`) + "Visible to the client — this project is
       complete."
     Colours are pulled straight from `project-stages.ts`'s own
     `badgeVariant` for `client_review`/`completed` (warning/success) —
     the banner agrees with the `ProjectStageBadge` already shown above
     it on the same page, not a new colour vocabulary.
  3. **"Approved" (C2, not built)** — render nothing. No checkmark, no
     "Approved"/"Pending decision" badge, no disabled "Approve" button.
     A per-deliverable `status` column doesn't exist yet; showing any
     decision-shaped UI ahead of it is the fabricated-capability problem
     `HANDOFF-FORMAT.md`/`PRODUCT.md` already forbid elsewhere in this
     codebase (see the AI-solutions chat-demo precedent). C2's migration
     is what turns this into a real state, not a design placeholder now.

  Portal-side, the RLS stage-gate produces two genuinely different
  empty states, not one — conflating them would misrepresent *why*
  nothing shows, the same "a real zero still needs honest, specific
  copy" instinct as `DESIGN-SYSTEM.md`'s existing "0 of N" note:
  - `stage` not yet `client_review`/`completed` (deliverables invisible
    by RLS construction): "We'll share what we're working on here once
    this project moves to review."
  - `stage` is `client_review`/`completed` but zero rows exist (staff
    moved the stage before submitting anything): "Nothing shared for
    review yet — check back soon." A client can already see `stage`
    itself (existing RLS policy, unrelated to this table), so the page
    always has enough information to pick the right one of these two
    messages.

*Field-level, not just row-level, client visibility — `submitted_by` is
staff-only even on a client-visible row.* No portal surface today shows
a raw staff email to a client (`ProjectActivityTrail`'s `audit_log` read
is explicitly org-staff-only, confirmed via its own comment), and this
codebase has no display-name resolution layer — `assigned_to`,
`audit_log.actor`, and every other "who did this" field render as bare
emails, staff-facing only. Don't newly expose one to a client just
because the row itself became readable. Studio's `DeliverableRow`:
"Submitted by {submitted_by} · {formatDate(submitted_at)}" (raw email,
consistent with `ProjectAssigneeControl`'s own convention). Portal's
row: "Shared with you on {formatDate(submitted_at)}" — `submitted_at`
only, reframed in second person, no email.

*Studio-side component and Server Actions* (mirrors
`project-task-list.tsx`/`ProjectTaskList` exactly — same file
location convention, same internal-component split):
  - New `src/components/platform/project-deliverable-list.tsx` exporting
    `ProjectDeliverableList`, with `DeliverableRow` and
    `NewDeliverableForm` as internal components, same relationship as
    `TaskRow`/`NewTaskForm` in the sibling file. Rendered directly below
    the Tasks section on `/studio/projects/[id]/page.tsx` (`mt-8`, same
    rhythm as the Tasks→Activity gap already there).
  - `DeliverableRow`: title + description (optional) + link (optional,
    `<a target="_blank" rel="noopener noreferrer">` with an
    `ExternalLink` icon and visible text "View link" — not icon-only, so
    it needs no `aria-label`) + the "Submitted by… ·…" meta line + a
    delete control using this codebase's one established confirm-delete
    shape verbatim (`knowledge-panel.tsx`'s `EntryCard`): resting state
    `<Button size="icon" variant="ghost" aria-label="Delete"><Trash2 /></Button>`,
    armed state swaps to `<Button size="xs" variant="destructive">Confirm</Button>`
    + `<Button size="icon" variant="ghost" aria-label="Cancel delete"><X /></Button>`.
    This is a small, deliberate addition beyond the dispatch's literal
    ask (which didn't mention delete) — flagged here rather than done
    silently: C1's own RLS already grants org-staff DELETE, and with no
    edit form in this phase (matching Tasks' own precedent of "no edit,
    just recreate" — `ProjectTaskList` has no title/description edit
    either), delete is the only real corrective path for a typo'd link
    or a wrong submission. No edit form — don't build one; that's a
    real scope addition beyond what C1 needs, not a small polish.
  - `NewDeliverableForm`: identical dashed-border expand-in-place shape
    to `NewTaskForm` — Title (required Input), Description (optional
    Textarea, rows=2), Link (optional `Input type="url"`, placeholder
    `https://staging.example.com`, helper text "Staging link, doc, or
    file location"). No `submitted_by` field — it is never user-entered,
    set server-side from the acting session's email (see below), the
    same "attribution is the system's job, not a form field" shape
    `audit_log.actor` already uses everywhere else.
  - Server Actions in `projects/actions.ts`: `createDeliverable(projectId,
    title, description, linkUrl)` and `deleteDeliverable(deliverableId)`,
    same ownership-check shape as `createProjectTask`/
    `updateProjectTaskStatus`. `createDeliverable` uses
    `requireOrgIdAndEmail()` (already exists, used by
    `createProject`/`assignProject`/`deleteProject`) — writes
    `submitted_by: actorEmail`, and **must reject any `linkUrl` that
    isn't `https://`**, same allowlist bar
    `sanitizeBlocksForWrite()` already enforces for Command Centre CTA
    `href`s (`DESIGN-SYSTEM.md`'s accessibility-baseline note) — this is
    a second real place user input becomes a rendered `<a href>`, both
    in Studio and, once visible, the client portal, and it needs the
    same bar, not a weaker one.
  - Both actions log to `audit_log` (`target_type: "project"`,
    `target_id: projectId`, `actor: actorEmail`, `actorType: "admin"`,
    action `"deliverable.submitted"` / `"deliverable.deleted"`,
    metadata `{ title }`) — a two-line addition to
    `project-activity-trail.tsx`'s existing `ACTION_LABEL` map
    ("Deliverable submitted"/"Deliverable removed") and `describeEntry()`
    switch (return `m.title`), since `ProjectActivityTrail` is already
    imported and rendered on this exact page. This makes "Agency
    completes Deliverable" show up as a real timeline entry for free,
    not a new component.

### Projects Kanban Command Centre — Phase C2–C5: client approval, results feeding Analytics/the Client Report, an AI project assistant, and a completed-project → next-proposal link (supersedes the old "Phase C" entry)

The rest of Hamish's chain past Phase C1, above. Each sub-item has a
genuinely different real-world shape and a different approval-boundary
status — the previous version of this entry bundled all of it into one
undifferentiated P3 "someday" bucket, which obscured that some of this
is real near-term work and some genuinely still needs Hamish's sign-off
before it's even scoped further. This rewrite splits them out explicitly
rather than quietly loosening any of the original discipline just because
Hamish is now more enthusiastic about the destination.

**C2 — "Client approves" (the literal missing link)**
- What's missing: nothing lets a client actually approve or request
  changes on a deliverable today — the portal is entirely read-only.
  `proposal_tokens`' send→view→accept pattern (timestamped `viewed_at`/
  `accepted_at`, idempotent accept, a notification fired only on the
  interesting event) is real, working precedent for the *shape* of this
  — but adapting it *literally* would be the wrong fit: `proposal_tokens`
  uses a public, unauthenticated token specifically because a prospect
  has no account to log into. A client reviewing a deliverable already
  has a real authenticated portal session (`client_members`) with
  existing RLS-scoped read access — bolting an unauthenticated token flow
  onto data a client can already reach via a real login would be a
  regression of the existing boundary, not a reuse of the pattern. The
  right adaptation is the *pattern* (submit → notify → view → decide,
  each a real timestamp, idempotent, notifies the agency on the
  interesting event), implemented as an authenticated Server Action
  reachable from `/portal`, gated by the client's existing session, not a
  bare token.
- Data model: extends C1's `deliverables` table — `alter table
  deliverables add column status text not null default 'submitted' check
  (status in ('submitted','approved','changes_requested')), add column
  client_decision_at timestamptz, add column client_decision_by text, add
  column client_comment text;`
- **Why this needs Hamish's explicit sign-off before it's *built*** (the
  scoping above is fine to exist now, same as it was for Phase A before
  Phase 3 design): this is a new client-writable RLS policy — the
  `client_members` session gains a real write it doesn't have today.
  `docs/ai-team/README.md`'s approval boundaries require Hamish's
  explicit approval for any RLS policy change regardless of size, and the
  original Phase C entry already separately flagged this exact item for
  Security Auditor review before shipping — this rewrite preserves that
  bar, it does not loosen it. Concretely: Security Auditor reviews the
  new policy + Server Action's ownership check; Hamish signs off on the
  policy itself, same bar as any other RLS change in this codebase. This
  is a narrower category than a full new *tenancy* boundary (it's one new
  write action on data the client can already see, not new visibility) —
  worth stating precisely rather than either over- or under-escalating it.
- **Priority**: P2 — real and wanted, blocked on sign-off.
- **Dependencies**: C1 shipped and in real use.
- **Status**: Not started — needs Hamish's sign-off on the RLS write
  policy before Lead Engineer starts; Security Auditor can review the
  design in parallel with awaiting that sign-off.

**C3 — Results feed Analytics + the Client Report ("Results feed
Analytics" / "Results feed Client Report" / "Report demonstrates ROI")**
- What's missing: `/studio/analytics` is org-wide only, never
  project-scoped; `monthly_reports`' `computeSnapshot()`
  (`src/lib/monthly-report.ts`) queries `requests` and derives `tasks`
  from them — it has zero awareness that `projects`/`deliverables` exist,
  confirmed by reading the function directly.
- What this actually is once C2 produces real approved-deliverable rows:
  extend `computeSnapshot()` and `monthly-report-pdf.tsx` with a small,
  purely additive read — "N deliverables approved this period," their
  titles/dates — plus an equivalent rollup card on `/studio/analytics`.
  No new AI call, no new metered usage event, no schema change beyond
  what C1/C2 already added — pure aggregation over data that already
  exists by the time this is built.
- **"Report demonstrates ROI," corrected rather than built as literally
  stated**: this product has no access to a client's own revenue or
  business outcomes, so a real £-value "ROI" figure cannot be honestly
  computed here — inventing one would violate `PRODUCT.md`'s "real data
  or nothing" the same way a fabricated stat would. What this product can
  honestly show is evidence of delivered value — a dated list of what was
  actually built and client-approved. That is the ROI story available
  here; it must not be relabelled or dressed up as a numeric ROI
  percentage when it's eventually built. Recorded explicitly now so a
  future build doesn't quietly reintroduce a fabricated number under
  this label.
- **Priority**: P2 — no approval-boundary issue at all (pure additive
  read, no AI cost, no new write, no RLS change), but sequenced after C2
  specifically because there is no real approved-deliverable data to
  aggregate until then — building this against zero real rows would be a
  fancier zero-state, not real value, the same "build the next layer once
  real data justifies it" reasoning that already sequenced Phase B after
  Phase A.
- **Dependencies**: C2 shipped and in real use.
- **Status**: Not started.

**C4 — AI project assistant (carried forward unchanged, not loosened)**
- Real precedent: `src/lib/project-report.ts` — single-tenant `/admin`-
  only (`getSupabaseAdmin()`), no org scoping, no usage metering, output
  not persisted. Porting a narrated version of C3's numbers to
  multi-tenant Studio means a new metered `UsageEventType`
  (`usage-limits.ts`) and real ongoing per-generation Anthropic API cost.
  Per `PRODUCT.md`'s "genuinely early-stage... no significant real usage
  history yet," there's no evidence this gets used enough to justify
  building it — the same reasoning that already deferred two adjacent
  AI-agentic ideas in the 2026-08-27 "best in market" mission.
- Still needs Hamish's explicit sign-off **before it's even scoped in
  detail**, not just before building — unchanged from the original Phase
  C entry. Explicitly preserved, not loosened, per this rewrite's own
  brief.
- **Priority**: P3 (someday). **Status**: Not started.

**C5 — Completed project → next proposal ("Agency sends next proposal")**
- What's missing: `sendProposal()`/`proposal_tokens` is real and working,
  but `proposal_tokens.prospect_id` is `not null` — it only ever targets
  a pre-conversion prospect. Nothing connects a completed `projects` row
  (a converted client) back to `sendProposal()` at all today.
- **On the standing no-outreach-before-2026-11-09 constraint — reasoned
  explicitly, not assumed either way, per this dispatch's own
  instruction**: that constraint is about *Hamish's own outbound sales
  activity for HamishAI/the Agency Platform itself*, while he's still
  employed elsewhere. It is not about a feature that lets a *tenant
  agency* send *their own client* a proposal for *their own* follow-on
  work. The Studio platform already ships real prospect-outreach
  automation for tenants today (prospecting, sales-kit generation,
  `sendProposal()` itself) and none of it has ever been gated by the
  Nov-9 constraint, because it isn't Hamish's own outreach — it's the
  product's job. **This link does not trip that constraint.** Stated
  explicitly here so a future mission doesn't apply the Nov-9 rule to a
  tenant-facing product feature by reflex.
- **What does still need care, for a different reason**: any version of
  this that auto-sends a real proposal to a real client the instant a
  project's stage flips to `completed`, with no human in the loop, is an
  unsupervised action with real relationship/business consequences for a
  tenant's real client — the same class of risk `PRODUCT.md`'s "fail open
  on soft checks, fail closed on money" already treats cautiously, and
  nothing in this codebase today auto-sends a proposal without an
  explicit staff click. The first real version of this link should be a
  one-click *suggestion* on a newly-completed project — "Suggest a
  follow-up proposal" — mirroring the Command Centre's existing
  "Generate outreach kit" one-click precedent, never a silent auto-fire.
  This framing doesn't need Hamish's sign-off before scoping (it's
  human-triggered, and it's tenant-facing, not Hamish's own outreach) but
  should still get a normal design/build review given it touches the
  proposal-send path.
- Real scope this requires: `proposal_tokens.prospect_id` becomes
  nullable with a `client_id` alternative (small additive migration +
  `check (prospect_id is not null or client_id is not null)`),
  `sendProposal()` gains a client-target branch, `readProposalToken`'s
  public unauthenticated view needs to work for a client-target row too
  (still fine to stay a public token *here*, unlike C2 — a proposal is
  explicitly meant to be viewable/forwardable outside a login, same as it
  already is for prospects).
- **Priority**: P3 (someday) — real, but explicitly sequenced last: it
  depends on real completed projects with real approved deliverables to
  point to (C1–C3), and is the smallest-value link in the chain until
  then — a "send another proposal" button with nothing real to show for
  the last project is just a generic upsell nag, not the differentiated
  "look what we just delivered" moment Hamish's own framing describes.
- **Dependencies**: C1–C3 shipped and in real use. **Status**: Not
  started.

- **Relevant agent**: Product Director (this entry) → UX/UI Director (C1
  design pass first) → Lead Engineer (C1 build) → Security Auditor (C2
  design review, in parallel with awaiting Hamish's sign-off) → Product
  Director (re-scope C3 once C2 ships) → AI/Agent Architect (C4, only
  once Hamish signs off on scoping it) → Product Director (C5, once
  C1–C3 are real).
- **Dependencies**: see each sub-item above.
- **Status**: Not started as a whole — C1 (above) is the one piece of
  this area that's genuinely Ready now.

### Prefill the Website Builder discovery form from a converted prospect's mockup/research (close the Prospects → Website Builder gap)

- **Problem**: a prospect's "Website mockup" (`draft-website-mockup.ts`,
  homepage copy generated during outreach) and cached `research`
  (`research-lead.ts`) are a real dead end today — once the prospect
  converts to a `clients` row (`convertProspectToClient`,
  `prospects/actions.ts`), starting a Website Builder project
  (`WebsiteProjectWizard` → `createWebsiteProject`) means retyping
  business name, industry, location, services, etc. from scratch, even
  though genuinely accurate answers to several of those questions already
  exist and were paid for (an AI call) during prospecting.
- **Objective**: when a website_project is started for a client that has
  a traceable source prospect, the discovery form opens pre-filled with
  every field that has a real, non-invented upstream source, visibly
  marked as pre-filled, fully editable, and never silently definitive.
- **User**: an agency owner (or their staff) starting a Website Builder
  project immediately after converting a prospect who already has a
  mockup/research on file — the exact continuation of a workflow that
  today just throws that work away.
- **Priority**: P1 — thin, additive, no new AI pipeline, no schema
  migration (see finding below), directly serves this product's own
  "AI does the parts that don't need to be theirs" positioning
  (`PRODUCT.md`).
- **Verified, not assumed — the trace-back already exists, no migration
  needed**: `clients.source_lead_id` (`schema-client-source-lead.sql`)
  already exists and is already set on every conversion
  (`convertProspectToClient` inserts `source_lead_id: prospectId`
  verbatim). `website_projects.client_id` references `clients.id`. So the
  full chain — `website_projects` → `clients.source_lead_id` →
  `prospects.{website_mockup, research, business_name, category,
  neighbourhood, website}` — is already real and queryable today. **No
  migration of any kind is required for this feature; nothing here
  crosses the destructive-migration or schema-change approval boundary.**
- **Where the prefill happens — explicit opt-in, not silent autofill**:
  given this product's "thin and honest over impressive and fake"
  principle and that a user must always be able to tell what's pre-filled
  vs. what they typed, this must not be the wizard silently populating
  itself whenever it can trace a `source_lead_id` — a returning user
  filling in a blank form for a manually-added client would have no way
  to know whether silent prefill happened or not, and stale prospect data
  (mockup/research generated weeks before conversion) auto-appearing
  without any user action reads as the tool guessing on their behalf.
  Instead: a real, visible entry point specific to a client with a source
  prospect that has a mockup or research on file — e.g. on the client
  detail page (`/studio/clients/[id]`) or from the prospect itself
  post-conversion, a "Start website build from this prospect" button
  distinct from the existing generic "New project" flow
  (`/studio/website-builder/new`, currently reachable only from the
  Website Builder list page with zero prefill support of any kind — no
  query param, no client preselection even). Clicking it is the
  explicit, one-time user action that triggers prefill; the resulting
  form must visually distinguish prefilled fields (e.g. a small "from
  [prospect]'s research" tag per field or per section) from fields the
  user types themselves, and every prefilled field stays a normal editable
  input, not a locked/read-only value.
- **Field-by-field mapping — verified against real schema/types, not
  guessed**:
  - `businessName` — real, direct: `prospects.business_name`.
  - `industry` — real, direct: `prospects.category`.
  - `location` — real, reasonable proxy: `prospects.neighbourhood`
    (coarser than a full address, but the same granularity `research-lead.ts`
    itself treats as "location" throughout).
  - `servicesProducts` — real: `research.services` (the AI's observed
    services from the prospect's actual site content) when `research` is
    present, which is now the common case (`research-lead.ts`'s
    `researchLead()` runs automatically on every discovered prospect per
    the AI ROI backlog entry's own finding) — prefer this over
    `website_mockup.services`, whose 2-4 entries are restyled marketing
    copy for a homepage preview, one AI pass further from ground truth.
    Fall back to `website_mockup.services` names only if no `research` is
    on file at all.
  - `usps` — soft/approximate, flag as such in the UI (not a hard
    1:1 field match like the four above): `research.strengths` ("what the
    current site/business does well") is the closest real signal to "what
    makes them different," but it's an approximation, not a verified USP
    list — worth prefilling since it's real observed data, not invented,
    but this is the one text field where the "prefilled, please review"
    framing matters most.
  - `existingWebsiteUrl` — **real, direct, and the mission brief's own
    assumption that nothing prefills this was wrong, verified against the
    actual schema**: `prospects.website` exists and is already carried
    forward to `clients.website_url` at conversion
    (`convertProspectToClient` sets `website_url: prospect.website || null`
    verbatim) — so this is actually one of the *most* reliable prefills
    available, sourced from the client row itself rather than the mockup
    or research at all.
  - **Honestly left blank, confirmed nothing upstream covers them**:
    `targetAudience` (no research field states an audience, only what the
    business does and its weaknesses — don't repurpose `business_summary`
    as a stand-in), `objectives` and `sitemapPages` (small fixed
    categorical/checkbox sets — nothing upstream tags a prospect against
    the six-option objectives list or the sitemap-page checklist, and
    inferring one from `ai_opportunities` text would be inventing a
    categorisation the AI never made), `designStyle`, `designColours`,
    `designFonts`, `designExamples` (no visual-design signal exists
    anywhere in the mockup or research pipeline — confirmed by reading
    both schemas in full), `contentNotes` (free text meant for the
    agency's own notes, not something to auto-populate from AI output).
- **Acceptance criteria**:
  - `createWebsiteProject`'s wizard has a second real entry point (button/
    link) reachable from a client that has a `source_lead_id` whose
    prospect has `website_mockup` and/or `research` set, distinct from the
    existing blank-state `/studio/website-builder/new` flow used today.
  - The prefill is a one-time, user-triggered population of the discovery
    form's local state — not a server-side default baked into
    `createWebsiteProject` itself, so a user can freely edit or clear any
    field before submitting, same as if they'd typed it.
  - Every prefilled field is visually distinguishable from a manually
    typed one at the moment the form opens (exact treatment is a UX/UI
    Director call, not decided here).
  - Fields with no real upstream source (`targetAudience`, `objectives`,
    `sitemapPages`, all four design fields, `contentNotes`) are never
    auto-populated with invented content.
  - No new database migration; `clients.source_lead_id` and
    `prospects.{website_mockup, research, business_name, category,
    neighbourhood, website}` are the only data sources, all already in
    production.
  - Ownership check: the source prospect/client lookup is scoped to the
    caller's own `org_id`, same pattern every other Server Action in this
    codebase uses — this is a read of another tenant's data if done wrong.
  - Tests cover: prefill population from a full mockup+research prospect;
    partial prefill when only one of mockup/research exists; no prefill
    offered at all for a client with no `source_lead_id` (manually-added
    client); the `research`-present-vs-absent branch for `servicesProducts`
    (prefer `research.services`, fall back to mockup service names).
  - `npx tsc --noEmit`, `npx eslint`, full `vitest` suite green.
- **Relevant agent**: ~~UX/UI Director (exact entry-point placement and the
  prefilled-field visual treatment)~~ done, 2026-09-03 — see
  `DECISIONS.md`'s matching entry for the placement/mechanism decisions
  and the UX/UI Director's handoff to Lead Engineer for the full
  field-by-field `WizardPrefill` spec, exact query changes, and search-
  param contract. ~~→ **Lead Engineer next** (build).~~ done, 2026-09-03 —
  see `DECISIONS.md`'s matching entry. → **QA Engineer next** (verify).
- **Dependencies**: none — every data source and column already exists in
  production; no approval-boundary item in this scope (see Product
  Director's handoff for the explicit statement that no migration, no
  payments, no destructive change, and no major architecture change is
  involved).
- **Status**: **Shipped and live-verified**, 2026-09-03 (commit `78d3678`,
  pushed and deployed) — `npx tsc --noEmit`, `npx eslint`, and the full
  `vitest` suite (424/424) all green, independently re-verified before
  push. Live-checked in a real authenticated Studio session (production,
  Claude-in-Chrome, no test/mock data): clicked "Start website build from
  prospect" on W Fitness's `ClientCard`, confirmed the URL carries
  `?client=...&prefill=1`, the accent banner reads the exact designed
  copy, `businessName`/`industry`/`location`/`existingWebsiteUrl`/
  `servicesProducts` all show the neutral "Prefilled" tag with real data
  (W Fitness / Gyms / Leeds / www.wfitness.co.uk / the real research
  services list), `usps` shows the visually distinct purple "Needs
  review" tag with real `research.strengths` content, `targetAudience`
  and the objectives checklist render honestly blank with no fake tag,
  every prefilled field confirmed genuinely editable (typed into
  Business name, value updated normally), zero console errors.

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
- **Visual-density review (2026-09-04)**: the live "Edinburgh solutions"
  account currently has zero scored prospects, so `top_prospects` never
  renders in production right now — nothing to screenshot live. Rendered
  the exact same JSX/Tailwind classes from `command-centre-section-cards.tsx`
  (lines 478-521) in a throwaway local route with 5 realistic dummy rows
  (deleted after, never committed) and screenshotted it in the real dark
  theme. Verdict: not visually noisy. The numbered badges plus 2-line text
  give each row a clear scan anchor, `space-y-3` gives real breathing room
  between rows, and the `compact` xs-button treatment stays visually
  secondary to the business name/score rather than competing with it —
  reads as an intentionally dense "top 5" list, not clutter. No further
  design changes needed.
- **Status**: Complete

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
