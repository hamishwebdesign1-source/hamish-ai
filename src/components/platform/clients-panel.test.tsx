// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { EmbedChatbotControl } from "./clients-panel";
import { updateChatbotEmbedConfig } from "@/app/studio/(authed)/clients/actions";

// Website Builder launch handoff (BACKLOG.md, 2026-09-11) — covers the
// real adjacent bug this entry found and fixed (editing the origin while
// the chatbot is already enabled had no way to save without also
// disabling it, since Enable/Disable was the only save trigger), plus
// the launchedOrigin autofill/"Prefilled" badge/"Use launched site's URL"
// action DECISIONS.md's Decision 6 designed. Same mocking/render
// conventions as prospecting-panel.test.tsx.
vi.mock("@/app/studio/(authed)/clients/actions", () => ({
  updateChatbotEmbedConfig: vi.fn(),
}));

type Client = Parameters<typeof EmbedChatbotControl>[0]["client"];

function baseClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "c1",
    business_name: "Acme Ltd",
    email: "hi@acme.test",
    website_url: null,
    maintenance_plan: null,
    created_at: new Date().toISOString(),
    chatbot_embed_enabled: false,
    chatbot_embed_allowed_origin: null,
    maintenance_monthly_pence: null,
    stripe_subscription_id: null,
    subscription_status: null,
    source_lead_id: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateChatbotEmbedConfig).mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
});

describe("EmbedChatbotControl — save button fix", () => {
  it("editing the origin while already enabled shows a Save button that persists the origin without disabling", async () => {
    const client = baseClient({ chatbot_embed_enabled: true, chatbot_embed_allowed_origin: "https://old-site.example" });
    render(<EmbedChatbotControl client={client} usageCount={0} leads={[]} launchedOrigin={null} />);

    // Only "Disable" is visible before any edit — no separate Save
    // button yet, matching the pre-fix shape exactly.
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();

    const input = screen.getByPlaceholderText("https://theirsite.com");
    fireEvent.change(input, { target: { value: "https://new-site.example" } });

    const saveButton = await screen.findByRole("button", { name: "Save" });
    fireEvent.click(saveButton);

    await waitFor(() => expect(updateChatbotEmbedConfig).toHaveBeenCalledWith("c1", true, "https://new-site.example"));
    // The bug this closes: clicking a save action here must never call
    // the function with enabled=false as a side effect of only wanting
    // to persist the origin.
    expect(updateChatbotEmbedConfig).not.toHaveBeenCalledWith("c1", false, expect.anything());
  });

  it("the Enable/Disable button alone (no edit) still works exactly as before, no Save button rendered", async () => {
    const client = baseClient({ chatbot_embed_enabled: true, chatbot_embed_allowed_origin: "https://site.example" });
    render(<EmbedChatbotControl client={client} usageCount={0} leads={[]} launchedOrigin={null} />);

    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(updateChatbotEmbedConfig).toHaveBeenCalledWith("c1", false, "https://site.example"));
  });
});

describe("EmbedChatbotControl — launchedOrigin prefill (Website Builder launch handoff)", () => {
  it("autofills an empty origin field from launchedOrigin", () => {
    const client = baseClient({ chatbot_embed_allowed_origin: null });
    render(<EmbedChatbotControl client={client} usageCount={0} leads={[]} launchedOrigin="https://launched.example" />);

    const input = screen.getByPlaceholderText("https://theirsite.com") as HTMLInputElement;
    expect(input.value).toBe("https://launched.example");
  });

  it("never silently overwrites an existing saved value, and offers an explicit action instead", () => {
    const client = baseClient({ chatbot_embed_allowed_origin: "https://already-saved.example" });
    render(<EmbedChatbotControl client={client} usageCount={0} leads={[]} launchedOrigin="https://launched.example" />);

    const input = screen.getByPlaceholderText("https://theirsite.com") as HTMLInputElement;
    expect(input.value).toBe("https://already-saved.example");
    expect(screen.getByText(/Use launched site's URL \(launched\.example\)/)).not.toBeNull();
  });

  it("shows a Prefilled badge instead of the action once the field matches launchedOrigin", () => {
    const client = baseClient({ chatbot_embed_allowed_origin: "https://launched.example" });
    render(<EmbedChatbotControl client={client} usageCount={0} leads={[]} launchedOrigin="https://launched.example" />);

    expect(screen.getByText("Prefilled")).not.toBeNull();
    expect(screen.queryByText(/Use launched site's URL/)).toBeNull();
  });
});
