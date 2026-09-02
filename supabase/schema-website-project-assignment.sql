-- Run this once in the Supabase SQL editor for your project.
-- Studio big-ticket ("team collaboration") continued -- Website Builder
-- was the one project-like workflow left out of assignment
-- (schema-request-assignment.sql, schema-prospect-project-assignment.sql
-- covered requests/prospects/projects). It's the most labor-intensive
-- workflow in the app (10 build phases, discovery through launch) and
-- had no way to say "who's actually building this." Same plain-text-
-- email shape as every other assigned_to column in this app.
alter table website_projects add column if not exists assigned_to text;

create index if not exists website_projects_assigned_to_idx on website_projects (assigned_to);
