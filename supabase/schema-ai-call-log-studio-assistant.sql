-- Run this once in the Supabase SQL editor for your project.
-- Studio AI Assistant (global personalised chat widget, bottom-left of
-- /studio) — same widening this constraint already went through once
-- before (schema-ai-call-log-more-features.sql's own comment: "a plain
-- text CHECK, not an enum type, so adding a feature later is a one-line
-- constraint change"). answer-studio-question.ts logs 'studio_assistant'
-- via logAiCall(); without this, every one of those inserts fails the
-- existing CHECK and the AI call itself would still succeed for the
-- tenant while its own logging silently errors (logAiCall() is
-- fire-and-forget, per its own comment) — so this should be run before
-- the widget ships, not discovered after.
alter table ai_call_log drop constraint if exists ai_call_log_feature_check;
alter table ai_call_log add constraint ai_call_log_feature_check check (
  feature in (
    'design_assistant',
    'business_analyst',
    'studio_assistant',
    'prospect_research',
    'sales_kit',
    'website_mockup',
    'icp_builder',
    'request_triage',
    'website_brief',
    'website_build_phase',
    'website_troubleshooting',
    'knowledge_import'
  )
);
