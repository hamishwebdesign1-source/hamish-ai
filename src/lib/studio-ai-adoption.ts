// Command Centre Phase 6d — Client AI Adoption. chatbot_embed_enabled
// (schema-chatbot-embed.sql) already exists per client — this is the
// only client-facing AI touchpoint Studio has today, so "adoption" here
// means whether a client has switched it on, not how much it's actually
// used: message volume for the embed chat isn't logged anywhere, and
// adding that would be its own feature (and its own set of questions
// about logging a client's own customers' conversations), not something
// to fold in quietly here. See studio-model-performance.ts for the
// Anthropic-call side of Phase 6d.

export type AiAdoption = { activeClientCount: number; adoptedCount: number; adoptionPct: number | null };

export function computeClientAiAdoption(clients: { chatbot_embed_enabled: boolean }[]): AiAdoption {
  const activeClientCount = clients.length;
  if (activeClientCount === 0) return { activeClientCount: 0, adoptedCount: 0, adoptionPct: null };

  const adoptedCount = clients.filter((c) => c.chatbot_embed_enabled).length;
  return { activeClientCount, adoptedCount, adoptionPct: Math.round((adoptedCount / activeClientCount) * 100) };
}
