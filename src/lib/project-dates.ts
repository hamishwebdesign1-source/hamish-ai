// Projects Kanban Command Centre, Phase A — target-date helpers lifted
// out of projects-panel.tsx verbatim (logic unchanged) into their own
// shared module, per the design spec: the Kanban card and the new
// `/studio/projects/[id]` detail page both need them now, and two real
// call sites is this codebase's own established trigger to stop
// duplicating a helper (see DESIGN-SYSTEM.md).

// Studio improvement — the overdue/not-overdue split was binary, so a
// project due tomorrow read identically to one due in 6 months until the
// exact day it flipped red. DUE_SOON_DAYS gives a project manager an
// actual heads-up window, same "warning tier before critical" shape as
// studio-engagement.ts's own tierFor() (quiet-but-not-yet-critical gets
// its own state rather than jumping straight from fine to alarming).
export const DUE_SOON_DAYS = 5;

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function daysUntil(targetDate: string): number {
  const today = new Date(new Date().toDateString());
  const target = new Date(targetDate);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function isOverdue(targetDate: string | null, status: string): boolean {
  if (!targetDate || status === "done") return false;
  return new Date(targetDate) < new Date(new Date().toDateString());
}

export function isDueSoon(targetDate: string | null, status: string): boolean {
  if (!targetDate || status === "done") return false;
  const days = daysUntil(targetDate);
  return days >= 0 && days <= DUE_SOON_DAYS;
}

// The day-count line next to the date — "overdue" used to be the only
// state that said anything beyond the raw date; this gives every state
// (including plain "active", once it's still comfortably in the future)
// a real, honest count rather than leaving the reader to do the maths.
export function dueDateNote(targetDate: string): string {
  const days = daysUntil(targetDate);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}
