-- Run this once in the Supabase SQL editor for your project.
-- Studio big-ticket ("team collaboration") — the real gap: memberships
-- (organisations.sql) has let an owner invite teammates since
-- team-members.ts shipped, but nothing in the product ever let anyone
-- claim ownership of a piece of work. A request just sat in one shared
-- inbox with no way to tell who's actually on it.
--
-- Plain text, not a foreign key to memberships — memberships itself has
-- no standalone primary key on email (it's unique per (org_id, email),
-- same "people are modelled by email, not a separate users table"
-- choice as memberships.invited_by, which is the same shape). Ownership
-- is still enforced at the application layer: assignRequest()
-- (requests/actions.ts) only ever accepts an email that's a real
-- membership row for the request's own org.
alter table requests add column if not exists assigned_to text;

create index if not exists requests_assigned_to_idx on requests (assigned_to);
