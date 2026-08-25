// Command Centre no-code Builder, Phase 5c — adds real per-block content:
// a chart block (metric + kind, sourced from studio-analytics.ts's own
// two real time-series — revenue and prospects, nothing invented), a
// text block, and a call-to-action block. Unlike Phase 5b's 8 blocks
// (exactly one instance of each, ever possible), these three are
// genuinely addable and removable, so a block now needs its own unique
// `id` separate from its `type` — Phase 5b let `id` double as both since
// every block was a singleton. That's the real schema change here,
// bumped to version 2; resolveLayout() below still upgrades a stored
// version-1 layout on read rather than discarding it.

export type BlockSpan = 1 | 2;

export type StatCardId = "health" | "prospects" | "clients" | "conversion" | "pipeline";
export type SectionType = "actions_required" | "insights" | "briefing";
export type ChartMetric = "revenue" | "prospects";
export type ChartKind = "area" | "bar";

// Section types are three separate union members (not one member typed
// `type: SectionType`) specifically so TypeScript's discriminated-union
// narrowing works on the "none of the above" path too — a single member
// with a multi-literal discriminant narrows fine when matched, but
// doesn't reliably narrow itself *out* of the remaining union after a
// disjunctive `===` check.
export type Block =
  | { id: string; type: "stat"; cardId: StatCardId; span: BlockSpan }
  | { id: string; type: "actions_required" }
  | { id: string; type: "insights" }
  | { id: string; type: "briefing" }
  | { id: string; type: "chart"; metric: ChartMetric; kind: ChartKind; span: BlockSpan }
  | { id: string; type: "text"; title: string; body: string; span: BlockSpan }
  | { id: string; type: "cta"; label: string; href: string; span: BlockSpan };

export type CommandCentreLayout = { version: 2; blocks: Block[] };

export const STAT_CARD_IDS: StatCardId[] = ["health", "prospects", "clients", "conversion", "pipeline"];
export const SECTION_TYPES: SectionType[] = ["actions_required", "insights", "briefing"];

export const STAT_LABELS: Record<StatCardId, string> = {
  health: "Business Health",
  prospects: "Prospects found",
  clients: "Clients",
  conversion: "Conversion rate",
  pipeline: "Pipeline value",
};
export const SECTION_LABELS: Record<SectionType, string> = {
  actions_required: "Actions required",
  insights: "Insights",
  briefing: "Your briefing",
};
export const CHART_METRIC_LABELS: Record<ChartMetric, string> = { revenue: "Revenue", prospects: "New prospects" };
export const CHART_KIND_LABELS: Record<ChartKind, string> = { area: "Area", bar: "Bar" };

// The default layout every org sees until it customises anything — the 5
// stat cards, then the 3 section blocks in their original fixed order,
// exactly what Phase 5b's default already was.
//
// health defaults to span 2, not 1: it holds a ring visualisation plus a
// 3-5 row component breakdown, real content none of the other four stat
// cards (a single icon+number+label) carry. At span 1, alongside four
// plain stat cards, its own labels ("Client sites uptime") had nowhere
// near enough width and wrapped mid-word — not a spacing problem, a
// width problem: the card was simply too narrow for what it holds.
export const DEFAULT_LAYOUT: CommandCentreLayout = {
  version: 2,
  blocks: [
    ...STAT_CARD_IDS.map((cardId): Block => ({ id: `stat:${cardId}`, type: "stat", cardId, span: cardId === "health" ? 2 : 1 })),
    ...SECTION_TYPES.map((type): Block => ({ id: type, type })),
  ],
};

export function statBlockId(cardId: StatCardId): string {
  return `stat:${cardId}`;
}

function isStatCardId(value: unknown): value is StatCardId {
  return typeof value === "string" && (STAT_CARD_IDS as string[]).includes(value);
}
function isSectionType(value: unknown): value is SectionType {
  return typeof value === "string" && (SECTION_TYPES as string[]).includes(value);
}
function isChartMetric(value: unknown): value is ChartMetric {
  return value === "revenue" || value === "prospects";
}
function isChartKind(value: unknown): value is ChartKind {
  return value === "area" || value === "bar";
}
function isSpan(value: unknown): value is BlockSpan {
  return value === 1 || value === 2;
}

// A CTA's href is rendered as a real <a href> — the one place in this
// block model where a value more dangerous than text can end up in the
// DOM. Only an internal path or a real https link is accepted; anything
// else (javascript:, data:, vbscript:, a bare "http://" downgrade) is
// rejected outright rather than sanitised, same "reject, don't
// half-trust" instinct as everywhere else user input reaches a URL in
// this app.
function isSafeHref(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 300) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  return /^https:\/\/[^\s]+$/i.test(value);
}

function clampText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

// Generates a real per-instance id for a newly added chart/text/cta
// block — random enough that two blocks added in the same render never
// collide, with no need for a real UUID library for something this low-
// stakes (a client-only React key and a jsonb array position, not a
// primary key).
export function generateBlockId(type: "chart" | "text" | "cta"): string {
  return `${type}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Write-path validator — filters unknown/malformed entries out rather
// than trusting the caller's TypeScript type (a Server Action argument
// is just parsed JSON over the wire). Dedups singleton block types
// (stat/section) by their natural id; chart/text/cta blocks are never
// deduped since multiple real instances are the point of adding them.
// Returns null on a completely empty/invalid submission so the caller
// rejects the write rather than silently saving "reset to default".
export function sanitizeBlocksForWrite(blocks: unknown): Block[] | null {
  if (!Array.isArray(blocks)) return null;

  const seenSingleton = new Set<string>();
  const clean: Block[] = [];
  for (const raw of blocks) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    if (r.type === "stat") {
      if (!isStatCardId(r.cardId)) continue;
      const id = statBlockId(r.cardId);
      if (seenSingleton.has(id)) continue;
      seenSingleton.add(id);
      clean.push({ id, type: "stat", cardId: r.cardId, span: isSpan(r.span) ? r.span : 1 });
    } else if (isSectionType(r.type)) {
      if (seenSingleton.has(r.type)) continue;
      seenSingleton.add(r.type);
      clean.push({ id: r.type, type: r.type });
    } else if (r.type === "chart") {
      if (!isChartMetric(r.metric) || !isChartKind(r.kind) || typeof r.id !== "string" || !r.id) continue;
      clean.push({ id: r.id, type: "chart", metric: r.metric, kind: r.kind, span: isSpan(r.span) ? r.span : 2 });
    } else if (r.type === "text") {
      const title = clampText(r.title, 60);
      const body = clampText(r.body, 500);
      if (!title || !body || typeof r.id !== "string" || !r.id) continue;
      clean.push({ id: r.id, type: "text", title, body, span: isSpan(r.span) ? r.span : 2 });
    } else if (r.type === "cta") {
      const label = clampText(r.label, 40);
      if (!label || !isSafeHref(r.href) || typeof r.id !== "string" || !r.id) continue;
      clean.push({ id: r.id, type: "cta", label, href: r.href, span: isSpan(r.span) ? r.span : 1 });
    }
  }
  return clean.length > 0 ? clean : null;
}

// Upgrades a Phase 5b (version 1) stored layout — blocks identified only
// by a fixed id, no explicit `type` field — into the version-2 shape.
// No real org has a non-null value from that version in production (it
// shipped and was reset in testing before any real customisation), but
// the version field exists precisely so a case like this doesn't have to
// discard a tenant's saved layout the first time the schema grows.
function upgradeV1Blocks(rawBlocks: unknown): Block[] | null {
  if (!Array.isArray(rawBlocks)) return null;
  const upgraded: unknown[] = [];
  for (const raw of rawBlocks) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string") continue;
    if (r.id.startsWith("stat:")) {
      const cardId = r.id.slice(5);
      upgraded.push({ type: "stat", cardId, span: r.span });
    } else if (isSectionType(r.id)) {
      upgraded.push({ type: r.id });
    }
  }
  return sanitizeBlocksForWrite(upgraded);
}

// The read/render path — always returns something renderable, falling
// back to the default layout when the stored value is missing or
// garbage, rather than the page breaking. An org that has never
// customised its layout sees identical behaviour to before this feature
// existed.
export function resolveLayout(stored: unknown): Block[] {
  if (!stored || typeof stored !== "object") return DEFAULT_LAYOUT.blocks;
  const version = (stored as { version?: unknown }).version;
  const rawBlocks = (stored as { blocks?: unknown }).blocks;

  if (version === 1) {
    return upgradeV1Blocks(rawBlocks) ?? DEFAULT_LAYOUT.blocks;
  }
  if (version !== 2) return DEFAULT_LAYOUT.blocks;

  const clean = sanitizeBlocksForWrite(rawBlocks);
  return clean ?? DEFAULT_LAYOUT.blocks;
}
