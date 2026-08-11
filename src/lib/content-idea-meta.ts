// Shared between /admin/content-factory (the list) and
// /admin/content-factory/[id] (the workspace/approval screen) — same role
// STATUSES/statusMeta plays for leads in lead-meta.ts. The full pipeline
// enum is defined here from the start (Phase A only ever produces
// new/researched/rejected; script_review through failed populate as later
// build phases land — see docs/content-factory-plan.md) so the list page's
// FilterTabs and status badges don't need touching again each phase.

export const CONTENT_IDEA_STATUSES = [
  "new",
  "researched",
  "rejected",
  "script_review",
  "ready_for_video",
  "generating_video",
  "video_review",
  "approved",
  "failed",
] as const;

export type ContentIdeaStatus = (typeof CONTENT_IDEA_STATUSES)[number];

export const contentIdeaStatusMeta: Record<
  ContentIdeaStatus,
  { label: string; variant: "warning" | "success" | "accent" | "secondary" | "outline" | "destructive" }
> = {
  new: { label: "New", variant: "outline" },
  researched: { label: "Researched", variant: "accent" },
  rejected: { label: "Rejected", variant: "secondary" },
  script_review: { label: "Script review", variant: "warning" },
  ready_for_video: { label: "Ready for video", variant: "warning" },
  generating_video: { label: "Generating video", variant: "warning" },
  video_review: { label: "Needs review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
};

export function daysSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}
