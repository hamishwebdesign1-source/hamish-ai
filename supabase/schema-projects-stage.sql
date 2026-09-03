-- Run this once in the Supabase SQL editor, after schema-projects.sql.
-- Projects Kanban Command Centre, Phase A (docs/ai-team/BACKLOG.md's
-- matching entry, "PHASE 3 DESIGN" section; docs/ai-team/DECISIONS.md's
-- matching 2026-09-03 entry) — adds the 5-stage pipeline as an ADDITIVE
-- column. `status` ('active'/'done') is untouched: at least 7 real call
-- sites across the codebase read it directly today (owner-digest.ts,
-- digest-action-tokens.ts, command-search-actions.ts,
-- answer-clients-question.ts, requests/page.tsx's task-assignment
-- dropdown, clients/actions.ts's cascade delete,
-- api/platform/export-data/route.ts) and none of them need to change.
--
-- From this migration forward, `stage` is the real source of truth and
-- every write keeps `status` in sync via deriveProjectStatus()
-- (src/lib/project-stages.ts) rather than the two columns being
-- hand-maintained independently.

alter table projects add column if not exists stage text not null default 'not_started';

-- Backfill existing rows. A 'done' project backfills to 'completed' —
-- an exact, unambiguous match. An existing 'active' project has no real
-- prior stage data to recover; defaulting it to 'not_started' would
-- misrepresent every currently-in-flight project as literally unstarted
-- the moment this ships. 'in_progress' is the more honest default for a
-- project that predates this column — the median real state for
-- something already marked active — over the technically-safer-looking
-- but actually-more-wrong "start of the pipeline." Any project this
-- guesses wrong for can be dragged to the correct column once the board
-- is live.
update projects set stage = 'completed' where status = 'done';
update projects set stage = 'in_progress' where status = 'active';

create index if not exists projects_stage_idx on projects (stage);
