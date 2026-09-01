// Roadmap item #6 ("AI-generated client proposals") — the piece that was
// genuinely missing, not just unwired: there was no concept anywhere of a
// tenant org's *own* pricing for its *own* services (platform-plans.ts is
// HamishAI's own Agency Platform SaaS pricing — a completely different
// thing, never to be confused with this). A proposal PDF needs real
// prices to quote; this is where an owner defines them once.
//
// Stored in organisations.brand.rateCard, same jsonb column every other
// small per-org setting this session added already lives in
// (replyToEmail, bookingLink, …) — a short list an owner edits from
// Settings, not large or relational enough to need its own table.

export type RateCardItem = { label: string; pricePence: number; unit: "one-off" | "monthly" };

const MAX_ITEMS = 12;
const MAX_LABEL_LENGTH = 60;

// Whole-list replace, not a per-item add/remove Server Action — same
// "validate the complete list on every write" shape
// sanitizeBlocksForWrite() (command-centre-layout.ts) already
// established for a different small owner-edited list, for the same
// reason: simpler to reason about than reconciling incremental edits
// against whatever's already stored.
export function sanitizeRateCardForWrite(input: unknown): RateCardItem[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_ITEMS) return null;

  const clean: RateCardItem[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;

    const label = typeof item.label === "string" ? item.label.trim() : "";
    if (!label || label.length > MAX_LABEL_LENGTH) return null;

    const pricePence = typeof item.pricePence === "number" ? Math.round(item.pricePence) : NaN;
    if (!Number.isFinite(pricePence) || pricePence < 0 || pricePence > 100_000_00) return null;

    const unit = item.unit === "monthly" ? "monthly" : item.unit === "one-off" ? "one-off" : null;
    if (!unit) return null;

    clean.push({ label, pricePence, unit });
  }
  return clean;
}

export function formatRateCardPrice(item: RateCardItem): string {
  const pounds = (item.pricePence / 100).toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: item.pricePence % 100 === 0 ? 0 : 2 });
  return item.unit === "monthly" ? `${pounds}/mo` : pounds;
}
