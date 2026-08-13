-- Run this once in the Supabase SQL editor.
-- Video Affiliate Engine, Phase 0 — lets one content_idea be either the
-- existing general-content type or an Amazon-affiliate product idea,
-- reusing the same idea -> research -> script -> video pipeline for both
-- (see the "Operating Blueprint" artifact and
-- pinterest-amazon-affiliate-project memory: "same shape, different
-- domain" rather than a parallel pipeline). affiliate_product is null for
-- every existing/general idea and only ever populated when
-- content_domain = 'amazon_affiliate'.
-- Safe to re-run (IF NOT EXISTS).

alter table content_ideas
  add column if not exists content_domain text not null default 'general', -- general | amazon_affiliate
  add column if not exists affiliate_product jsonb; -- { product_name, asin, footage_source, footage_status, draft_amazon_url } when content_domain = 'amazon_affiliate'
