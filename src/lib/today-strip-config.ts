// Command Centre improvement #6 — the TODAY masthead (today-strip.tsx)
// was originally hardcoded on purpose: "deliberately not a configurable
// block... this is the one thing every visit opens with, not something
// to hide... a masthead repeating the same all-time counts every single
// day would go stale fast." Made configurable here on explicit
// direction overriding that reasoning — a tenant can now choose any 4
// of the real numbers below, all-time totals included, in their own
// order. Kept as its own small module rather than folded into command-
// centre-layout.ts's Block union: the TODAY strip is still a fixed-
// format 4-slot masthead, not a reorderable grid cell, and doesn't
// share that module's span/chart/text/cta concerns.

export type TodayStatId =
  | "new_prospects"
  | "needs_reply"
  | "pipeline"
  | "todo"
  | "total_prospects"
  | "clients"
  | "engagement_risk"
  | "followups_due"
  | "overdue_projects";

export const TODAY_STAT_IDS: TodayStatId[] = [
  "new_prospects",
  "needs_reply",
  "pipeline",
  "todo",
  "total_prospects",
  "clients",
  "engagement_risk",
  "followups_due",
  "overdue_projects",
];

export const TODAY_STAT_LABELS: Record<TodayStatId, string> = {
  new_prospects: "New prospects",
  needs_reply: "Needs a reply",
  pipeline: "Pipeline",
  todo: "To do",
  total_prospects: "Total prospects",
  clients: "Clients",
  engagement_risk: "At risk",
  followups_due: "Follow-ups due",
  overdue_projects: "Overdue projects",
};

// The original 4, in their original order — unchanged for every org
// that's never customised this, same "identical behaviour to before
// this feature existed" rule as resolveLayout() in command-centre-
// layout.ts.
export const DEFAULT_TODAY_STRIP: TodayStatId[] = ["new_prospects", "needs_reply", "pipeline", "todo"];

export const TODAY_STRIP_MAX = 4;

function isTodayStatId(value: unknown): value is TodayStatId {
  return typeof value === "string" && (TODAY_STAT_IDS as string[]).includes(value);
}

// Write-path validator — dedupes and caps at TODAY_STRIP_MAX, same
// "filter unknown/malformed entries rather than trust the caller"
// reasoning as sanitizeBlocksForWrite() in command-centre-layout.ts.
// Returns null on a completely empty/invalid submission so the caller
// rejects the write rather than silently saving an empty strip.
export function sanitizeTodayStripForWrite(value: unknown): TodayStatId[] | null {
  if (!Array.isArray(value)) return null;
  const clean: TodayStatId[] = [];
  for (const raw of value) {
    if (!isTodayStatId(raw) || clean.includes(raw)) continue;
    clean.push(raw);
    if (clean.length === TODAY_STRIP_MAX) break;
  }
  return clean.length > 0 ? clean : null;
}

// The read/render path — always returns something renderable, falling
// back to the default 4 when the stored value is missing or garbage.
export function resolveTodayStrip(stored: unknown): TodayStatId[] {
  return sanitizeTodayStripForWrite(stored) ?? DEFAULT_TODAY_STRIP;
}
