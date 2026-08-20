-- Run this once in the Supabase SQL editor for your project.
-- Phase 2 of "sell a chatbot to your client's own website" — embed
-- config per client. allowed_origin is the real security boundary here
-- (checked server-side in /api/embed/chat, not just for display) — a
-- client's embed only ever answers requests whose Origin header matches
-- exactly, so lifting the embed snippet onto a different site doesn't
-- work even though the client id itself isn't secret (same reasoning
-- most embeddable widgets use: the id is an identifier, not a credential;
-- the origin check is the actual gate).

alter table clients add column if not exists chatbot_embed_enabled boolean not null default false;
alter table clients add column if not exists chatbot_embed_allowed_origin text;
