// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
// jest-dom matcher extension (toBeInTheDocument etc.) — not wired up
// anywhere else in this suite yet (prospecting-panel.test.tsx uses the
// same matchers but never imports this, a real pre-existing gap in that
// concurrent, not-yet-green file — flagged separately, not fixed here
// since it's outside this task's scope). Importing it directly in this
// file keeps this test file self-contained and correct regardless.
import "@testing-library/jest-dom/vitest";
import { TopOpportunityKitAction } from "./top-opportunity-kit-action";
import { generateSalesKit } from "@/app/studio/(authed)/prospects/actions";

// Command Centre "recommend -> act" v1 — pending/success/error/usage-limit
// coverage per the backlog item's "Test-visible acceptance" list, mirroring
// prospecting-panel.test.tsx's own conventions for this same
// generateSalesKit() Server Action (mocked module, deferred promise for
// the pending-state assertion, explicit cleanup() between tests).
vi.mock("@/app/studio/(authed)/prospects/actions", () => ({
  generateSalesKit: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("TopOpportunityKitAction", () => {
  it("shows the resting 'Generate outreach kit' button when no kit exists yet", () => {
    render(<TopOpportunityKitAction prospectId="p1" hasKitInitially={false} />);
    expect(screen.getByRole("button", { name: /generate outreach kit/i })).toBeInTheDocument();
    expect(screen.queryByText(/outreach kit ready/i)).not.toBeInTheDocument();
  });

  it("renders as already-done when hasKitInitially is true, without requiring a click", () => {
    render(<TopOpportunityKitAction prospectId="p1" hasKitInitially={true} />);
    expect(screen.getByText(/outreach kit ready — open in prospects/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate outreach kit/i })).not.toBeInTheDocument();
  });

  it("disables the button and shows the pending 'Writing…' state while the action is in flight", async () => {
    const { promise, resolve } = deferred<{ kit: Record<string, unknown> }>();
    vi.mocked(generateSalesKit).mockReturnValue(promise as ReturnType<typeof generateSalesKit>);

    render(<TopOpportunityKitAction prospectId="p1" hasKitInitially={false} />);
    fireEvent.click(screen.getByRole("button", { name: /generate outreach kit/i }));

    await waitFor(() => expect(screen.getByText(/writing…/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /writing…/i })).toBeDisabled();

    // Resolve before the test ends — an async startTransition callback
    // left permanently in flight (never resolved) otherwise leaks into
    // later tests' React scheduler state and can leave an unrelated
    // later test's own button stuck disabled/pending.
    resolve({ kit: {} });
    await waitFor(() => expect(screen.getByText(/outreach kit ready/i)).toBeInTheDocument());
  });

  it("replaces the button with the success link and refreshes the router on completion", async () => {
    vi.mocked(generateSalesKit).mockResolvedValue({ kit: {} } as Awaited<ReturnType<typeof generateSalesKit>>);

    render(<TopOpportunityKitAction prospectId="p1" hasKitInitially={false} />);
    fireEvent.click(screen.getByRole("button", { name: /generate outreach kit/i }));

    await waitFor(() => expect(screen.getByText(/outreach kit ready — open in prospects/i)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /generate outreach kit/i })).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: /outreach kit ready — open in prospects/i });
    expect(link).toHaveAttribute("href", "/studio/prospects");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows a generic inline error and re-enables the button when the action fails with no reason", async () => {
    vi.mocked(generateSalesKit).mockResolvedValue({ error: "AI generation failed." } as Awaited<ReturnType<typeof generateSalesKit>>);

    render(<TopOpportunityKitAction prospectId="p1" hasKitInitially={false} />);
    fireEvent.click(screen.getByRole("button", { name: /generate outreach kit/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("AI generation failed."));
    await waitFor(() => expect(screen.getByRole("button", { name: /generate outreach kit/i })).toBeEnabled());
    expect(screen.queryByRole("link", { name: /view plan/i })).not.toBeInTheDocument();
  });

  it("shows the rate-limited message with no extra link", async () => {
    vi.mocked(generateSalesKit).mockResolvedValue({
      error: "You're doing that a lot right now — wait a few minutes and try again.",
      reason: "rate_limited",
    } as Awaited<ReturnType<typeof generateSalesKit>>);

    render(<TopOpportunityKitAction prospectId="p1" hasKitInitially={false} />);
    fireEvent.click(screen.getByRole("button", { name: /generate outreach kit/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/wait a few minutes/i));
    expect(screen.queryByRole("link", { name: /view plan/i })).not.toBeInTheDocument();
  });

  it("shows the usage-limit message plus a working 'View plan' link to billing, and doesn't mark done", async () => {
    vi.mocked(generateSalesKit).mockResolvedValue({
      error: "Monthly limit reached (10 of 10) — try again next month.",
      reason: "usage_limit",
    } as Awaited<ReturnType<typeof generateSalesKit>>);

    render(<TopOpportunityKitAction prospectId="p1" hasKitInitially={false} />);
    fireEvent.click(screen.getByRole("button", { name: /generate outreach kit/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/monthly limit reached/i));
    const planLink = screen.getByRole("link", { name: /view plan/i });
    expect(planLink).toHaveAttribute("href", "/studio/billing");
    expect(screen.queryByText(/outreach kit ready/i)).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  // Command Centre Top Prospects fast-follow — compact=true is what the
  // top_prospects card passes for all 5 rows in one card; same states,
  // just a smaller footprint (xs button, tighter top margin).
  it("renders the tighter xs button and reduced top margin when compact", () => {
    const { container } = render(<TopOpportunityKitAction prospectId="p1" hasKitInitially={false} compact />);
    const button = screen.getByRole("button", { name: /generate outreach kit/i });
    expect(button.className).toContain("h-6");
    expect(container.firstElementChild).toHaveClass("mt-1.5");
  });

  it("defaults to the non-compact sm button and mt-2 margin when compact is omitted", () => {
    const { container } = render(<TopOpportunityKitAction prospectId="p1" hasKitInitially={false} />);
    const button = screen.getByRole("button", { name: /generate outreach kit/i });
    expect(button.className).toContain("h-7");
    expect(container.firstElementChild).toHaveClass("mt-2");
  });
});

// Command Centre Top Prospects fast-follow (backlog: "Wire the same
// outreach-kit action to Command Centre's Top Prospects list") — the
// acceptance criteria explicitly calls for test coverage that one row's
// pending/success/error state can't leak into a sibling row. Each
// instance below is a separate component instance with its own local
// state (exactly how command-centre-section-cards.tsx mounts one per
// prospect id), so this exercises real row independence, not just the
// single-instance behaviour already covered above.
describe("TopOpportunityKitAction — row independence (Top Prospects list)", () => {
  it("one row entering the pending state does not affect a sibling row still at rest", async () => {
    const { promise } = deferred<{ kit: Record<string, unknown> }>();
    vi.mocked(generateSalesKit).mockImplementation((prospectId: string) => (prospectId === "p1" ? promise : Promise.resolve({ kit: {} })) as ReturnType<
      typeof generateSalesKit
    >);

    render(
      <>
        <TopOpportunityKitAction prospectId="p1" hasKitInitially={false} compact />
        <TopOpportunityKitAction prospectId="p2" hasKitInitially={false} compact />
      </>
    );

    const buttons = screen.getAllByRole("button", { name: /generate outreach kit/i });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);

    await waitFor(() => expect(screen.getByRole("button", { name: /writing…/i })).toBeInTheDocument());
    // The p1 row is pending/disabled; the p2 row must still be an
    // untouched, enabled, resting "Generate outreach kit" button.
    const remaining = screen.getByRole("button", { name: /generate outreach kit/i });
    expect(remaining).toBeEnabled();
  });

  it("one row's error does not appear on, or disable, a sibling row that succeeds", async () => {
    vi.mocked(generateSalesKit).mockImplementation((prospectId: string) =>
      Promise.resolve(
        prospectId === "p1" ? { error: "AI generation failed.", reason: undefined } : { kit: {} }
      ) as ReturnType<typeof generateSalesKit>
    );

    render(
      <>
        <TopOpportunityKitAction prospectId="p1" hasKitInitially={false} compact />
        <TopOpportunityKitAction prospectId="p2" hasKitInitially={false} compact />
      </>
    );

    const [button1, button2] = screen.getAllByRole("button", { name: /generate outreach kit/i });
    fireEvent.click(button1);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("AI generation failed."));
    // p1's error rendered, but p2 is still an untouched resting button —
    // no shared "error" state leaked across instances.
    expect(screen.getByRole("button", { name: /generate outreach kit/i })).toBeEnabled();

    fireEvent.click(button2);
    await waitFor(() => expect(screen.getByText(/outreach kit ready — open in prospects/i)).toBeInTheDocument());
    // p2 succeeding doesn't clear p1's still-visible error.
    expect(screen.getByRole("alert")).toHaveTextContent("AI generation failed.");
  });
});
