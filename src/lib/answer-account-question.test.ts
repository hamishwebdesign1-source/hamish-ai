import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "./test-helpers/mock-supabase";

// Mocked before the import below so answer-account-question.ts picks up the
// fake implementation. The mock is hoisted by vitest, so declaring it here
// (rather than at the very top) is still safe — but the create() spy is
// re-armed in beforeEach so each test controls its own response.
const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

const NOW = new Date("2026-08-05T12:00:00Z");
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  createMock.mockReset();
  process.env = { ...ORIGINAL_ENV, ANTHROPIC_API_KEY: "test-key" };
});

afterEach(() => {
  vi.useRealTimers();
  process.env = ORIGINAL_ENV;
});

function baseTables() {
  return {
    clients: [{ id: "client-1", business_name: "Acme Ltd", website_url: null }],
    requests: [],
    tasks: [],
    invoices: [],
    site_checks: [],
    knowledge_base: [],
  };
}

describe("answerAccountQuestion", () => {
  it("returns the insights error without ever calling the model, if the client doesn't exist", async () => {
    const { answerAccountQuestion } = await import("./answer-account-question");
    const supabase = createMockSupabase({ clients: [] });

    const result = await answerAccountQuestion(supabase as never, "missing-client", [{ role: "user", content: "hi" }]);

    expect(result).toEqual({ error: "Client not found." });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns a clear error when ANTHROPIC_API_KEY isn't configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { answerAccountQuestion } = await import("./answer-account-question");
    const supabase = createMockSupabase(baseTables());

    const result = await answerAccountQuestion(supabase as never, "client-1", [{ role: "user", content: "hi" }]);

    expect(result).toEqual({ error: "ANTHROPIC_API_KEY is not configured." });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("answers using only this client's own real figures, never another client's", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "You have 2 requests on file." }],
    });
    const { answerAccountQuestion } = await import("./answer-account-question");

    const supabase = createMockSupabase({
      clients: [
        { id: "client-1", business_name: "Acme Ltd", website_url: null },
        { id: "client-2", business_name: "Other Co", website_url: null },
      ],
      requests: [
        { id: "r1", client_id: "client-1", created_at: "2026-08-01T09:00:00Z", status: "new", category: "bug", auto_sent: false, responded_at: null },
        { id: "r2", client_id: "client-1", created_at: "2026-08-02T09:00:00Z", status: "new", category: "bug", auto_sent: false, responded_at: null },
        { id: "r3", client_id: "client-2", created_at: "2026-08-01T09:00:00Z", status: "new", category: "bug", auto_sent: false, responded_at: null },
      ],
      tasks: [],
      invoices: [],
      site_checks: [],
      knowledge_base: [],
    });

    const result = await answerAccountQuestion(supabase as never, "client-1", [{ role: "user", content: "How many requests do I have?" }]);

    expect(result).toEqual({ reply: "You have 2 requests on file." });
    expect(createMock).toHaveBeenCalledTimes(1);

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.system).toContain("Acme Ltd");
    expect(callArgs.system).toContain("Total requests all-time: 2");
    // Client 2's count must never appear in client 1's system prompt.
    expect(callArgs.system).not.toContain("Other Co");
  });

  it("returns a friendly error if the model call throws", async () => {
    createMock.mockRejectedValue(new Error("network blip"));
    const { answerAccountQuestion } = await import("./answer-account-question");
    const supabase = createMockSupabase(baseTables());

    const result = await answerAccountQuestion(supabase as never, "client-1", [{ role: "user", content: "hi" }]);

    expect(result).toEqual({ error: "The copilot is temporarily unavailable." });
  });

  it("returns an error if the model responds with no text block", async () => {
    createMock.mockResolvedValue({ content: [{ type: "tool_use" }] });
    const { answerAccountQuestion } = await import("./answer-account-question");
    const supabase = createMockSupabase(baseTables());

    const result = await answerAccountQuestion(supabase as never, "client-1", [{ role: "user", content: "hi" }]);

    expect(result).toEqual({ error: "The copilot did not return an answer." });
  });
});
