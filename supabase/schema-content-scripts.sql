-- Run this once in the Supabase SQL editor for your project.
-- Content Factory MVP Phase B (docs/content-factory-plan.md) — script
-- variants for one content idea. A genuine repeatable child record with
-- its own lifecycle (three candidate variants generated per idea, one
-- gets selected) rather than a jsonb blob on content_ideas — same "real
-- child table, not a blob" convention as research_jobs, not the
-- single-cardinality convention used for content_ideas.research.
--
-- Beat structure (hook/beats.setup/escalation/payoff/ending) follows the
-- brief's Script Engine section directly rather than one free-text
-- script_body blob, so the review UI can show the actual retention
-- structure instead of an undifferentiated paragraph. `full_script` is
-- the concatenation of all five beats — computed server-side once, not
-- re-derived by every consumer (see generate-content-scripts.ts).
--
-- No mandatory human "pick one of three" gate: generate-content-scripts.ts
-- scores all three variants itself and auto-selects the strongest
-- (status='selected'), auto-chaining into generate-video-prompt.ts —
-- Hamish reviews/overrides at his discretion via selectContentScript /
-- editContentScript, but the pipeline never blocks waiting for that.

create table if not exists content_scripts (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references content_ideas(id) on delete cascade,
  created_at timestamptz not null default now(),
  style text not null, -- curiosity | shock | story -- the three variant archetypes generated per idea
  status text not null default 'candidate', -- candidate | selected | rejected
  hook text not null, -- first 1-3 seconds, the curiosity hook
  beats jsonb not null, -- { setup, escalation, payoff, ending }
  full_script text not null, -- hook + beats concatenated into the actual spoken voiceover text
  scene_breakdown jsonb not null, -- [{ order, beat, visual_description, on_screen_text, duration_s }, ...]
  score numeric, -- 0-10, the model's own self-assessment of this variant's strength (see generate-content-scripts.ts)
  score_rationale text,
  video_prompt jsonb, -- populated only after selection — the single ViewMax-ready generation prompt (see generate-video-prompt.ts). Null on every non-selected variant.
  prompt_generated_at timestamptz,
  edited boolean not null default false, -- true once a human hand-edits hook/beats, so a "regenerate" action knows not to silently clobber a manual edit
  review_note text,
  reviewed_at timestamptz
);

create index if not exists content_scripts_idea_idx on content_scripts (idea_id, created_at desc);

alter table content_scripts enable row level security;
