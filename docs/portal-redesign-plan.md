# HamishAI Internal Portal → AI Control Panel: Redesign Plan

Status: **Stages 1–3 complete** (commits `5d500cc`, `8f5da68`, `f78efb5`). Stages 4–7 not started. Written the same way `leads-automation-plan.md` and `teams-meeting-intelligence-plan.md` were: grounded in what's actually in the codebase today, not a hypothetical rebuild.

**Stage 2 shipped:** admin type scale (`.text-page-title`/`-subtitle`/`-section-title`/`-eyebrow`), dark mode wired up for the first time (the `.dark` token block already existed, complete and correct — just unreachable; `ThemeToggle` + `ThemeInitScript`, scoped to `/admin` only), a new `ai` Badge variant pairing with the existing `ai` Button variant, the `ai` Button variant applied to the actual AI-generation triggers (Research, Generate sales kit, Generate progress report) and deliberately *not* applied to the deterministic ones (Save to Gmail, Schedule Teams meeting, Run site check — none of these call Claude), and a new `FilterTabs` component replacing the filter-chip-as-tabs pattern, applied to all four filter rows on `/admin/leads` as the first instance.

**Stage 3 shipped:** the flat 9-item top-nav replaced with a grouped sidebar (Command Centre / Sales / Clients / Intelligence / Knowledge / Reference / System — deliberately not including entries for pages Stage 4/5 haven't built yet). `/admin` rebuilt as the Command Centre: every existing worklist (overdue invoices, awaiting-info requests, stale leads, site issues) preserved exactly, restructured under one "Needs your attention" heading, plus — from data that already existed, zero new LLM cost — a pipeline value + expected revenue stat (the "pipeline forecast" idea from Quick Win #4 in `leads-automation-plan.md`, planned then never built until now), a hot-leads count, meetings today, and a real AI activity feed reading `audit_log` entries already being written by this session's research/sales-kit/discovery/Teams work. Live-verified against the real dev server with real data (Craigie & Sons Joinery's actual overdue requests, the actual AI-discovered lead from earlier this session, correct relative timestamps).

Pausing here for a look before Stage 4 (Leads + Lead Detail) — that's a new page type, not just a restyle, worth confirming the sidebar/Command Centre direction lands before building more on top of it.

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
