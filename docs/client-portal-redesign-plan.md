# Client Portal Redesign: Audit + Plan

Status: **All 4 roadmap phases shipped and live-verified.** The audit + 10 deliverables the brief asked for are below, written before any code changed. Written the same way `portal-redesign-plan.md` (the internal admin redesign) and `deep-research-pipeline-plan.md` were: grounded in what's actually in the codebase, not a hypothetical rebuild. Documents and Meetings (Phases 5/6) remain deliberately out of scope — see §10 and the Phase 4 write-up for why.

Scope: `/portal/*` only — the standalone, client-facing self-service area at `hamishai.org/portal`, entirely separate code from `/admin`. Confirmed not confusing the two.

**Current real-world scale: 2 test clients** (Craigie & Sons Joinery, Ellis Home Bakery) — no real paying clients using the portal yet. Worth knowing up front — there's real freedom to redesign boldly here.

## Phase 1 — what actually shipped

Design system + dark mode + nav, ported from the internal admin's Stage 2/3 exactly as planned: `.text-page-title`/`-subtitle`/`-section-title`/`-eyebrow` type scale applied across every page header, the `ai` Button variant on the AI-calling "Ask" button, a portal-scoped dark mode (`PortalThemeToggle`/`PortalThemeInitScript`, own `localStorage` key so it's independent of the admin's), and the flat 6-item top-nav replaced with a grouped sidebar (`Home` / `Work` → Requests, Insights / `Account` → Billing, Help, Settings) — "Ask HamishAI" deliberately not in the nav yet, same discipline the admin sidebar followed: no entry for a page Phase 3 hasn't built.

**A real, severe, pre-existing bug found and fixed while verifying this live** — unrelated to the redesign itself. `client_members_select_team` (`schema-portal-settings.sql`, added for the Settings page's team list) is a Postgres RLS policy on `client_members` whose own `USING` clause queries `client_members` again — infinite recursion (Postgres error `42P17`), on every single session-scoped read of that table. Since `getPortalMembership()` (the function every portal page calls to resolve a signed-in session to a client) depends on exactly that read, **no one could sign into the portal at all** until this was fixed. Found by generating a real test session via `supabase.auth.admin.generateLink()` to verify Phase 1's changes, and confirmed root-cause via a temporary debug route (deleted after use) that surfaced the raw Postgres error. Fixed in `supabase/schema-fix-client-members-recursion.sql` — moves the "which client_ids does this email belong to" lookup into a `SECURITY DEFINER` function (bypasses RLS for its own internal query, breaking the recursion cycle), with `search_path` explicitly pinned per Postgres's own guidance for that function type. Applied and confirmed working — a real test login now succeeds, and the Settings page's Team list (which depends on the exact policy that was broken) renders correctly.

Also fixed in the same pass: the Insights page's hero panel (`InsightsCentre`) hardcodes `bg-primary`/`text-primary-foreground` to stay "always a dark console," which worked by coincidence when the portal had no dark mode — `--primary` is a semantic token that deliberately inverts under `.dark` (correct for a button, wrong for a panel meant to always read as dark). Adding dark mode exposed this immediately: toggling dark mode turned the Insights panel into a jarring light rectangle on a dark page. Fixed by pinning `--primary`/`--primary-foreground` to their light-mode values via an inline style scoped to just that component's subtree, so every existing `bg-primary`/`text-primary-foreground`/`primary-foreground/NN%` usage inside it keeps working unchanged, in both portal themes.

Typecheck, lint (`src/app/portal/**`, `src/components/portal/**`), and production build all clean. Live-verified end to end against the real dev server with a real generated test session: sidebar renders and groups correctly, dark mode toggles cleanly across every page (Home, Requests, Billing, Insights, Help, Settings) with no regressions, the Insights panel now stays visually stable in both themes, and Settings' Team list (the RLS fix's own test case) renders real data correctly.

## Phase 2 — what actually shipped

The Home page rebuilt as the personalised dashboard the brief asks for, per §5/§6: a time-of-day greeting + an honest one-line status ("You have N things that need your attention" / "We're working on N things for you" / "You're all caught up"), a real **Your Actions** list (every `awaiting_info` request and every overdue invoice, each linking straight to where it's actioned — not just a stat-card count), and a **HamishAI is working on** section (real in-progress tasks, a real auto-reply count, a real "last checked" site-monitoring line) — replacing the old 4-card KPI grid with the narrative-plus-actions shape the brief explicitly asked for instead of it.

Deliberately does **not** call `buildPortalInsights()` (the function the Insights page uses) — that function re-fetches requests/tasks/invoices/site_checks itself and computes a full 12-month trend + demand-pattern pass; paying for that twice on the single most-loaded page in the portal just to reuse a couple of counts isn't worth it. Home does its own light, targeted queries instead — the same "deliberately lean, not the full computation" principle `getRecentPortalEvents()` already established for the header's notification bell, applied a second time rather than introduced fresh.

No literal project/milestone UI, per the confirmed decision — progress is communicated honestly through real request/task state instead.

Typecheck, lint, and production build all clean. Live-verified against the real dev server with the same generated test session: Home renders the real 7-item Your Actions list, the real in-progress task and auto-reply-count lines, in both light and dark mode with no regressions. The empty ("all caught up") state is a simple, low-risk ternary using the same pattern already proven elsewhere in the portal — not independently live-tested, since the only client with portal access set up (Craigie & Sons Joinery) currently has real outstanding items, and forcing the empty path would have meant mutating real test data.

## Phase 3 — what actually shipped

The real AI Copilot promoted to its own page (`/portal/ask`), reachable from a new sidebar entry — no code rewritten, `CopilotTab`'s exact chat logic extracted verbatim out of `insights-centre.tsx` into a standalone `AiCopilot` component (`src/components/portal/ai-copilot.tsx`), still talking to the same `/api/portal/copilot` → `answerAccountQuestion` backend as before. The Insights page's own "AI Copilot" tab was removed rather than kept as a second copy — a duplicate chat surface would mean two independent, un-synced conversations (the brief's "one clear AI entry point" problem all over again, just with the strong version instead of the weak one this time) — replaced with a small "Have a question about this data? Ask HamishAI →" link to the same page instead.

The weaker duplicate retired for real, per the confirmed decision: `AskSupportAgent` (the knowledge-base-only, no-conversation-history Q&A box) removed from both Home and Help, along with its entire call chain — `askQuestion`/`AskState` (`src/app/portal/actions.ts`, now deleted) and `answerQuestion()` (`src/lib/answer-question.ts`, now deleted). Home's old box is now a compact "Ask HamishAI" promo card linking to `/portal/ask`. Help keeps only its FAQ accordion, with a "Still stuck? Ask HamishAI" link at the bottom for anything the FAQ doesn't cover.

Typecheck, lint (targeted files plus a full sweep of every portal page/component and the four `portal-*`/`answer-account-question` lib files), and production build all clean. Live-verified end to end against the real dev server with the same generated test session: sent a real message ("How many requests do I have open?") from the new `/portal/ask` page and got back a correct, real-data answer ("You've got 9 requests open right now: 7 waiting for your input and 2 that are in progress"); confirmed Insights now shows only 3 tabs with a working link to `/portal/ask`; confirmed Home's and Help's new promo cards render and link correctly, in dark mode throughout.

## Phase 4 — what actually shipped

Requests, Billing, and Settings brought fully in line with the design system — same data, same functionality, matching the internal admin's Stage 6 approach exactly.

Requests' hand-rolled status filter (`Badge` + `Link`, its own active-state comparison) replaced with `FilterTabs` — the same component the internal admin uses. That meant relocating it first: `FilterTabs` had lived under `src/components/admin/` despite having no admin-specific coupling (confirmed by its own file comment, which already listed "Overview, Clients, Leads, Audit" as 4 separate hand-rolled copies it replaced — one more hand-rolled copy about to appear in the portal was the signal it belonged somewhere genuinely shared). Moved to `src/components/ui/filter-tabs.tsx`; all 4 existing internal-admin import sites updated to match, behaviour unchanged.

Billing gained an "Invoice history" section heading (`.text-section-title`) above its invoice list — every other list on both portals has one, Billing's was the one page missing it. Settings was reviewed and left as-is: already fully on the design system from Phase 1, nothing to change.

Typecheck, lint (targeted files plus every internal-admin page importing `FilterTabs`), and production build all clean. Live-verified against the real dev server: Requests' filter tabs render with correct counts and correctly filter the list on click (confirmed "Needs your input" both highlights as active and narrows the list to exactly those requests); all 4 internal-admin pages using the relocated `FilterTabs` (`/admin/leads`, `/admin/clients`, `/admin/audit`, `/admin/ai-activity`) confirmed still returning 200 with real filter content rendering; Billing's new heading confirmed rendering correctly in dark mode alongside the real Stripe invoice data.

**All 4 phases from the original roadmap are now complete.** Documents (needs new schema + storage) and Meetings (blocked on the same M365 licensing decision as the internal Teams work) remain deliberately out of scope — flagged in the original audit as real gaps, not silently built as stubs that couldn't actually work.

---

## 1. Audit of the existing client portal

### Pages (`src/app/portal/`)

| Route | What it does today |
|---|---|
| `/portal/login` | Magic-link sign-in (Supabase `signInWithOtp`), no password. |
| `/portal` (Overview) | 4 stat cards (needs input / in progress / next invoice / site status), a one-shot "Ask a question" box, a 3-item recent-requests list. |
| `/portal/requests` | A submission form (free text → `triageRequest()`, the same AI triage pipeline `/admin` uses) + a flat, filterable list of every request and its linked tasks. |
| `/portal/billing` | 3 stat cards (paid this year / outstanding / next due), a Stripe "Manage billing" portal-session link, a flat invoice list. |
| `/portal/insights` | The most-built page by far — see §1.3. |
| `/portal/help` | The same one-shot "Ask a question" box (duplicated from Overview) + an FAQ accordion from `knowledge_base`. |
| `/portal/settings` | Organisation name (read-only), a weekly-digest email toggle, a read-only team list. |

Six items on one flat top-nav row (Overview / Requests / Billing / Insights / Help / Settings) — the exact "flat, mixes altitudes" shape the internal admin's nav had before its Stage 3 sidebar redesign.

### Authentication & authorisation

Solid, and already properly layered — no changes needed to the architecture itself:
- **Auth**: Supabase magic-link (`signInWithOtp`), no password anywhere.
- **Multi-user per client**: `client_members` (schema-client-members.sql) — more than one person per business can have their own login, resolved via `getPortalMembership()` (`src/lib/portal-membership.ts`).
- **Tenant isolation**: real Postgres RLS on every table the portal reads (`schema-rls-portal.sql`, superseded/extended by `schema-client-members.sql` and `schema-portal-settings.sql`), keyed off `client_members.email = auth.jwt()->>'email'`. This is a second, database-level enforcement layer independent of the `.eq("client_id", ...)` filters already in application code — a bug in the app code alone couldn't leak another client's row. Genuinely well-built; the redesign should keep using session-scoped Supabase clients for every portal read, exactly as today.

### 1.1 The real data model — this matters more than anything else below

The brief's target experience assumes **projects** with **phases and milestones** (Discovery → Design → Development → Review → Launch). That concept **does not exist anywhere in the schema.** What actually exists:

- `clients` — one row per business (name, package, maintenance plan, website, Stripe IDs). No phase/status-of-project field.
- `requests` — flat: raw text → AI-triaged (category, complexity, priority, covered-by-maintenance, draft response) → a status (`new` / `awaiting_info` / `triaged` / done via linked tasks).
- `tasks` — linked to a request, a flat `todo`/`in_progress`/`done`.
- `invoices` — real, Stripe-backed.
- `site_checks` — real uptime/SSL/broken-link/AI-summary checks, client-scoped.
- No `documents`/`files` table anywhere.
- No client-facing meetings table — `lead_meetings` exists but is scoped to `prospect_id` (pre-sale leads), not `client_id` (paying clients). Building real client meetings needs new schema *and* runs into the same blocker as the paused internal Teams work (§8).

**Implication for the redesign**: a "Project Workspace" with literal named milestones (Discovery ✓ / Design ✓ / Development ✓ / Client Review ● / Launch ○) would mean either (a) fabricating phase labels with no real data behind them — which cuts directly against the one principle `portal-insights-data.ts` was built on and comments extensively ("no fabricated revenue, bookings, or peer-benchmark figures... this is NOT the illustrative demo shown to prospects") — or (b) adding a small, genuinely new field (e.g. `clients.current_phase`, manually set by Hamish) that *is* real, just newly introduced. I'd recommend (b), scoped small, and only if Hamish actually wants to track and update a phase label per client — not assumed. Everything else "project workspace"-shaped can honestly be built from what already exists: requests/tasks *are* the real unit of work, and their real state (Received → In Progress → Awaiting Your Input → Done) is a truthful progress signal without inventing anything.

### 1.2 A fully-built AI copilot already exists — and is almost invisible

This is the single biggest finding. Two separate AI question-answering paths exist today:

1. **`AskSupportAgent`** (`src/components/portal/ask-support-agent.tsx`) — a one-shot form, no conversation history, answers only from `knowledge_base` (general FAQ content). Backed by `answerQuestion()` → `src/lib/answer-question.ts`. **Duplicated on both the Home page and the Help page** — the same box, twice.
2. **The real AI Copilot** (`CopilotTab` inside `src/components/portal/insights-centre.tsx`) — a genuine multi-turn chat UI (message history, typing indicator, suggested prompts), backed by `/api/portal/copilot` → `src/lib/answer-account-question.ts`, which has access to **the client's actual account data** — request counts/status, health score, spend by month, category breakdown, uptime — exactly what the brief's "Ask HamishAI" examples ask for ("What stage is my website at?", real numbers, not FAQ text). Properly rate-limited, properly RLS-scoped.

The powerful one is buried as the 2nd of 4 tabs inside the Insights page. The weak one is surfaced twice. This is close to the single highest-leverage, lowest-risk win available: **promote the real copilot to a first-class, prominent surface (the brief's "Ask HamishAI"), and retire the duplicate weak one** rather than building a new AI chat from scratch.

### 1.3 The Insights page is already close to the target aesthetic — and an isolated island

`InsightsCentre` (dark `bg-primary` hero panel, pulse-dot "live" indicators, health rings, mono-uppercase tracked labels, real tabbed sub-navigation, an actual chat UI) is genuinely close to "premium AI SaaS product." It's explicitly built as the *honest, real-data* version of the marketing site's illustrative demo (`src/app/(site)/analytics/page.tsx`) — same visual language, real numbers, and careful "not enough data yet" empty states instead of fabricated placeholders.

The problem: **it's the only page that looks like this.** Home, Requests, Billing, Help, and Settings are all a plain light `Card`-grid style with a flat top-nav — closer to the internal admin's *pre-redesign* look than its Stage 2+ design system. There's no dark mode toggle anywhere in the portal (the internal admin got one in Stage 2). The redesign's job is less "invent a new premium look" and more "take the look that already exists on one page and make it the whole portal's design system" — while also bringing over the *internal admin's* Stage 2 tokens (`.text-page-title` scale, the `ai` Button/Badge variant, `FilterTabs`) so the two portals genuinely share one visual language, per the brief's explicit ask.

### What's good (keep, reuse)

- Auth/RLS architecture — no changes needed.
- The AI triage pipeline behind request submission (`triageRequest()`) — same engine `/admin` uses, already good.
- `buildPortalInsights()` — a real, honest, non-fabricated analytics engine. Reuse as-is; it's the redesign's data source, not something to rebuild.
- The real AI Copilot backend (`answerAccountQuestion`) — reuse and promote, don't rebuild.
- Stripe billing integration — real, working, keep as-is.
- The weekly-digest email preference + notification-bell pattern — sound approach, needs visual/IA polish only.

### What's dated / confusing / thin

- Flat top-nav mixing altitudes (same problem the internal admin fixed in Stage 3).
- No dark mode.
- Two different visual languages on one product (Insights vs. everything else).
- The AI copilot is real but effectively hidden; a weaker duplicate is shown twice instead.
- The Home page is a stat-card grid, not the personalised "here's what's happening" narrative the brief (and the internal admin's Command Centre) asks for.
- Notifications: every event renders with the same green checkmark regardless of type — no severity/action-needed differentiation (the brief's 🔵/🟢/🟡 distinction).
- No "your actions" surface — the closest thing is one stat card ("Needs your input"), not a real actionable list.
- No documents section (no backing data yet — see §8).
- No meetings section (no backing data yet, same root cause as the internal portal's paused Teams work — see §8).

---

## 2. Current vs proposed experience

| | Today | Proposed |
|---|---|---|
| Home | 4 generic stat cards + duplicate Q&A box + 3-item list | Personalised narrative Home — "Good morning, {name}. Here's what's happening", real next-action, real AI-activity summary, reusing exactly the data `buildPortalInsights()` already computes |
| Navigation | Flat 6-item top-nav | Grouped, altitude-aware nav (see §3) — fewer top-level items, matching what actually exists (no fake "Projects" section with milestones that don't exist) |
| AI | Hidden inside a tab; duplicated weak FAQ box elsewhere | One prominent "Ask HamishAI" surface everywhere it's useful, backed by the real account-aware copilot |
| Requests | Flat list, one giant "everything" page | Kept as the real unit of work (no fake "projects"), but visually elevated with the design system, better status language, and a proper detail view |
| Insights | The one polished page, isolated | Its visual language becomes the *portal's* design system, not a one-off |
| Design system | Diverges from internal admin | Same type scale, same `ai` badge/button language, same dark mode, matching the internal admin's Stage 2 system |
| Documents/Meetings | Don't exist | Honestly scoped: documents needs new schema (small), meetings needs the same M365 licensing Hamish already paused on — flagged, not silently built as a fake stub |

---

## 3. Recommended information architecture

The brief's own suggested nav (Home / Projects / AI Insights / Meetings / Messages / Documents / Account) doesn't match what's real — no Projects entity, no Documents table, Meetings blocked. Proposed instead, grounded in what exists and what's realistically buildable:

```
Home           — the new personalised dashboard (replaces Overview)
Requests       — kept (it's the real unit of work), elevated with the design system
Insights       — kept, becomes the portal's design-system reference point
Ask HamishAI   — the real copilot, promoted to its own top-level entry (not buried in a tab)
Billing        — kept, unchanged data, redesigned surface
Help           — kept, FAQ only (AskSupportAgent's duplicate role removed — Ask HamishAI supersedes it)
Settings       — kept, unchanged data, redesigned surface
```

Documents and Meetings are **not** in this nav — see §8 for why, and what it'd take to add them for real.

---

## 4. Design system — reuse the internal admin's, don't invent a new one

Directly ports what already shipped in the internal admin's Stage 2 (`docs/portal-redesign-plan.md`), scoped down:

- `.text-page-title` / `.text-page-subtitle` / `.text-section-title` / `.text-eyebrow` — same utility classes, already in `globals.css`, shared across both portals since it's one Tailwind config for the whole app.
- The `ai` Button/Badge variant (`--gradient-violet`) as the *only* "this is AI" signal — applied to Ask HamishAI's entry points and the Insights AI-generated content, exactly the same convention as the internal admin's Research/Generate buttons.
- Dark mode — port `ThemeToggle`/`ThemeInitScript` (currently `src/components/admin/theme-toggle.tsx`) into a portal-scoped equivalent with its own `localStorage` key (`hamishai-portal-theme`, not `-admin-theme`, since these are different users on different domains-of-trust).
- `Card`, `Badge`, `Button`, `FilterTabs` — same components, already shared (`src/components/ui/*` isn't admin-specific).
- The Insights page's dark hero-panel treatment, pulse-dot live indicators, and health rings become patterns available portal-wide, not Insights-only.

---

## 5. Key screens to redesign

1. **Home** — personalised narrative dashboard, "Your Actions" list, AI activity summary, next-action callout.
2. **Ask HamishAI** — the real copilot promoted to a first-class page/panel, not a buried tab.
3. **Requests** (list + new detail view) — elevated visual treatment, honest status language instead of raw enum values.
4. **Insights** — light touch: extend its existing language portal-wide rather than rebuild it.
5. **Billing, Help, Settings** — design-system pass (matches internal admin's Stage 6 approach — apply the system, no functional rewrite).

---

## 6. New client workflows

- **"Your Actions"** — a real, central list (not just a stat-card count) of everything genuinely waiting on the client: requests in `awaiting_info`, unpaid overdue invoices, anything else with a concrete client-side action. Built entirely from existing data, zero new schema.
- **Ask HamishAI, promoted** — reachable from Home and everywhere else, not just inside Insights.
- Approval-style UI (Approve / Request changes) is **not** proposed yet — there's no design/document artifact in the data model for a client to approve today (no documents table). Flagged for Phase 2+, not built against nothing.

---

## 7. AI opportunities (grounded in what's real)

- Promote the existing copilot — the highest-leverage, already-built opportunity.
- Extend `buildPortalInsights()`'s "Living insights" (already real, already honest) as the source for a Home-page "AI is working on this" summary — no new AI calls, this data is already computed.
- Longer-term (not this redesign): AI-generated weekly summaries, AI-drafted proposal/report documents once a documents table exists. Flagged for a future phase, consistent with the brief's "Future Vision" section — not built speculatively now.

---

## 8. Technical architecture changes

- **Minimal new schema for Phase 1**: none required — Home, Ask HamishAI promotion, Requests/Billing/Help/Settings redesign, and dark mode all run on data that already exists.
- **Documents**: needs a new `documents` table (client_id, type, title, file URL, uploaded_at) plus storage (Supabase Storage or similar) — real scope, not a Phase 1 item.
- **Meetings**: needs a `client_meetings` table (the same shape as `lead_meetings` but keyed to `client_id`) *and* a licensed Microsoft 365 mailbox for Hamish, which is the exact same blocker `docs/teams-meeting-intelligence-plan.md` paused on in this session over cost (~£64/yr). Not buildable until that's revisited — flagging honestly rather than building a section that can't actually work.
- **Dark mode**: one new client component (`portal-theme-toggle.tsx`), one new `localStorage` key, no schema change.

## 9. Security considerations

Already strong — RLS on every table, session-scoped Supabase clients throughout, rate-limited AI endpoints, column-level grants restricting what a client can even attempt to write. The redesign's job here is to **not regress this**: every new/changed portal page must keep using `createServerSupabaseClient()` (session-scoped) for reads, never the service-role client, exactly as every existing page does. No new write surfaces are proposed in Phase 1 beyond what already exists (the notification-preference toggle).

---

## 10. Implementation roadmap

Mirrors how both other redesigns this session were run — staged, verified and checked in at each boundary, not one giant change.

- **Phase 1 — Design system + nav. ✅ Shipped.** See the write-up at the top of this doc, including the two real bugs found and fixed while verifying it live (an RLS infinite-recursion login bug, and the Insights panel's dark-mode instability).
- **Phase 2 — Home. ✅ Shipped.** See the write-up above.
- **Phase 3 — Ask HamishAI promoted. ✅ Shipped.** See the write-up above.
- **Phase 4 — Requests + Billing + Settings design-system pass. ✅ Shipped.** (Help's own pass — retiring `AskSupportAgent`, adding the Ask HamishAI link — happened as part of Phase 3.) See the write-up above.
- **Phase 5 (later, gated) — Documents.** New schema + storage, only once scoped and confirmed worth building for 2 real clients today.
- **Phase 6 (later, blocked) — Meetings.** Stays blocked on the same M365 licensing decision as the internal Teams work; revisit together if Hamish revisits that.

---

## Open questions before Phase 1 starts

1. **Phase 1 scope** — start with design system + nav, then Home, then Ask HamishAI promotion, in that order (matches how both other redesigns were staged)?
2. **`AskSupportAgent` retirement** — OK to remove the duplicate one-shot Q&A box from Home once Ask HamishAI is promoted, or keep both for now?
3. **Milestones** — skip literal named project phases (no real data behind them) unless you specifically want a small new `clients.current_phase` field you'd update by hand per client?
4. **Documents/Meetings** — confirmed out of scope for now (real schema/infra gaps, not a redesign-effort question), revisit later?
