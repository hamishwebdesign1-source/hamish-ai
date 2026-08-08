# Leads Dashboard: Maximum-Automation Plan

Status: planning document, no code changes yet. Written after a working session that touched almost every part of `/admin/leads` (filters, search, connection banner, copy-draft fallback, priority card, concept-slug dropdown, notes, sort) — this plan starts from that actual current state, not a hypothetical one.

## 1. What the page actually does today (and where the manual work really is)

| Area | What exists now | Where the manual work is |
|---|---|---|
| **Lead discovery** | None in code. Every row in `prospects` was found by a human (via Claude chat) running web searches by hand, weekly. | 100% manual. This is the single biggest bottleneck — nothing downstream can run until a lead exists. |
| **Qualification (score, signal, outreach_note)** | Free-text columns, hand-written per lead after a few ad hoc checks (DNS resolve? SSL valid? redirects where?). | 100% manual, and inconsistent — no fixed rubric, not stored as structured data, can't be filtered or recomputed. |
| **Contact info (email/phone)** | Free-text fields, found by hand per lead, often missing for weeks. | 100% manual. |
| **Outreach email** | `draftLeadEmail()` — one Claude (Haiku) call, tool-forced JSON, saved as a real Gmail draft, **already well-cached** (never regenerates unless the operator clicks the button again). | Nothing manual in the generation — this is the pattern everything else should copy. |
| **Call script** | `draftLeadCallScript()` — same pattern. | Same as above, already good. |
| **Send confirmation** | Daily cron sweep + on-demand "Check if sent", both depend on a live Gmail OAuth connection. Just broke silently today (fixed with a connection banner + manual "Sent" checkbox fallback). | Fragile automation, human fallback now exists. |
| **Follow-up cadence** | `lead-status.ts` — pure date math, zero LLM calls, already a good example of "deterministic beats AI here." | None — this is done right already. |
| **Status transitions** | Four buttons, always clicked by hand. No auto-detection of replies (prospects have no inbox-matching, unlike clients). | 100% manual. |
| **Concept pages** | Fully bespoke — each one is ~20+ tool calls in a Claude session (research, image sourcing, a hand-written React page, a chat route, a Supabase update). 17 exist. | Enormous manual/AI-session cost per lead, zero reuse between them. |
| **"Do this next"** | Added today — surfaces one lead via a fixed priority order. | Good start, but only one lead, and the reason is a canned sentence, not a real recommendation. |
| **Notes, timeline** | Notes: freeform text, unanalysed. Timeline: doesn't exist — only current-state snapshot fields (`contacted_at`, `replied_at`), no history of what happened when. | No automation possible without an event log first. |
| **Dashboard widgets** | Status counts, contacted/not, concept/not, needs-follow-up. | Reasonable, but all binary/current-state — nothing forward-looking (value, probability, forecast). |

Two things worth flagging before any of the plan below:

- **`audit_log` already exists** (generic `actor/action/target_type/target_id/metadata` table, built for client-side actions) and is completely unused by the leads page. This is a genuine quick win — the timeline feature is mostly "call `logAuditEvent()` from actions that already exist," not a new system.
- **`site-monitor.ts`** already implements deterministic site-health checks (SSL, resolves, response time) for existing clients. The "AI research" step should reuse this exact logic for prospects rather than re-inventing it — most of what currently gets done by hand-typing a sentence like *"SSL certificate mismatch"* is a fetch + a few boolean checks, not something that needs an LLM at all.

---

## 2. Implementation plan, ranked by impact

### Quick Wins (under 30 minutes each)

1. **Wire the leads page into `audit_log`.** Add one `logAuditEvent()` call to each existing action (`updateLeadStatus`, `markLeadEmailSent`, `markLeadReplied`, `generateLeadEmailDraft`, `updateLeadNotes`, etc.). Zero new schema, zero LLM cost — this alone unlocks the whole "Timeline" ask.
2. **Render that timeline** as a small collapsible list per lead card (`audit_log` filtered by `target_id`). Pure display, no new writes beyond #1.
3. **"Do this next" → top 5, not top 1.** `pickNextAction()` already ranks correctly; change `.find()` to `.filter().slice(0, 5)` and render a compact list instead of a single card.
4. **Pipeline forecast stat card.** `Σ (estimated_project_value × conversion_probability)` — pure arithmetic, but needs the two new fields from the research pass below first, so this one's really a Quick Win *once* section 3's schema lands, not before.
5. **Stale-lead badge.** `needs_verification` or `ready` with no status change in 30+ days → a badge, computed from existing `created_at`/`status`. Zero new schema.

### High Impact Improvements (the biggest lever for the least new architecture)

6. **One structured "research" call per lead, cached forever.** This is the single highest-leverage change in this whole plan. Replace today's hand-written signal/outreach_note with:
   - **Phase 1 (0 tokens):** a deterministic site-check — reuse `site-monitor.ts` — resolves, SSL valid, response time, has a booking/contact form, mobile-friendly meta tag, page title/meta description present, redirect target if any.
   - **Phase 2 (1 Claude call, Haiku, tool-forced JSON — same shape as `draftLeadEmail`):** feed Phase 1's findings + the fetched homepage text in, get back *one* structured object: `business_summary`, `services[]`, `strengths[]`, `weaknesses[]`, `seo_observations[]`, `missing_trust_signals[]`, `missing_conversion_opportunities[]`, `ai_opportunities[]`, `recommended_services[]`, `suggested_sales_angle`, `estimated_project_value_band`, `conversion_probability_band`, `pursue_because` (the "this business is likely worth pursuing because…" sentence).
   - Store as one `research jsonb` column + `research_generated_at timestamptz`. **Never regenerate** unless `website` changes or the operator clicks an explicit "Re-research" button (same pattern as the "re-check domain" idea from the earlier session).
   - This single call replaces: lead qualification, AI research, the "AI Recommendations" section, and half of "Sales Assistance" (audit summary + opportunities report are just different renders of this same JSON) — one prompt, ~10 outputs, exactly the token-efficiency principle asked for.
7. **Deterministic score, not an LLM guess.** Compute the 1–5 score from a weighted formula over Phase 1's booleans + review count/rating (once sourced) + category fit. The research call can contribute *one* qualitative input (e.g. `ai_opportunity_fit: high/medium/low`) but should not be asked to invent the number itself — keeps scoring fast, free, auditable, and consistent lead-to-lead.
8. ~~**One "sales kit" call instead of six.**~~ **Done.** `src/lib/draft-sales-kit.ts` — one tool-forced call (`submit_sales_kit`) returns outreach email, follow-up email, call script, LinkedIn message, meeting agenda, and proposal outline together, using cached `research` as primary context (falls back to `signal`/`outreach_note` for un-researched leads). Cached to `sales_kit jsonb` + `sales_kit_generated_at` (see `supabase/schema-sales-kit.sql`), regenerated only via an explicit "Re-generate sales kit" click. Replaced the old `draft-lead-email.ts` (2 calls) + `draft-lead-call-script.ts` (1 call) and their button components entirely, rather than wrapping them — `email-lead-button.tsx`/`call-script-button.tsx` are gone, `/admin/leads` now renders one `SalesKitButton` per lead (`src/components/admin/sales-kit-button.tsx`). Saving the cached email to Gmail is a separate zero-LLM action (`saveSalesKitEmailToGmail`) reusing the existing `createLeadGmailDraft`/send-check flow.
9. ~~**Extend the dashboard widgets list**~~ **Done.** Added a "Pipeline:" filter row to `/admin/leads` — five clickable widgets (High value, Hot opportunities, Ready for proposal, Waiting for customer, Recently researched), each a pure JS filter over `allLeads` in `page.tsx` (`INSIGHT_PREDICATES`), same independent-dimension pattern as the existing Contact/Concept page rows, zero LLM cost. "Follow-up today" wasn't duplicated — it's the pre-existing `needsFollowUp`/`?status=needs_followup` stat card, which already covers exactly that.

### Larger Features (real architecture, worth scoping separately before building)

10. ~~**Automated weekly lead-discovery job**~~ **Built**, untested against a live weekly run. `src/lib/discover-leads.ts` — a new `/api/cron/lead-discovery` cron (Mondays 7am, before weekly-digest) picks 3 category/area pairs per run from a deterministic weekly rotation over the real category/neighbourhood vocabulary already in `prospects`, runs one Haiku call per pair with the `web_search_20250305` tool (the basic variant — the newer dynamic-filtering type doesn't support Haiku) plus a `submit_candidates` tool, dedupes against existing business names, and inserts new rows as `needs_verification` with a `discovery_source` jsonb column recording why each was suggested. Auto-researches (#6) leads that came back with a website; most won't, since finding weak/no web presence is the whole point of the search. Never auto-committed as "ready" — surfaces as a "New this week" batch-review card on `/admin/leads`, separate from "Do this next," using the existing status buttons as approve/reject. Migration: `supabase/schema-lead-discovery.sql`.
11. **Templated concept-page generation.** The most expensive manual process in the whole system today. A generator parameterized by category (template variant, palette rotation, motif from a fixed library, one Pexels image search) could turn "an hour+ Claude session" into "one generation pass + a short review," but full auto-publish carries real design/accuracy risk — recommend automating the mechanical scaffolding (files, chat route, Supabase update, image download) while keeping a review step before anything goes live, at least initially.
12. **Duplicate/similar-business detection via embeddings.** Embed `business_name + address` once at insert time; reuse that same embedding for both duplicate detection *and* "similar business" grouping. Zero marginal cost after the one-time embed.
13. **Extend the cadence engine** beyond email→call (proposal-sent reminders, meeting-prep the day before, "waiting for customer" escalation) — same deterministic date-math pattern as today's `lead-status.ts`, no new LLM cost, just more states.

### Future Vision

A fully autonomous version of this system looks like: every Monday, a background job finds and scores new prospects and researches them once, each research pass costing a fraction of a penny and never repeating. Hamish's day starts with a short approval queue for new leads, then a "Do this next" list of five actions — each one a single click, because the email, call script, LinkedIn message, and concept page were already generated and are just waiting to be sent. Stale leads, overdue follow-ups, and broken domains flag themselves. A pipeline-forecast number sits at the top of the page, built entirely from cached, deterministic data — not a live estimate re-computed on every page load. Token spend stays roughly flat as lead volume grows into the hundreds or thousands, because the only thing that scales with volume is *storage*, not *LLM calls* — every AI output is generated once per lead, not once per page view. The one thing that never automates away: nothing gets sent to a real business without Hamish (or Claude, reviewing with him) actually looking at it first — matching the "never auto-send" principle already built into the rest of this codebase.

---

## 3. Token cost, concretely

- Site-check (Phase 1): **0 tokens** — plain `fetch` + boolean checks.
- Research pass (Phase 2): **1 Haiku call per lead, once, ever** (unless `website` changes). At even 2,000 leads total, that's 2,000 lifetime calls, not 2,000/week — low single-digit dollars, total, forever.
- Sales kit: same shape as today's `draftLeadEmail`, just consolidated from N calls to 1 — a **reduction** in current token spend, not an increase.
- Dashboard, scoring, forecast, cadence, timeline: **0 tokens** across the board — all pure code over cached/structured fields.
- The only thing that should ever run per-page-load is a fast Supabase query. No LLM call should ever be triggered by rendering the page — only by lead creation or an explicit "Regenerate" click.

## 4. Recommended build order

Quick Wins (1–5) → High Impact #6–7 (research + scoring — everything else depends on this schema existing) → #8–9 (sales kit + dashboard widgets, consume #6's output) → Larger Features in whatever order matches actual pain (discovery automation likely first, since it's today's single biggest manual bottleneck).

## 5. Architecture sketch (for when this moves to code)

- `research jsonb` + `research_generated_at timestamptz` + `estimated_project_value_band text` + `conversion_probability_band text` on `prospects` (one migration, same convention as every other `schema-*.sql` file in this repo).
- `src/lib/research-lead.ts` — Phase 1 (reuses `site-monitor.ts`) + Phase 2 (one Anthropic tool-call, same pattern as `draft-lead-email.ts`).
- `src/lib/draft-sales-kit.ts` — consolidates email/follow-up/LinkedIn/call-script/agenda/proposal into one tool-call, replacing today's separate generators (or wrapping them, to avoid a breaking change to the existing Email button).
- `logAuditEvent()` calls added to existing actions in `src/app/admin/actions.ts` — no new file needed.
- A new `src/app/api/cron/lead-discovery/route.ts` for the weekly job, same bearer-token + Vercel Cron pattern as every other route in `src/app/api/cron/*`.
