# Automated Deep Research Pipeline: Plan

Status: **Phase 1 shipped and live-verified end to end.** Per the brief's own "Final Requirement," this inspected the current architecture before proposing what to build (§1–5 below), got explicit confirmation on trigger point / scope / backfill (all three "Recommended" options), then built Phase 1. Phases 2+ not started — see §3 for what's still ahead.

## Phase 1 — what actually shipped

`prospects.concept_slug` going from null → set (via the existing dropdown, `updateLeadConceptSlug` in `src/app/admin/actions.ts`) now creates a `research_jobs` row and kicks off research via Next's `after()` — no manual click, doesn't block the save. The lead detail page shows a live Research status badge (Queued/Researching/Analysing/Completed/Failed/Needs review) in the "At a glance" sidebar.

`researchLead()` (`src/lib/research-lead.ts`) is now concept-page-aware: when a lead has a concept page, it fetches the real deployed page (`https://www.hamishai.org/concepts/<slug>`, stripped to text) and, after the base research call, runs two more focused calls — one for a meeting-ready sales strategy (why this lead matters, key pain points, discovery questions, likely objections, recommended offer), one comparing the concept page against the business's real site (problems solved, strongest improvements, a "Show them this" sales-demo checklist, features to highlight/hold back, suggested additions before pitching). Both render in the existing `ResearchLeadButton` UI on the lead detail page. Everything reuses the existing research pipeline, cache-once/regenerate-on-click convention, and audit-log pattern — `lead.deep_research_completed` is a new audit action, also wired into the Stage 5 AI Activity feed.

**A real reliability finding, worth being honest about:** getting Haiku to reliably fill two large "required" JSON objects in one forced tool call didn't work — it would consistently produce one and silently drop the other, observed with both possible pairings. Splitting into two fully separate, flat-schema, single-purpose calls (3 total Claude calls on concept-linked leads, up from the 1 originally planned) fixed the "entirely missing" failure mode. A remaining, rarer failure mode — a required field coming back the wrong JS type (a string instead of an array) even on a single well-scoped call — is handled with a validate-and-retry-once pass, then a final type-coercion/sanitization pass before anything reaches the database, so a still-imperfect AI response degrades to "that section just doesn't show" rather than ever crashing the UI or saving malformed data. In practice this means the sales-strategy/concept-page-analysis sections populate reliably most runs and occasionally don't on a given lead — an admin can always click "Re-research" to try again. The base research (business summary, weaknesses, AI opportunities, score) is unaffected either way; it was never part of this reliability issue.

Live-verified against the real dev server end to end: SMUG Coffee Bar (a lead with no prior concept page) had `concept_slug` set via the UI, a `research_jobs` row appeared as "Queued" within the same page load, and within ~10 seconds the status read "Complete" with real business research, score, and audit-log entries — all without any manual "Research" click.

## Phase 1 database change

`supabase/schema-research-jobs.sql` — the `research_jobs` table (one row per automatic run). Already applied.

---

---

## 1. What already exists (condensed audit)

The brief describes 17 sections. A significant fraction of that is already built, in production, and reusable as-is:

| Brief section | Already exists as | Notes |
|---|---|---|
| §2 Business/Website research | `src/lib/research-lead.ts` (`researchLead()`) | Deterministic site-check (resolves, SSL, response time, booking form, mobile viewport, title/meta) + one Haiku call producing business summary, services, strengths/weaknesses, SEO notes, missing trust signals, missing conversion opportunities, AI opportunities, recommended services, sales angle, value/probability bands, `pursue_because`. Cached to `prospects.research` + `research_generated_at`, never regenerated except an explicit click. |
| §6 AI Opportunity Analysis | `research.ai_opportunities` + `ai_opportunity_fit` | Already business-specific (prompted per-lead, not generic), already in the schema. |
| §7 Commercial Opportunity | `research.estimated_project_value_band` + `conversion_probability_band` | Already explicitly labelled as internal-only bands, never stated to the prospect — matches the brief's "clearly mark financial estimates as AI estimates" ask exactly. |
| §8 Personalised Sales Strategy | `research.suggested_sales_angle` + `pursue_because` | Partial — no discovery questions or objection-handling yet (net new). |
| §10 Automated Outreach Intelligence | `src/lib/draft-sales-kit.ts` (`draftSalesKit()`) | One Claude call producing outreach email, follow-up email, call script, LinkedIn message, meeting agenda, proposal outline — already uses cached `research` as context, already caches to `sales_kit`/`sales_kit_generated_at`, already never auto-sends (matches "require human approval" exactly). Missing: the explicit first/follow-up-1/follow-up-2/final cadence — partially covered by the existing contact-cadence system (`src/lib/lead-status.ts`, `EMAIL_TO_CALL_DAYS`). |
| §11 Research Report | `/admin/leads/[id]` → AI Intelligence + AI Actions sections | The lead detail page (Stage 4 of the portal redesign) already renders `research` and `sales_kit` as structured sections. Needs new sections added for the net-new research categories, not a new page. |
| §16 Lead Control Panel | Same page, "At a glance" sidebar | Already shows found date, est. value, conversion band, recommended services. Needs the new status/score fields added. |
| Discovery → research chaining | `src/lib/discover-leads.ts` | Already calls `researchLead()` automatically after inserting a discovered lead with a website — i.e. "research runs automatically after X happens" already exists as a pattern, just for a different trigger. |
| Audit trail | `logAuditEvent()` | `lead.researched`, `lead.sales_kit_generated` already logged; this pipeline's new steps would follow the same convention. |
| Model/cost pattern | Haiku (`claude-haiku-4-5-20251001`) + `web_search_20250305` (basic variant — required for Haiku; the newer dynamic-filtering variant only supports Opus/Sonnet-tier models) | Established across `research-lead.ts`, `discover-leads.ts`, `draft-sales-kit.ts`. This pipeline should follow the same model/tool choice for consistency and cost. |

**Net-new work, per section:**

| Brief section | Status |
|---|---|
| §3 Online presence (GBP, Facebook, Instagram, LinkedIn, TikTok, YouTube) | Not built. Real scope: N web-search calls per platform per lead. |
| §4 Customer review analysis | Not built. Depends on §3's data. |
| §5 Competitor research | Not built. Real scope: identify + research N competitors per lead — multiplies cost by N. |
| §9 Concept page analysis ("Show Them This") | Not built. Needs to read the concept page's actual source/rendered content, not just know it exists. |
| §12 Source quality / citation tracking | Not built anywhere in the codebase — no existing research result carries a source URL or retrieval date. |
| §13 Research memory / avoid re-researching | Not built. `research_generated_at` exists but nothing reads it to decide "is this stale" before triggering — every re-research is a full re-run today. |
| §15 Automatic refresh scheduling | Not built. No per-field staleness tracking exists anywhere in the schema. |
| §17 Full autonomous pipeline (meeting → transcript → proposal) | Explicitly out of reach right now — this is Phases 2–3 of `docs/teams-meeting-intelligence-plan.md`, **paused on cost** since 2026-08-08 (Hamish doesn't have a licensed Microsoft 365 mailbox). Nothing here changes that; the pipeline below stops at "outreach drafted, awaiting approval," same as today. |

---

## 2. Two findings that change the design

### 2.1 There is no "concept page created" event to hook into

Concept pages (`/concepts/[slug]`) are hand-authored Next.js route files — real source code, written file-by-file (by me, in a session), then committed to git. There is no database row, no server action, no button that "generates" one. The only trace that a lead *has* a concept page is the `prospects.concept_slug` column, set by hand through the dropdown on the lead's Overview section (`updateLeadConceptSlug` in `src/app/admin/actions.ts`) once a page has been built.

**This means the realistic automatic trigger is: `concept_slug` transitions from null to a real value.** That's the one place in the running application where "this lead now has a concept page" becomes true. The brief's "Concept Page Created" trigger maps onto this action, not onto anything that happens during page-building itself (which isn't app-code at all).

### 2.2 No queue/worker infrastructure exists, and the platform has real limits

Everything background-ish in this codebase today is one of two shapes:
- **Cron-triggered** (`vercel.json`, 6 jobs) — runs on a fixed schedule, not on-demand. Vercel's Hobby plan (what this project is on) allows each cron job to fire at most once a day.
- **Synchronous within a request** — `researchLead()`, `draftSalesKit()` etc. all run inline in a server action or route handler and the caller waits for them.

Next.js 16 (confirmed in `package.json`) supports `after()` — code that runs after a response is sent, without blocking it, which is the actual mechanism for "runs in the background without blocking concept-page creation" without adding a queue library. But `after()` doesn't grant unlimited extra time: the serverless function instance still has to finish within the platform's execution-duration limit (Hobby plan's default is short; it can be raised per-route with `export const maxDuration`, but Hobby still caps it well below what a multi-platform social-scrape + competitor-research + review-analysis pipeline would realistically take).

**Practical consequence:** the full 17-section pipeline, run synchronously end-to-end via `after()`, risks the function being killed mid-run on every single trigger. The brief's own status list (Queued → Researching → Analysing → Completed → Failed → **Needs Review**) already anticipates exactly this — a job that doesn't cleanly finish should land in a visible, human-checkable state, not fail silently. So the plan below treats that status list as load-bearing, not decorative: a small `research_jobs` row per pipeline run, updated as each stage completes, gives real resilience if the runtime is cut off — and it's the same shape of thing `cron_runs` (Stage 5 of the portal redesign) already proved out for cron jobs.

### 2.3 Cost is real and worth sizing before this runs automatically on every lead

There are currently 16 leads with a concept page, out of ~115 total, growing weekly via the discovery cron. Run per-lead, per-trigger:

- **The lean core** (business + website research + concept-page comparison + sales-strategy synthesis, reusing `research-lead.ts`'s existing shape): shipped as 3 Haiku calls on concept-linked leads (see Phase 1 write-up above for why 3, not the 1–2 originally estimated — a reliability finding, not a scope change), 1 call on leads without a concept page. No extra web search beyond what already happens today. Cost per lead: still comparable to what a manual "Research" click already cost — negligible, already paid for today.
- **Online presence + reviews** (§3–4): up to 6 platforms × a web search each = real `web_search` tool cost ($10/1,000 searches on top of token cost) plus the token cost of digesting each platform's results. Per lead, this is the single biggest new line item, and not yet built.
- **Competitor research** (§5): N competitors × their own website/social/review lookups — multiplies the online-presence cost by however many competitors are researched. Not yet built.

Phase 1 (shipped) stays inside the "negligible, already-paid-for" cost band. Phases 3–4 below are where a real, standing recurring cost starts — worth Hamish explicitly sizing and approving before they're switched on, not something to default to "always run everything" silently.

---

## 3. Phased build

Mirrors how the portal redesign was run — build in reviewable stages, verify and check in at each boundary, not one giant change.

- **Phase 1 — Trigger + lean automatic core + concept-page analysis. ✅ Shipped.** See the write-up at the top of this doc for what actually shipped, including the reliability finding that changed the call count from 1 to up to 3.
- **Phase 2 — Online presence + review sentiment (§3–4).** The first phase with real new web-search cost. Gated behind an explicit confirmation now that Phase 1's actual cost is visible in the Anthropic dashboard, not turned on blind.
- **Phase 3 — Competitor research (§5).** Same cost-gating logic as Phase 2, and depends on it (competitor analysis reuses the online-presence research shape).
- **Phase 4 — Outreach intelligence tie-in (§10) + research memory/refresh rules (§13, §15).** Wires the pipeline's output into `draftSalesKit()` automatically (still requiring the existing human-approval gate before anything sends), and adds the staleness/refresh tracking so re-running this pipeline later doesn't re-pay for unchanged data.
- **Phase 5 — Full autonomous pipeline (§17).** Everything downstream of "outreach approved" — response detection, meeting scheduling, transcript analysis, proposal generation. This is the paused Teams meeting intelligence work; stays paused until Hamish revisits that decision.

---

## 4. Database changes

- `research_jobs` ✅ — one row per pipeline run: `id`, `prospect_id`, `status` (queued/researching/analysing/completed/failed/needs_review), `error`, `started_at`, `completed_at`. Same shape/purpose as Stage 5's `cron_runs`. Applied.
- `prospects.research` (jsonb, already existed) ✅ — extended with `sales_strategy` and `concept_page_analysis`, not a new column — same convention as every research field added so far.
- Phase 2+: new columns/tables for online-presence and competitor findings, with `source_url` + `retrieved_at` on every fact per §12 — designed when that phase actually starts, not speculatively now.

---

## 5. Questions asked before Phase 1, and the answers built against

1. **Trigger** — fires when `concept_slug` is set on a lead (§2.1), the only real event available. **Confirmed, built.**
2. **Scope for Phase 1** — lean core first, no new web-search cost, rather than attempting all 17 sections at once. **Confirmed, built.**
3. **Existing 16 concept-linked leads** — going forward only, not backfilled (matches `research-lead.ts`'s existing "don't silently overwrite existing manual work" convention). **Confirmed, built** — `updateLeadConceptSlug` only enqueues a job on the null → set transition.
4. **Phase 2/3 cost gate** (renumbered from the original Phase 3/4 — see §3) — confirm before turning on the online-presence/competitor phases once their real per-lead cost is visible, rather than defaulting them to automatic from day one. **Still the plan** — not yet asked, since those phases haven't started.
