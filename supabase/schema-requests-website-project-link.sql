-- Run this once in the Supabase SQL editor for your project.
-- AI Website Creation Guide, WB7 — the client-feedback-to-AI-task loop
-- (plan doc §15). The plan doc's own architecture note flagged this as
-- needing a real decision: hang it off the existing `requests` table
-- (nullable website_project_id) or build a standalone system. Chosen:
-- extend `requests` — it's already the real, working, client-facing
-- intake pipeline (portal submission -> AI triage -> optional task),
-- and a website build's feedback is a request like any other, just one
-- that can additionally become a ready-to-paste AI coding-tool prompt
-- via website-troubleshooting.ts's existing generator (WB5) rather than
-- a generic agency task.

alter table requests
  add column if not exists website_project_id uuid references website_projects(id);
