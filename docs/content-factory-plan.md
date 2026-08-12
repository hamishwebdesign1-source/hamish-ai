# Content Factory: Plan

Status: **Phase A live and verified. Phase B built, not yet live** — `supabase/schema-content-scripts.sql` has not been run yet (see "Pause point" under Phase B). Everything in this doc describes the MVP scope only: Idea Discovery → Research → Scoring → Script → ViewMax video → Human Approval. Publishing to YouTube/TikTok, performance analytics, the AI learning loop, content-fatigue/series detection, and autonomous mode are explicitly out of scope for the MVP — see "Phase 2" at the bottom.

**A deliberate change from the original plan, confirmed with Hamish**: there is no mandatory "pick one of three scripts" human gate. `generate-content-scripts.ts` scores all three variants itself and auto-selects the strongest, auto-chaining straight into video-prompt generation — Hamish reviews/overrides at his discretion (`selectContentScript`/`editContentScript`), but the pipeline never blocks waiting for that. The only two things that ever require deliberate human action are rejecting an idea and the eventual video approval (Phase D).

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

**Live-verified 2026-08-11**: added two real ideas through the actual admin UI against the real Anthropic API. Two real reliability bugs were found and fixed in the process (see Phase B for the details) — with the fixes in place, a real idea ("The Victorian doctor who invented a fake disease to sell his own cure") researched cleanly: score 4/5, clean band values (`novelty: medium, competition: low, production: low, evergreen: high`), and a well-formed `competitor_examples` array. The cost gate itself was also proven correct in the same session — a genuinely weak, oversaturated idea ("why your phone battery dies in winter") scored 0/5 pre-fix and was correctly auto-rejected before reaching script generation.

## Phase B — built, not yet live (scripts, auto-selection, video prompt)

Built: `content_scripts` table (`supabase/schema-content-scripts.sql` — hook/beats/scene_breakdown/style/score, not a flat `script_body` blob, so the review UI can show the actual Hook/Setup/Escalation/Payoff/Ending retention structure the brief's Script Engine section asks for), `generate-content-scripts.ts` (one call, 3 variants — curiosity/shock/story — each self-scored 0-10 by the model, highest score auto-selected), `generate-video-prompt.ts` (separate small call turning the selected script into a ViewMax-ready prompt — kept separate from script generation for the same schema-size reliability reason `research-lead.ts` splits its two large tool calls; aspect ratio/duration computed deterministically, not asked of the model). `research-content-idea.ts` now chains straight into `generateContentScripts()` for any idea that clears the score gate, same best-effort chaining shape as discovery→research. `/admin/content-factory/[id]/page.tsx` gained a Script section (`ContentScriptPanel`) showing the selected script, its scene breakdown, the generated video prompt, a Regenerate action (asks for confirmation if it would clobber a hand-edit), and a collapsed "other variants" panel with a manual override per variant. Still zero ViewMax cost — this phase only produces the prompt ViewMax would eventually receive, never calls ViewMax itself.

**Two real reliability bugs found via live testing and fixed** (both in `research-content-idea.ts`, both the same root cause: Haiku not strictly honouring the JSON schema despite `enum`/`type: array` being declared):
1. The four novelty/competition/production/evergreen band fields came back as hedged phrases ("medium-to-high (the general concept is old; but this specific case is genuinely underexplored)") instead of a bare `low`/`medium`/`high` word. A strict `===` comparison against the enum silently treated every non-exact match as the lowest band, so **every idea scored 0 regardless of actual quality** — a correctness bug that would have killed the pipeline outright. Fixed with `normaliseBand()` (parses out the last mentioned band word, defaults to `medium` rather than the worst case if nothing parses) plus tightened prompt/schema wording as defense in depth.
2. `competitor_examples` (declared as `array of string`) came back as a single plain-text string on one real response, crashing `ContentIdeaResearchButton`'s `.map()` at render time with data that had already been saved. Fixed with a forgiving `toStringArray()` coercion (wraps a lone string as a single-element array instead of discarding it) applied before anything is saved.

Neither bug affects `generate-content-scripts.ts`/`generate-video-prompt.ts` the same way — both of those already call `.map()`/string methods on their own AI output *before* saving, so an equivalent shape mismatch there degrades to a caught generation failure (logged, swallowed, idea stays at its current status) rather than corrupting saved data that later crashes a render.

**Live-verified end to end, 2026-08-11, `schema-content-scripts.sql` applied**: re-ran research on the Victorian-doctor idea and watched the full autonomous chain complete for real — `researched` (score 4/5) → `script_review` (3 real variants: curiosity 8.5/10, shock 7.5/10, story 8/10, curiosity auto-selected) → `ready_for_video`, with a genuinely strong, detailed ViewMax-ready prompt (19s, 9:16, scene-by-scene camera/lighting/transition direction) generated for the selected script. The full detail page rendered correctly — research findings, score breakdown, selected script, scene breakdown, video prompt panel — with zero console errors. One caveat: the "Show other variants" collapse toggle couldn't be click-verified in this session's browser tooling (a stated environment limitation, not a data/logic issue — confirmed by code review: it's the identical `useState` toggle pattern already used successfully by `ContentIdeaResearchButton`), worth a real click-through next time the admin UI is open normally.

## Phase C — built, not yet live (Storage + ViewMax)

Built: `schema-content-storage.sql` (private `content-videos` bucket), `schema-content-videos.sql`, `schema-content-usage.sql` (`content_ai_usage`, the only cost-tracking table — deliberately minimal, not a billing system) — **run content-videos.sql before content-usage.sql**, the latter has a foreign key onto the former. `src/lib/viewmax.ts` (client for ViewMax's v1 REST API — base URL, auth header, the `{code,message,data}` envelope, and the five error codes are confirmed from their public docs; the exact result-URL field name on a real task response is not independently confirmed — no ViewMax account exists yet — so it's checked defensively against three possible shapes and should be simplified once a real response is seen). `content-video-storage.ts` (first Supabase Storage usage in this codebase), `content-ai-usage.ts` (now wired into every Haiku call site from Phase A/B retroactively, plus every ViewMax call). `content-video-pipeline.ts` (`submitReadyIdeas()` + `pollInFlightVideos()`), `content-quality-check.ts` (pure heuristic, no AI call), `generate-content-copy.ts` (title/caption/hashtags). `content-video-pipeline` cron (every 5 minutes). `send-content-alert.ts` (consolidated per-run email, built alongside Phase C rather than deferred to D since the cron needed it immediately). A "Video generation" status panel + manual retry action on `[id]/page.tsx`, and a ViewMax connection/credits indicator on the list page.

**Poll-interval decision:** ViewMax's docs say poll every 5s; a multi-minute generation can't be tracked by one Vercel invocation and this codebase deliberately has no persistent job queue. The `content-video-pipeline` cron runs every 5 minutes and does a bounded inline poll burst (up to 6 polls, 5s apart, ~30s) per in-flight video, then leaves it for the next tick if still not done — a video appears in the review queue within ~5 minutes of finishing, not 5 seconds, which is fine for a human-reviewed internal tool. Needs confirming Hamish's Vercel plan supports 5-minute cron granularity before this ships.

**State-modeling note:** a hard submission or generation failure sets the idea to `status: 'failed'`, not `'video_review'` — `'video_review'` is reserved for outcomes a human genuinely needs to look at (a succeeded video, or an ambiguous ViewMax-said-success-but-something-else-broke case), not a clean failure with nothing to review.

**No ViewMax account exists yet** (confirmed with Hamish) — this phase deploys safely with `VIEWMAX_API_KEY` unset (the pipeline logs "not configured" and skips, everything else keeps working) and only starts actually generating video once he signs up at viewmax.studio and the key is added. **Live-verified 2026-08-11/12**: with the key unset, `/admin/content-factory` correctly shows a "ViewMax isn't connected yet" banner and a `—` credits tile, `checkViewMaxConnection()` returns the right reason, and an idea already sitting at `ready_for_video` from Phase B testing rendered with no crash and no `content_videos` row (exactly the expected no-op). `tsc --noEmit` and `npm run lint` are both clean (zero new issues). `npm run build` could not be verified in this session — it failed on an unrelated, pre-existing Google Fonts network-fetch error in `src/app/concepts/mchale-builders/page.tsx` (a file untouched by this work), consistent with a sandboxed-environment network restriction rather than a code defect; worth a real `npm run build` once network access to fonts.googleapis.com is available.

**Pause point — not yet done:** `schema-content-storage.sql`, `schema-content-videos.sql`, and `schema-content-usage.sql` need to be run (in that order — see above) before ViewMax submission can do anything, and `VIEWMAX_API_KEY` needs to be set once Hamish has signed up at viewmax.studio. Until then the pipeline is fully safe to leave deployed — it just does nothing on the video-generation side.

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
