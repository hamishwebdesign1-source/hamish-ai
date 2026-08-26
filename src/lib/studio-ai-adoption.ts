// Command Centre Phase 6d — Client AI Adoption. chatbot_embed_enabled
// (schema-chatbot-embed.sql) already exists per client — this is the
// only client-facing AI touchpoint Studio has today, so "adoption" here
// means whether a client has switched it on.
//
// Command Centre improvement #4: usage depth (usedCount, totalMessages)
// added on top of that — this module's own comment used to say "message
// volume for the embed chat isn't logged anywhere," true when Phase 6d
// was built, no longer true. answer-embed-chat.ts logs a real
// embed_chat.message audit_log row (client-scoped) on every reply, and
// the Clients page (Phase 4 usage visibility) already reads it back per
// client for the "X messages · last 30 days" line on each client's own
// card. This just aggregates that same real data across the org instead
// of duplicating it — usageCounts is the same client-id → message-count
// map clients/page.tsx already builds. See studio-model-performance.ts
// for the Anthropic-call side of Phase 6d.

export type AiAdoption = {
  activeClientCount: number;
  adoptedCount: number;
  adoptionPct: number | null;
  usedCount: number; // of the adopted clients, how many had a real conversation in the window
  totalMessages: number; // real messages across all clients in the window
};

export function computeClientAiAdoption(
  clients: { id: string; chatbot_embed_enabled: boolean }[],
  usageCounts: Record<string, number> = {}
): AiAdoption {
  const activeClientCount = clients.length;
  if (activeClientCount === 0) {
    return { activeClientCount: 0, adoptedCount: 0, adoptionPct: null, usedCount: 0, totalMessages: 0 };
  }

  const adopted = clients.filter((c) => c.chatbot_embed_enabled);
  const adoptedCount = adopted.length;
  const usedCount = adopted.filter((c) => (usageCounts[c.id] ?? 0) > 0).length;
  const totalMessages = adopted.reduce((sum, c) => sum + (usageCounts[c.id] ?? 0), 0);

  return {
    activeClientCount,
    adoptedCount,
    adoptionPct: Math.round((adoptedCount / activeClientCount) * 100),
    usedCount,
    totalMessages,
  };
}
