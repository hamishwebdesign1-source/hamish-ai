// Projects Kanban Command Centre, Phase A — one shared, plain
// (non-"use client") module for the project stage pipeline, per
// DESIGN-SYSTEM.md's "Kanban board pattern" section: stage metadata
// lives in exactly one place, imported by the Server Action that writes
// it (projects/actions.ts), the board and detail page that render it,
// and the read-only portal surface that displays it — never four
// independent copies of the same label map drifting apart.
//
// 5 stages, not Hamish's own originally-suggested 7 — see
// docs/ai-team/DECISIONS.md's 2026-09-03 "Projects Kanban Command
// Centre, Phase 3 (Design)" entry for the full reasoning. Only
// `client_review` (waiting on someone outside the agency) and
// `completed` get colour treatment — a 5-colour rainbow board is noise,
// not signal.

export type ProjectStage = "not_started" | "in_progress" | "internal_review" | "client_review" | "completed";

export type BadgeVariant = "secondary" | "accent" | "warning" | "success";

export type ProjectStageMeta = {
  id: ProjectStage;
  label: string;
  badgeVariant: BadgeVariant;
  // Column accent — only client_review and completed encode a real
  // distinction ("waiting on someone outside the agency" / "done").
  columnAccentClassName: string | null;
  // The small coloured dot next to client_review's column header —
  // plain, not Eyebrow's pulsing dot (nothing here updates live).
  columnDot: boolean;
};

export const PROJECT_STAGES: ProjectStageMeta[] = [
  { id: "not_started", label: "Not started", badgeVariant: "secondary", columnAccentClassName: null, columnDot: false },
  { id: "in_progress", label: "In progress", badgeVariant: "accent", columnAccentClassName: null, columnDot: false },
  { id: "internal_review", label: "Internal review", badgeVariant: "secondary", columnAccentClassName: null, columnDot: false },
  { id: "client_review", label: "Client review", badgeVariant: "warning", columnAccentClassName: "border-t-2 border-warning", columnDot: true },
  { id: "completed", label: "Completed", badgeVariant: "success", columnAccentClassName: "border-t-2 border-success", columnDot: false },
];

const STAGE_IDS = new Set<string>(PROJECT_STAGES.map((s) => s.id));

export function isProjectStage(value: string): value is ProjectStage {
  return STAGE_IDS.has(value);
}

export function getProjectStageMeta(stage: string): ProjectStageMeta {
  return PROJECT_STAGES.find((s) => s.id === stage) ?? PROJECT_STAGES[0];
}

// Every write that sets `stage` derives `status` from this, rather than
// setting it by hand — the one source of truth the 7 existing two-value
// read call sites (see the migration file's own comment) keep working
// against unchanged.
export function deriveProjectStatus(stage: string): "active" | "done" {
  return stage === "completed" ? "done" : "active";
}

// Portal-facing labels/colours — a client should never see an internal
// label like "Internal review" verbatim (meaningless/mildly alarming to
// an outsider). See DECISIONS.md's matching entry.
export const PORTAL_PROJECT_STAGE_META: Record<ProjectStage, { label: string; className: string }> = {
  not_started: { label: "Not started yet", className: "text-primary-foreground/50" },
  in_progress: { label: "In progress", className: "bg-accent/15 text-accent" },
  internal_review: { label: "In review", className: "bg-accent/15 text-accent" },
  client_review: { label: "Ready for your review", className: "bg-amber-400/15 text-amber-400" },
  completed: { label: "Completed", className: "bg-[var(--chart-2)]/15 text-[var(--chart-2)]" },
};
