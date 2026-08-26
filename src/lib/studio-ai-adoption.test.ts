import { describe, it, expect } from "vitest";
import { computeClientAiAdoption } from "./studio-ai-adoption";

describe("computeClientAiAdoption", () => {
  it("returns a null percentage, not zero, for an org with no clients yet", () => {
    const result = computeClientAiAdoption([]);
    expect(result).toEqual({ activeClientCount: 0, adoptedCount: 0, adoptionPct: null, usedCount: 0, totalMessages: 0 });
  });

  it("computes the real share of clients with the chatbot enabled", () => {
    const result = computeClientAiAdoption([
      { id: "a", chatbot_embed_enabled: true },
      { id: "b", chatbot_embed_enabled: true },
      { id: "c", chatbot_embed_enabled: false },
      { id: "d", chatbot_embed_enabled: false },
    ]);
    expect(result.activeClientCount).toBe(4);
    expect(result.adoptedCount).toBe(2);
    expect(result.adoptionPct).toBe(50);
  });

  it("is 0%, not null, when every client has it off", () => {
    const result = computeClientAiAdoption([
      { id: "a", chatbot_embed_enabled: false },
      { id: "b", chatbot_embed_enabled: false },
    ]);
    expect(result.adoptionPct).toBe(0);
  });

  it("defaults usage to zero when no usageCounts are passed", () => {
    const result = computeClientAiAdoption([{ id: "a", chatbot_embed_enabled: true }]);
    expect(result.usedCount).toBe(0);
    expect(result.totalMessages).toBe(0);
  });

  it("only counts usage from clients who actually have it enabled", () => {
    const result = computeClientAiAdoption(
      [
        { id: "a", chatbot_embed_enabled: true },
        { id: "b", chatbot_embed_enabled: false },
      ],
      { a: 5, b: 40 }
    );
    // client b has real audit_log rows (e.g. from before they disabled it),
    // but isn't adopted right now — shouldn't count toward either number.
    expect(result.usedCount).toBe(1);
    expect(result.totalMessages).toBe(5);
  });

  it("distinguishes 'enabled but never used' from 'enabled and used'", () => {
    const result = computeClientAiAdoption(
      [
        { id: "a", chatbot_embed_enabled: true },
        { id: "b", chatbot_embed_enabled: true },
      ],
      { a: 12 }
    );
    expect(result.adoptedCount).toBe(2);
    expect(result.usedCount).toBe(1);
    expect(result.totalMessages).toBe(12);
  });
});
