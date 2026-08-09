# HamishAI Internal Portal → AI Control Panel: Redesign Plan

Status: **All 7 stages complete** (commits `5d500cc`, `8f5da68`, `f78efb5`, `ebc7a0c`, `f6b8190`, `b270887`, `c11a847`, and Stage 7's commit). Written the same way `leads-automation-plan.md` and `teams-meeting-intelligence-plan.md` were: grounded in what's actually in the codebase today, not a hypothetical rebuild.

**Stage 2 shipped:** admin type scale (`.text-page-title`/`-subtitle`/`-section-title`/`-eyebrow`), dark mode wired up for the first time (the `.dark` token block already existed, complete and correct — just unreachable; `ThemeToggle` + `ThemeInitScript`, scoped to `/admin` only), a new `ai` Badge variant pairing with the existing `ai` Button variant, the `ai` Button variant applied to the actual AI-generation triggers (Research, Generate sales kit, Generate progress report) and deliberately *not* applied to the deterministic ones (Save to Gmail, Schedule Teams meeting, Run site check — none of these call Claude), and a new `FilterTabs` component replacing the filter-chip-as-tabs pattern, applied to all four filter rows on `/admin/leads` as the first instance.

**Stage 3 shipped:** the flat 9-item top-nav replaced with a grouped sidebar (Command Centre / Sales / Clients / Intelligence / Knowledge / Reference / System — deliberately not including entries for pages Stage 4/5 haven't built yet). `/admin` rebuilt as the Command Centre: every existing worklist (overdue invoices, awaiting-info requests, stale leads, site issues) preserved exactly, restructured under one "Needs your attention" heading, plus — from data that already existed, zero new LLM cost — a pipeline value + expected revenue stat (the "pipeline forecast" idea from Quick Win #4 in `leads-automation-plan.md`, planned then never built until now), a hot-leads count, meetings today, and a real AI activity feed reading `audit_log` entries already being written by this session's research/sales-kit/discovery/Teams work. Live-verified against the real dev server with real data (Craigie & Sons Joinery's actual overdue requests, the actual AI-discovered lead from earlier this session, correct relative timestamps).

**Stage 4 shipped:** `/admin/leads` split into a scan surface and a workspace. The list page is now compact clickable cards (business name, AI-discovered/stale badges, category/neighbourhood/website, an italic AI-recommendation preview line, status + `ContactBadge`, and a meta row of score dots/est. value/conversion band/next meeting date) that link into a new `/admin/leads/[id]` detail page — the "complete AI account workspace" the brief asked for: Overview (contact-info edit forms, status buttons, delete — moved here from the list row), AI Intelligence (`ResearchLeadButton`, expanded by default), AI Actions (`SalesKitButton`, expanded by default, with explicit "nothing sends without you reviewing it" copy), Meetings (schedule + past meetings list), Communications (audit log filtered to actual email/call touches), Timeline (full audit log), and an "At a glance" sidebar (found date, est. value, conversion band, recommended services) plus a conditional "Why AI suggested this" card for AI-discovered leads. Every section reuses an existing component or server action as-is — this was an information-architecture change, not new functionality. Shared logic (`STATUSES`/`statusMeta`/`daysSince`/`isStaleLead`/`describeAuditEntry`/`ContactBadge`) extracted into `src/lib/lead-meta.ts` and `src/components/admin/contact-badge.tsx` so both pages read from one definition instead of two drifting copies. Live-verified against the real dev server with real data (115 real prospects, both the list cards and a real lead's detail page rendering correctly, all seven sections present, no runtime errors).

**Stage 5 shipped:** two new pages under a widened "Intelligence" nav section — `/admin/ai-activity`, a real cross-cutting feed unifying what the Stage 1 audit found scattered across seven places (research, sales kit, discovery, meeting scheduling, triage, auto-send, progress reports), filterable by Sales & leads / Client operations, each entry linking through to its lead or client; and `/admin/automation`, a genuine status view for all 6 cron jobs (Waiting / Completed / Needs attention / Failed, last run, next scheduled run, expandable recent-run history) — "Running" was deliberately not modelled, since every one of these crons is a single synchronous invocation lasting seconds with nothing real to observe mid-run. Closed two real gaps found while building this: `request.triaged`/`request.auto_sent`/`client.progress_report_generated` audit-log writes added to `triage-request.ts`/`project-report.ts` (those flows previously left zero trace anywhere), and a new `cron_runs` table + `recordCronRun()` helper wired into all 6 `/api/cron/*` routes (previously a cron's success left no record at all, only failure emailed an alert with no persisted history). Also fixed two real bugs surfaced in the process: `/admin` (Command Centre) and the new `/admin/automation` had no `searchParams`/dynamic-API usage, so Next was statically prerendering both at build time — a live status page frozen at build-time data is worse than not having one, fixed with `export const dynamic = "force-dynamic"` on both; and a day-boundary bug in the "next run" formatter (raw `(target - now) / 86400000` floor mislabelled anything under 24h away as "today" even when it had crossed midnight into tomorrow — fixed by comparing UTC calendar dates instead of elapsed milliseconds). Typecheck, lint, and build all clean; live-verified against the real dev server (both pages render with real data, nav updated, Automation correctly shows "Waiting" pre-migration and correct tomorrow/today labels post-fix).

**Stage 6 shipped:** the Stage 2 design system applied across the remaining pages — Clients (`.text-page-title`, `FilterTabs` replacing hand-rolled Badge+Link chips), Knowledge (same, plus a real bug: "Extract entries" is an AI call — `extractKnowledgeEntries()` — that was styled `outline` like a plain button; now the `ai` variant), Process and its two sub-pages (`.text-page-title`/`.text-section-title` throughout), Audit (`FilterTabs`), and Activity log (title utilities). The main event was Client detail — the Stage 1 audit's #5 ranked problem, "6+ sub-tools stacked with no anchor nav." Same forms, same server actions, same data, nothing new: just grouped into six real sections (Overview, AI Tools, Team, Requests, Tasks, Invoices) each under a `.text-section-title` heading, with a jump-to pill nav at the top (plain anchor links, no scroll-spy JS — a reorganization pass, not new functionality). The loose Status/maintenance-rate/subscription/analytics-toggle rows that used to float directly under the page header are now one coherent Overview card. Also caught "Run AI triage" using the plain default Button variant despite calling `triageRequest()` (a real Claude call) — now `ai`. While running a full lint sweep to verify this batch, found and fixed three pre-existing (not introduced by this stage) lint errors that a plain `next build` wasn't surfacing: a `Date.now()` purity violation in Client detail's task list (same `isFuture()`-style named-helper fix as Stage 4/5) and two unescaped apostrophes on the Process pages. Typecheck, lint (both the changed-files pass and a full sweep of `src/app/admin/**` + `src/components/admin/**`, confirming only the two known pre-existing `any` errors in `leads/page.tsx` remain), and production build all clean. Live-verified against the real dev server: Clients list and Knowledge render correctly with real data, the "Extract entries" button now reads as AI, and Client detail's anchor nav was tested by clicking through to the Invoices section and confirming correct scroll-offset positioning.

**Stage 7 shipped — the final stage.** Command palette: `Cmd/Ctrl+K` (or the visible "Search ⌘K" header button) opens a jump-to-anything overlay — every nav destination instantly (reads `NAV_SECTIONS`, the same list the sidebar renders, so there's no second copy to drift), plus live lead/client search-as-you-type against a new thin `/api/internal/command-search` endpoint (debounced 250ms, 2-character minimum, no AI involved — this is a lookup, not a feature that needs a Claude call). Arrow keys to navigate, Enter to jump, Escape to close, click-through works too. This is the "designed to eventually become an AI command interface" entry point the brief asked for — search-and-jump only for now, command execution is a later step once there's an actual set of actions worth exposing here.

Responsive pass: live-tested every touched page at tablet (768px) and mobile (375px) widths against the real dev server rather than guessing. Most of the app was already solid at both — the audit's "reasonable 2-col desktop / 1-col everything else collapsing" held up under actual testing, nothing was found broken, clipped, or overflowing. Found one genuine, testable improvement: five dual-column form+list / worklist+activity layouts (Leads, Clients, Knowledge, Client detail's AI Tools/Requests/Invoices sections, and the Command Centre's own two-column layout) were splitting at `lg:` (1024px), meaning tablet users had to scroll past an entire form before reaching the list it sat beside. Moved to `md:` (768px) after confirming visually at each one that the narrower columns stayed legible — tablet now gets real side-by-side use of its width instead of an unnecessary mobile-style single column.

Per-route loading states: a shared `src/components/admin/skeleton.tsx` (four composable pieces — header, stat row, list rows, card grid) replaced the single generic 3-card skeleton that every route fell back to regardless of actual shape. Six routes got a loading.tsx matching their real layout — Command Centre, Leads list, Lead detail, Clients list, Client detail (including the six-section anchor nav), and Automation's card grid; every other route still falls back to the shared `(authed)/loading.tsx`, now shaped like the Command Centre (the most-visited page) rather than an arbitrary generic placeholder.

Typecheck, lint (targeted files clean; a full sweep of `src/app/admin/**` + `src/components/admin/**` again confirms only the two known pre-existing `any` errors in `leads/page.tsx`), and production build all clean. Live-verified against the real dev server: the palette opens via both the shortcut and the button, live-searches real client data ("Craigie" → Craigie & Sons Joinery), and both click-through and keyboard Enter navigation confirmed working; the five `md:` breakpoint changes were each visually confirmed at 768px before and after; mobile (375px) re-checked after the breakpoint changes to confirm no regression.

**The full 7-stage redesign is done.** `/admin` is now genuinely AI-native throughout — the `ai` visual language applied consistently, a real Command Centre, a real AI Activity feed, a real Automation status view, a restructured Lead workspace and Client workspace, a working command palette, and tablet-aware layouts. Everything reused existing components, server actions, and data as the brief asked; the net-new surface area is two pages (AI Activity, Automation), one workspace page (Lead detail), a handful of small extraction libraries, and the polish layer built this stage — not a rewrite.

Scope: `/admin/*` only — the password-gated internal operations tool. `/portal` (the client-facing self-service area) is a separate surface and out of scope here.

---

## 0. What already exists (condensed audit)

### Pages

| Page | What it does today |
|---|---|
| `/admin` (Overview) | Four parallel worklists — overdue invoices, requests awaiting info, stale leads, site issues — each with a hardcoded "critical" threshold. A pure worklist: no trend, no pipeline value, no AI activity, nothing that isn't currently overdue or broken. |
| `/admin/clients` | Add-client form permanently docked beside a filterable list (status chips only, no search). |
| `/admin/clients/[id]` | The densest page in the portal — 6+ distinct sub-tools stacked vertically with no anchor nav: status toggle, maintenance-rate editor, Stripe subscription, analytics toggle, progress-report/site-check AI actions, team members, requests, tasks, invoices. |
| `/admin/leads` | Already substantially rebuilt this session (research, sales kit, Teams scheduling, pipeline widgets, "Do this next"/"New this week" queues) — see `leads-automation-plan.md`. No dedicated lead detail page yet; everything renders inline on the list. |
| `/admin/knowledge` | Manual entry form + AI document-import pipeline, flat unfiled list, no search. |
| `/admin/process`, `/process/documentation`, `/process/client-requirements` | Static reference/sales-enablement content living inside the authenticated app — no live data. |
| `/admin/audit` | Human review of AI auto-sent replies (thumbs up/down, accuracy rate) — the closest thing that exists today to an "AI performance" view. |
| `/admin/activity-log` | Flat `audit_log` read, hardcoded label map, no filtering UI, no grouping by day. |
| `/admin/google-setup`, `/admin/ms-setup` | Near-duplicate OAuth status pages — proof-of-life lists for the inbox-triage/calendar-sync and Teams-scheduling automations. |
| `/admin/requests/[id]` | The AI triage output viewer (category/complexity/priority/coverage/draft response) — plain stacked cards, no distinct "AI content" treatment beyond one violet label. |

### Component library

A real, consistent token system exists (`Card` — ring-style boundary not border, `Badge` — 9 semantic variants, consistent radius scale) but **almost no admin-specific composite components**. The same patterns are hand-rolled 4–6 times over instead of extracted:

- **5 near-identical "AI async action" components** (`research-lead-button`, `sales-kit-button`, `schedule-teams-meeting-button`, `progress-report-button`, `site-check-button`) — each its own loading/error/result state machine.
- **Filter-chip-as-tabs**, reinvented 4 times (Overview, Clients, Leads, Audit) as `Badge` + `Link`, despite a real `Tabs`-capable primitive existing unused.
- **"Settings toggle row"** pattern repeated 4+ times on client detail with drifting spacing each time.
- A `selectClasses` Tailwind string constant copy-pasted verbatim across 2+ files instead of a shared `Select`.

### Design system foundation (`globals.css`)

Better than the pages built on it suggest. Already has:
- A real OKLCH palette — cool grey-blue background, "Signal Blue" accent, a deliberate terracotta/clay warmth accent doing double duty as `--warning`, restrained not decorative.
- A **complete, unused dark mode** — full `.dark` block, correctly flipped values, zero toggle anywhere in the app. Dead code, but genuinely close to free.
- A dedicated **"AI content" visual language that already exists but is barely applied**: `--gradient-violet` + a purpose-built `ai` Button variant, explicitly commented "reserved... so this colour stays a learned signal rather than decoration" — yet almost every AI-triggered button in the app uses plain `outline` + a `Sparkles` icon instead of it.
- Fraunces (headings) / DM Sans (body) / IBM Plex Mono (eyebrow labels) — no documented type scale, every page hand-picks its own heading size.
- No `<table>` elements anywhere — every list is `<li>` stacks, which is mobile-friendly by accident but gives a power user no dense/scannable view.

### Data model powering all of this

`clients`, `prospects` (+ the separate, seemingly-legacy `leads` table used only by the marketing site's contact form — worth a decision, not a redesign concern), `requests`, `tasks`, `invoices`, `site_checks`, `client_members`, `knowledge_base`, `audit_log`, `processed_emails`, `ms_graph_tokens`, `lead_meetings` — plus everything already built this session for leads (`research`, `sales_kit`, `discovery_source`). Nothing here needs to change for a redesign; it's the substrate.

### Responsive handling

Mobile nav drawer exists and works. The whole authenticated shell is capped at `max-w-5xl` — desktop is already fairly constrained, not full-bleed. No `xl:` breakpoint usage anywhere. Reasonable "2-col desktop / 1-col everything else" collapsing, not distinct tablet treatment.

---

## 1. The biggest UX problems, ranked

1. **There's no real home.** Overview is four worklists, not a command centre — no pipeline value, no "what has AI done," no sense of the business's current state versus just its current backlog. This is the brief's central ask and today's biggest gap.
2. **AI activity is invisible and scattered.** Research findings, sales kits, triage output, the auto-send audit, and the Google/Microsoft proof-of-life pages are five unconnected places, styled five different ways. The visual language for "this is AI" (`--gradient-violet`, the `ai` button variant) already exists in the CSS — it's just not used consistently enough to read as a system.
3. **No consistent human-in-the-loop pattern.** Sales-kit emails and call scripts already work this way in substance (generate → review → Save/Send is implicitly an approval step) but nothing frames it that way visually — there's no "AI generated this → Approve / Edit / Regenerate" convention repeated across the app the way the brief asks for.
4. **Repeated-but-not-abstracted patterns are a real cost, not just a style complaint.** 5 hand-rolled AI-action state machines, 4 hand-rolled tab bars, 4+ drifting settings-row layouts — a real design system pass fixes the UX *and* the maintenance burden in the same motion.
5. **Client detail is an unstructured mega-scroll.** The single most important page for an active, paying client has 6+ sub-tools stacked with no anchor nav — the opposite of "understand within seconds."
6. **Navigation is flat and mixes altitudes.** Overview / Clients / Leads / Knowledge / Google / Microsoft / Process / Audit / Activity puts core workflow (Clients, Leads), integration plumbing (Google, Microsoft), and static reference material (Process) all at the same level with no grouping.
7. **Dark mode is fully built and completely unreachable.** A real, already-paid-for win sitting dormant.
8. **No command palette, no keyboard shortcuts** — explicitly asked for, currently absent entirely.
9. **No dedicated Lead Detail page.** Leads already have rich data (research, sales kit, meetings, pipeline signals) but it all lives inline on the list — the brief specifically asks for a proper Overview/AI Intelligence/Timeline/Meetings/Communications/AI Actions/Human Actions workspace per lead.

---

## 2. What stays exactly as it is

Everything under `src/lib/`, every Supabase table, every server action, every cron job, and the token foundation itself (OKLCH palette, Fraunces/DM Sans/Plex Mono, `--card-spacing`, the radius scale, the ring-style Card boundary). This is a UI and information-architecture pass over existing, working functionality — not a rewrite. Where the brief's own principle applies directly: *reuse existing components and functionality where sensible.*

---

## 3. Proposed direction for Stages 2–7

- **Stage 2 — Design system.** Formalize a real type scale; extract the repeated patterns into actual components (`AsyncActionCard`, `SettingsRow`, `FilterTabs`, `ListRow`, `StatusPill`); wire up the dark-mode toggle that's already 90% built; make the `ai`/`--gradient-violet` "this is AI" language the *only* way AI content is marked, applied consistently everywhere it currently isn't.
- **Stage 3 — Navigation + Command Centre.** New nav grouping (proposed below) + a real home view: today's priorities, pipeline value, AI activity feed, an approvals queue — built from data that already exists (`prospects`, `sales_kit`, `research`, `audit_log`, `lead_meetings`), not new AI calls.
- **Stage 4 — Leads + Lead Detail.** Elevate the leads workspace already built this session into a proper dedicated detail page (Overview / AI Intelligence / Timeline / Meetings / Communications / AI Actions / Human Actions), reusing every existing component (`ResearchLeadButton`, `SalesKitButton`, `ScheduleTeamsMeetingButton`) rather than rebuilding them.
- **Stage 5 — AI Activity + Automation.** One real cross-cutting view unifying what's scattered today (research, sales kit, triage, auto-send audit, Google/Microsoft proof-of-life) plus a genuine automation-status view (running/completed/waiting/failed/requires-approval) across the 6 existing cron jobs.
- **Stage 6 — Everywhere else.** Clients, Client detail (restructured into real sections, not a mega-scroll), Knowledge, Process, Audit, Activity log — apply the Stage 2 system, no new functionality.
- **Stage 7 — Polish.** Command palette, keyboard shortcuts, responsive pass, loading states per route instead of one generic skeleton.

---

## 4. Proposed navigation

The brief's own example groups by altitude the way the current nav's flat list doesn't — but a couple of its groupings don't match what actually exists here (there's no separate "Pipeline" data model from "Leads," no "Workflows/AI Agents" concept, "Proposals" is a sales-kit output not a first-class object). Proposed instead, grounded in what's actually in this codebase:

```
Command Centre     — the new home (Stage 3)
Sales
  Leads            — /admin/leads (already rich)
  Lead detail       — new, per-lead (Stage 4)
Clients
  Clients          — /admin/clients
  Client detail    — restructured (Stage 6)
Intelligence
  AI Activity       — new, cross-cutting feed (Stage 5)
  Automation         — new, cron/integration status (Stage 5)
  Audit              — existing auto-send QA page, relocated here
Knowledge            — /admin/knowledge (unchanged location)
Reference
  Process            — the existing static pages, grouped out of the primary nav
System
  Integrations       — Google + Microsoft setup, merged under one entry
  Activity log        — existing, unchanged
```

---

## 5. Open questions before Stage 2 starts

1. **Pacing** — work through Stages 2–7 in this session in order, or would you rather see Stage 2 (the design system + extracted components) on its own before I touch any page layout?
2. **Command Centre scope** — replace `/admin` entirely, or build it as a genuinely new page and repoint the nav, leaving the current Overview reachable if you want to compare?
3. **Dark mode** — worth wiring up now as part of Stage 2 (it's already built), or leave it for later since it's not something you asked for directly?

I'll hold here rather than start writing component code until you've weighed in on those three — the brief itself asks for the problem diagnosis before implementation, and this is genuinely a multi-session scope.
