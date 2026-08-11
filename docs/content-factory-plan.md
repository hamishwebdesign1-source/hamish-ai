# Content Factory: Plan

Status: **Phase A built, not yet live** — `supabase/schema-content-ideas.sql` has not been run in Supabase yet (see "Pause point" below). Everything in this doc describes the MVP scope only: Idea Discovery → Research → Scoring → Script → ViewMax video → Human Approval. Publishing to YouTube/TikTok, performance analytics, the AI learning loop, content-fatigue/series detection, and autonomous mode are explicitly out of scope for the MVP — see "Phase 2" at the bottom.

Full design decisions, audit of what was reused, and rationale live in the approved plan this was built from (the conversation's plan-mode output) — this doc tracks what actually shipped, phase by phase, the way `docs/deep-research-pipeline-plan.md` and `docs/leads-automation-plan.md` do for their own pipelines.

## What was reused (condensed audit)

This pipeline deliberately does not invent new infrastructure — every piece below is the leads pipeline's own pattern, retargeted at a new entity:

| Content Factory piece | Modeled directly on |
|---|---|
| `content_ideas` parent table, jsonb-blob-per-stage caching | `prospects` (`schema-leads.sql`) |
| `discover-content-ideas.ts` — weekly Haiku + `web_search_20250305` discovery, topic rotation, dedupe-via-Set, safety valve, best-effort chaining | `discover-leads.ts` |
| `research-content-idea.ts` — tool-forced Haiku call, deterministic score formula, cache-once-until-explicit-regenerate | `research-lead.ts` |
| `content_ai_usage`, cost gates (Phase C) | New — no direct precedent, this codebase had no cost tracking before Content Factory |
| `content_videos` async job table, bounded-poll-burst cron (Phase C) | `research_jobs` + `deep-research-pipeline.ts` |
| `ai-activity.ts`'s `content.*` action strings | Same shared ledger every other pipeline uses — no second audit system |
| `/admin/content-factory` list+detail shape, `FilterTabs`, `ai` badge/button variant | `/admin/leads` |
| Cron route auth/logging shape (`CRON_SECRET` bearer, `recordCronRun`, `sendErrorAlert`) | Every existing `/api/cron/*/route.ts` |

## Phase A — shipped (idea discovery, research, scoring)

Built:
- `supabase/schema-content-ideas.sql` — the `content_ideas` table.
- `src/lib/research-content-idea.ts` — `researchContentIdea()` (one forced-tool Haiku call: trend validation, audience fit, competitor examples, differentiation, risk notes, suggested angle, four low/medium/high bands) and `computeIdeaScore()` (deterministic 0–5, four 0–2 bands rescaled — see the file for the exact formula). `MIN_SCORE_TO_PROCEED = 3` auto-rejects weak ideas immediately after research, before any further spend — the primary cost gate.
- `src/lib/discover-content-ideas.ts` — `discoverContentIdeas()`, weekly, an 8-topic rotation (3/week), `MAX_NEW_IDEAS_PER_RUN = 8`, chains into `researchContentIdea()` per inserted idea.
- `src/app/api/cron/content-idea-discovery/route.ts` — Wednesdays 07:00 UTC (`0 7 * * 3`, staggered off `lead-discovery`'s Monday slot), registered in `vercel.json` and `src/lib/cron-schedule.ts`.
- `src/lib/ai-activity.ts` — `content.idea_discovered`, `content.idea_researched`, `content.idea_rejected` added to `AI_ACTIVITY_ACTIONS`, a new `content` group, `aiActivityHref()` routing to `/admin/content-factory/{id}`.
- `src/app/admin/actions.ts` — `addContentIdea` (manual add), `generateIdeaResearch` (the `useActionState`-shaped regenerate action), `rejectContentIdea`.
- `src/components/admin/content-idea-research-button.tsx` — mirrors `research-lead-button.tsx`.
- `src/app/admin/(authed)/content-factory/page.tsx` (list — summary cards, status `FilterTabs`, add-idea form) and `[id]/page.tsx` (workspace — concept, AI research panel, reject, timeline). Both `force-dynamic`.
- Sidebar nav: new "Content" section, "Content Factory" link (`src/components/admin/sidebar.tsx` — shared by desktop sidebar, mobile drawer, and command palette via `NAV_SECTIONS`).

**Pause point — not yet done:** `schema-content-ideas.sql` needs to be run in the Supabase SQL editor before this does anything. `npm run lint` and `npm run build`/`tsc --noEmit` are clean. Once the SQL is applied, verify by triggering the discovery cron (or waiting for Wednesday 7am UTC) and confirming real ideas appear on `/admin/content-factory` with research/scores, then tune `TOPIC_ROTATION` and `MIN_SCORE_TO_PROCEED` against real output before Phase B is built on top.

## Phase B — not started (scripts + Script Review)

`content_scripts` table, `generate-content-scripts.ts` (3 variants: hook/script_body/scene_breakdown), `generate-video-prompt.ts` (separate small call turning a selected script into a ViewMax-ready prompt — kept separate from script generation for the same schema-size reliability reason `research-lead.ts` splits its two large tool calls). Still zero ViewMax cost.

## Phase C — not started (Storage + ViewMax)

`schema-content-storage.sql` (private `content-videos` bucket), `schema-content-usage.sql` (`content_ai_usage`, the only cost-tracking table — deliberately minimal, not a billing system), `schema-content-videos.sql`. `src/lib/viewmax.ts` (client for ViewMax's v1 REST API — `https://viewmax.studio`, `Authorization: Bearer sk-...`, `POST /api/v1/videos`, `GET /api/v1/tasks/{id}`, `GET /api/v1/models?type=video` queried live at submission time, never hardcoded, `GET /api/v1/credits`), `content-video-storage.ts`, `content-ai-usage.ts` (wired into every Haiku call site from Phase A/B retroactively, plus every ViewMax call), `content-video-pipeline.ts` (`submitReadyIdeas()` + `pollInFlightVideos()`), `content-quality-check.ts`, `generate-content-copy.ts`.

**Poll-interval decision:** ViewMax's docs say poll every 5s; a multi-minute generation can't be tracked by one Vercel invocation and this codebase deliberately has no persistent job queue. The `content-video-pipeline` cron runs every 5 minutes and does a bounded inline poll burst (up to 6 polls, 5s apart, ~30s) per in-flight video, then leaves it for the next tick if still not done — a video appears in the review queue within ~5 minutes of finishing, not 5 seconds, which is fine for a human-reviewed internal tool. Needs confirming Hamish's Vercel plan supports 5-minute cron granularity before this ships.

**No ViewMax account exists yet** (confirmed with Hamish) — this phase deploys safely with `VIEWMAX_API_KEY` unset (the pipeline logs "not configured" and skips, everything else keeps working) and only starts actually generating video once he signs up at viewmax.studio and the key is added.

## Phase D — not started (Human Approval + notifications)

`approveContentVideo` / `rejectContentVideo` / `regenerateContentVideo` actions, the approval panel on `[id]/page.tsx` (video preview via signed URL, script, research, quality flags, editable platform copy, Approve/Edit/Regenerate/Reject — "review a whole video in under 30 seconds"), `send-content-alert.ts` (one consolidated email per pipeline run, skipped entirely if nothing's actionable).

## Phase E — optional polish

Command Centre summary card, a cost rollup card on the list page.

## Env vars

```
VIEWMAX_API_KEY=            # optional — unset means content-video-pipeline logs "not configured" and skips; ideas/scripts work fully without it
VIEWMAX_MIN_CREDIT_BUFFER=5 # optional, defaults in code if unset
```
No changes to `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REFRESH_TOKEN` in the MVP — YouTube upload scope is added there only when publishing (phase 2) is built.

## Phase 2 (not built, schema stays open)

`platform_posts` (`video_id` → `content_videos.id`, platform, scheduled_at, external_post_id, published_at, status) covers YouTube/TikTok publishing without touching any table above. `platform_post_metrics` (child of `platform_posts`) covers analytics. The learning loop and content-fatigue/series detection are read models over `content_ai_usage`/`content_ideas`/`platform_post_metrics` — no schema changes needed to what's built now. Autonomous mode is a single flag bypassing the existing `approveContentVideo` gate; the gate and everything upstream stays exactly as built.
