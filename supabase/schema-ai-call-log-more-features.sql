-- Run this once in the Supabase SQL editor for your project.
-- Studio big-ticket ("Model Performance completeness") — schema-ai-
-- call-log.sql's own comment already anticipated this exact change:
-- "A plain text CHECK, not an enum type, so adding a third feature
-- later is a one-line constraint change, not a type migration." The
-- Model Performance widget could only ever see 2 of the 10 real
-- metered AI actions (usage-limits.ts's own ALL_USAGE_EVENT_TYPES) --
-- logAiCall() was only ever called from command-centre-design-
-- assistant.ts and answer-clients-question.ts. Widened to the real
-- full set every other Claude-backed Studio action now logs to.
alter table ai_call_log drop constraint if exists ai_call_log_feature_check;
alter table ai_call_log add constraint ai_call_log_feature_check check (
  feature in (
    'design_assistant',
    'business_analyst',
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
