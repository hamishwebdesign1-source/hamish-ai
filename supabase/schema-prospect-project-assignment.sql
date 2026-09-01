-- Run this once in the Supabase SQL editor for your project.
-- Studio big-ticket ("team collaboration") continued — requests got
-- assignment first (schema-request-assignment.sql, the smallest single
-- "team queue" to prove the pattern on). This extends the same real,
-- working shape to the other two places a piece of work sits with one
-- owner: prospects (who's chasing this lead) and projects (who's
-- actually delivering this). Same plain-text-email shape, same reasoning
-- (memberships has no standalone primary key on email alone) as
-- schema-request-assignment.sql's own comment.
alter table prospects add column if not exists assigned_to text;
alter table projects add column if not exists assigned_to text;

create index if not exists prospects_assigned_to_idx on prospects (assigned_to);
create index if not exists projects_assigned_to_idx on projects (assigned_to);
