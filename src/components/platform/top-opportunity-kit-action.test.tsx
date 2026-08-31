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
});
