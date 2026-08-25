import { describe, it, expect } from "vitest";
import { computeClientAiAdoption } from "./studio-ai-adoption";

describe("computeClientAiAdoption", () => {
  it("returns a null percentage, not zero, for an org with no clients yet", () => {
    const result = computeClientAiAdoption([]);
    expect(result).toEqual({ activeClientCount: 0, adoptedCount: 0, adoptionPct: null });
  });

  it("computes the real share of clients with the chatbot enabled", () => {
    const result = computeClientAiAdoption([
      { chatbot_embed_enabled: true },
      { chatbot_embed_enabled: true },
      { chatbot_embed_enabled: false },
      { chatbot_embed_enabled: false },
    ]);
    expect(result).toEqual({ activeClientCount: 4, adoptedCount: 2, adoptionPct: 50 });
  });

  it("is 0%, not null, when every client has it off", () => {
    const result = computeClientAiAdoption([{ chatbot_embed_enabled: false }, { chatbot_embed_enabled: false }]);
    expect(result.adoptionPct).toBe(0);
  });
});
