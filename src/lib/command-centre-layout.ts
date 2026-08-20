// Command Centre no-code Builder, Phase 5b — generalises Phase 5a's fixed
// 5-card array into a real (if still small) block model. A block is
// deliberately minimal for this phase: which content, and — for stat
// cards only — whether it renders at standard or double width. No
// per-block configurable fields yet (chart metric/kind, custom titles,
// CTA links): those need real input UI and are scoped separately as
// Phase 5c. Every block type here has exactly one possible instance (a
// block's id IS its identity — you can't add "another" Insights block),
// which keeps validation and dedup simple.
//
// Section blocks (Actions required / Insights / Your briefing) always
// render full-width — giving them an independent width control on top of
// reordering is more layout work than this phase's slice justifies, and
// is called out as deliberately deferred rather than silently dropped.
// That's encoded in the type itself (no `span` field exists on a section
// block) rather than left as an unvalidated possibility.
//
// Supersedes organisations.command_centre_cards (Phase 5a — never pushed
// to production, so no real customisation exists to migrate) with
// organisations.command_centre_layout, versioned from day one so a
// future schema change (Phase 5c adding per-block fields) can detect and
// handle an older stored shape rather than assuming its own.

export type BlockSpan = 1 | 2;

export type StatBlockId = "stat:health" | "stat:prospects" | "stat:clients" | "stat:conversion" | "stat:pipeline";
export type SectionBlockId = "actions_required" | "insights" | "briefing";
export type BlockId = StatBlockId | SectionBlockId;

export type Block = { id: StatBlockId; span: BlockSpan } | { id: SectionBlockId };

export type CommandCentreLayout = { version: 1; blocks: Block[] };

export const STAT_BLOCK_IDS: StatBlockId[] = ["stat:health", "stat:prospects", "stat:clients", "stat:conversion", "stat:pipeline"];
export const SECTION_BLOCK_IDS: SectionBlockId[] = ["actions_required", "insights", "briefing"];
export const ALL_BLOCK_IDS: BlockId[] = [...STAT_BLOCK_IDS, ...SECTION_BLOCK_IDS];

export const BLOCK_LABELS: Record<BlockId, string> = {
  "stat:health": "Business Health",
  "stat:prospects": "Prospects found",
  "stat:clients": "Clients",
  "stat:conversion": "Conversion rate",
  "stat:pipeline": "Pipeline value",
  actions_required: "Actions required",
  insights: "Insights",
  briefing: "Your briefing",
};

export const DEFAULT_LAYOUT: CommandCentreLayout = {
  version: 1,
  blocks: [...STAT_BLOCK_IDS.map((id) => ({ id, span: 1 as BlockSpan })), ...SECTION_BLOCK_IDS.map((id) => ({ id }))],
};

export function isValidBlockId(value: unknown): value is BlockId {
  return typeof value === "string" && (ALL_BLOCK_IDS as string[]).includes(value);
}

export function isStatBlockId(id: BlockId): id is StatBlockId {
  return (STAT_BLOCK_IDS as string[]).includes(id);
}

// Stricter than resolveLayout() below — this is the write-path
// validator. Filters out anything that isn't a real, known block id
// (never trust jsonb arriving over the Server Action boundary just
// because the client's TypeScript type says it's a Block[] — the
// runtime never checks that), dedups by id, and clamps span to a real
// value. Returns null on a completely empty/invalid submission so the
// caller can reject the write, rather than silently saving "reset to
// default" for what should have been a real request.
export function sanitizeBlocksForWrite(blocks: unknown): Block[] | null {
  if (!Array.isArray(blocks)) return null;

  const seen = new Set<BlockId>();
  const clean: Block[] = [];
  for (const raw of blocks) {
    if (!raw || typeof raw !== "object") continue;
    const id = (raw as { id?: unknown }).id;
    if (!isValidBlockId(id) || seen.has(id)) continue;
    seen.add(id);

    if (isStatBlockId(id)) {
      const span = (raw as { span?: unknown }).span;
      clean.push({ id, span: span === 2 ? 2 : 1 });
    } else {
      clean.push({ id });
    }
  }
  return clean.length > 0 ? clean : null;
}

// The read/render path — always returns something renderable, falling
// back to the default layout when the stored value is missing, the
// wrong version, or garbage, rather than the page breaking. An org that
// has never customised its layout (or is on the pre-Phase-5b default of
// null) sees identical behaviour to before this feature existed.
export function resolveLayout(stored: unknown): Block[] {
  if (!stored || typeof stored !== "object" || (stored as { version?: unknown }).version !== 1) {
    return DEFAULT_LAYOUT.blocks;
  }
  const clean = sanitizeBlocksForWrite((stored as { blocks?: unknown }).blocks);
  return clean ?? DEFAULT_LAYOUT.blocks;
}
