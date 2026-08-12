// Portal redesign Stage 5 — the "AI activity is invisible and scattered"
// problem from the Stage 1 audit, fixed by making this the one shared
// definition of "what counts as AI activity" for both the Command Centre's
// mini feed and the full /admin/ai-activity page, instead of drifting
// copies. `request.triaged`/`request.auto_sent`/`client.progress_report_generated`
// are new — those flows generated zero audit trail before this stage;
// see triage-request.ts and project-report.ts.
export const AI_ACTIVITY_ACTIONS = [
  "lead.researched",
  "lead.sales_kit_generated",
  "lead.discovered",
  "lead.meeting_scheduled",
  "lead.email_drafted",
  "lead.deep_research_completed",
  "request.triaged",
  "request.auto_sent",
  "client.progress_report_generated",
  // Content Factory MVP (docs/content-factory-plan.md) — Phase A+B+C
  // (idea discovery/research/reject, script generation/selection,
  // video-prompt generation, ViewMax submission/completion/failure,
  // caption generation); approval actions join this list as Phase D lands.
  "content.idea_discovered",
  "content.idea_researched",
  "content.idea_rejected",
  "content.scripts_generated",
  "content.script_selected",
  "content.video_prompt_generated",
  "content.video_submitted",
  "content.video_completed",
  "content.video_failed",
  "content.copy_generated",
] as const;

export type AiActivityAction = (typeof AI_ACTIVITY_ACTIONS)[number];

export type AiActivityEntry = {
  id: string;
  action: string;
  created_at: string;
  target_type: string | null;
  target_id: string | null;
  client_id: string | null;
  metadata: Record<string, unknown> | null;
};

// One human sentence per action — the raw "lead.sales_kit_generated"
// strings are for filtering, not for reading.
export function describeAiActivity(action: string, meta: Record<string, unknown>): string {
  switch (action) {
    case "lead.researched":
      return `AI researched a lead — scored ${meta.score}, AI fit ${meta.ai_opportunity_fit}`;
    case "lead.sales_kit_generated":
      return "AI drafted a full sales kit (email, call script, LinkedIn, agenda, proposal)";
    case "lead.discovered":
      return `AI discovered a new lead — ${meta.why_suggested ?? "weekly search"}`;
    case "lead.meeting_scheduled":
      return "Teams meeting scheduled";
    case "lead.email_drafted":
      return "AI drafted an outreach email";
    case "lead.deep_research_completed":
      return `AI completed deep research after the concept page was linked — score ${meta.score}`;
    case "request.triaged":
      return `AI triaged a client request — ${meta.category ?? "uncategorised"} (${meta.complexity ?? "?"}, ${meta.priority ?? "no"} priority)${meta.status === "awaiting_info" ? ", needs more info from the client" : ""}`;
    case "request.auto_sent":
      return "AI auto-sent a reply — covered by plan, small scope, no review needed";
    case "client.progress_report_generated":
      return "AI generated a progress report";
    case "content.idea_discovered":
      return `AI discovered a new content idea — ${meta.why_suggested ?? "weekly trend search"}`;
    case "content.idea_researched":
      return `AI researched a content idea — scored ${meta.score}/5${meta.rejected ? " (auto-rejected)" : ""}`;
    case "content.idea_rejected":
      return "Content idea rejected";
    case "content.scripts_generated":
      return `AI wrote 3 script variants and auto-selected the "${meta.selected_style ?? "?"}" version (scored ${meta.selected_score ?? "?"}/10)`;
    case "content.script_selected":
      return meta.edited
        ? "Script hand-edited"
        : `Script variant switched to "${meta.style ?? "?"}"${meta.manual ? " (manual override)" : ""}`;
    case "content.video_prompt_generated":
      return `AI wrote the ViewMax video prompt — ${meta.duration_s ?? "?"}s`;
    case "content.video_submitted":
      return `Submitted to ViewMax (${meta.model ?? "?"})`;
    case "content.video_completed":
      return "Video generation complete — ready for review";
    case "content.video_failed":
      return `Video generation failed${meta.stage ? ` (${meta.stage})` : ""}${meta.error ? ` — ${meta.error}` : ""}`;
    case "content.copy_generated":
      return `AI wrote the title/caption/hashtags — "${meta.title ?? "?"}"`;
    default:
      return action;
  }
}

// Groups for the filter row on the full feed page — coarser than the raw
// action strings, matching how Hamish actually thinks about these ("sales
// AI" vs "client-ops AI") rather than one pill per action.
export const AI_ACTIVITY_GROUPS: Record<string, { label: string; actions: readonly string[] }> = {
  leads: {
    label: "Sales & leads",
    actions: [
      "lead.researched",
      "lead.sales_kit_generated",
      "lead.discovered",
      "lead.meeting_scheduled",
      "lead.email_drafted",
      "lead.deep_research_completed",
    ],
  },
  clients: {
    label: "Client operations",
    actions: ["request.triaged", "request.auto_sent", "client.progress_report_generated"],
  },
  content: {
    label: "Content Factory",
    actions: [
      "content.idea_discovered",
      "content.idea_researched",
      "content.idea_rejected",
      "content.scripts_generated",
      "content.script_selected",
      "content.video_prompt_generated",
      "content.video_submitted",
      "content.video_completed",
      "content.video_failed",
      "content.copy_generated",
    ],
  },
};

// Where each action's detail actually lives, so the feed can link through
// to it instead of being a dead end.
export function aiActivityHref(entry: Pick<AiActivityEntry, "target_type" | "target_id" | "client_id">): string | null {
  if (entry.target_type === "prospect" && entry.target_id) return `/admin/leads/${entry.target_id}`;
  if ((entry.target_type === "request" || entry.target_type === "client") && entry.client_id) {
    return `/admin/clients/${entry.client_id}`;
  }
  if (entry.target_type === "content_idea" && entry.target_id) return `/admin/content-factory/${entry.target_id}`;
  return null;
}
