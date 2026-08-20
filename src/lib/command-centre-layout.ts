// Command Centre Phase 5, first real slice — the shared source of truth
// for "which stat cards exist and in what order they show by default."
// Both the Settings customisation UI and the Command Centre page itself
// import from here, so there's exactly one list to keep in sync, not two
// that could drift apart.

export type CommandCentreCardId = "health" | "prospects" | "clients" | "conversion" | "pipeline";

export const CARD_LABELS: Record<CommandCentreCardId, string> = {
  health: "Business Health",
  prospects: "Prospects found",
  clients: "Clients",
  conversion: "Conversion rate",
  pipeline: "Pipeline value",
};

export const DEFAULT_CARD_ORDER: CommandCentreCardId[] = ["health", "prospects", "clients", "conversion", "pipeline"];

// Validates a stored/submitted list against the real known card ids —
// never trust jsonb from the database or a form submission to already be
// a clean, valid CommandCentreCardId[] tenant-editable data always needs
// this same "is this actually one of the real values" check as any other
// user input in this app.
export function isValidCardId(value: unknown): value is CommandCentreCardId {
  return typeof value === "string" && (DEFAULT_CARD_ORDER as string[]).includes(value);
}

// A stored value only ever changes *order* and *which subset is
// visible* — it can never introduce a card id that isn't real, and a
// stored value missing a real card just means that card isn't shown
// (not an error). Falls back to the full default order when nothing's
// been customised yet, so an org that's never touched this setting sees
// identical behaviour to before this feature existed.
export function resolveCardOrder(stored: unknown): CommandCentreCardId[] {
  if (!Array.isArray(stored)) return DEFAULT_CARD_ORDER;
  const valid = stored.filter(isValidCardId);
  return valid.length > 0 ? valid : DEFAULT_CARD_ORDER;
}
