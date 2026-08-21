-- Run this once in the Supabase SQL editor for your project.
-- AI Website Creation Guide, WB5 — the troubleshooting composer (plan
-- doc §12). Stores a short history of issue/diagnosis/fix-prompt
-- entries per project, capped at 20 by the Server Action itself
-- (getTroubleshootingHelp in website-builder/actions.ts) so this
-- doesn't grow unbounded across a long-running project.

alter table website_projects
  add column if not exists troubleshooting_log jsonb not null default '[]'::jsonb;
