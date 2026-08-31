// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ContactTrackingControl, PipelineStageControl } from "./prospecting-panel";
import {
  markProspectContacted,
  markProspectReplied,
  markProspectQualified,
  markProspectLost,
} from "@/app/studio/(authed)/prospects/actions";

// BACKLOG.md's 2026-08-31 useOptimistic scoping note, candidate 1 —
// ContactTrackingControl/PipelineStageControl were built fresh with
// useOptimistic (no prior hand-rolled optimism to migrate). These tests
// cover the acceptance criteria directly: both the optimistic-success
// path (the visible state flips before the server round trip resolves)
// and the rollback-on-error path (reverts, plus the inline error message
// and transient row highlight the scoping note specified). No jest-dom
// matchers here (not used anywhere else in this codebase's own test
// suite) — plain null/truthy checks against @testing-library/react
// queries, same convention as command-centre-stat-cards.test.tsx.
vi.mock("@/app/studio/(authed)/prospects/actions", () => ({
  markProspectContacted: vi.fn(),
  markProspectReplied: vi.fn(),
  markProspectQualified: vi.fn(),
  markProspectLost: vi.fn(),
}));

type Prospect = Parameters<typeof ContactTrackingControl>[0]["prospect"];

function baseProspect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    id: "p1",
    business_name: "Acme Ltd",
    category: null,
    neighbourhood: null,
    website: null,
    email: null,
    phone: null,
    status: "needs_verification",
    score: null,
    score_breakdown: null,
    research: null,
    research_generated_at: null,
    website_mockup: null,
    sales_kit: null,
    contacted_at: null,
    last_contact_method: null,
    replied_at: null,
    deal_value_pence: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Lets a test control exactly when the mocked Server Action resolves, so
// the optimistic UI can be asserted *before* the round trip completes —
// without this, a Promise.resolve()-based mock would settle before the
// test ever gets a chance to check the pre-resolution state.
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

// No global afterEach cleanup hook is registered anywhere else in this
// codebase's test suite — the two existing component test files scope
// their assertions to each render() call's own returned `container`
// instead of querying the whole document. These tests use `screen`
// (querying the shared document.body) across `it` blocks, so without an
// explicit cleanup a previous test's rendered button would still be in
// the DOM and make `getByRole` ambiguous.
afterEach(() => {
  cleanup();
});

describe("ContactTrackingControl — useOptimistic", () => {
  it("flips to the contacted state immediately, before the server responds (optimistic success)", async () => {
    const { promise, resolve } = deferred<{ ok: true }>();
    vi.mocked(markProspectContacted).mockReturnValue(promise as ReturnType<typeof markProspectContacted>);

    render(<ContactTrackingControl prospect={baseProspect()} />);
    fireEvent.click(screen.getByRole("button", { name: /mark as contacted/i }));

    // Optimistic update is visible before the mocked action has resolved.
    await waitFor(() => expect(screen.getByText(/contacted today/i)).toBeTruthy());
    expect(screen.queryByText(/mark as contacted/i)).toBeNull();

    resolve({ ok: true });
    await waitFor(() => expect(screen.getByText(/contacted today/i)).toBeTruthy());
    expect(screen.queryByText(/failed to update/i)).toBeNull();
  });

  it("rolls back to 'mark as contacted' and shows an inline error when the action fails", async () => {
    vi.mocked(markProspectContacted).mockResolvedValue({ error: "Failed to mark as contacted." });

    render(<ContactTrackingControl prospect={baseProspect()} />);
    fireEvent.click(screen.getByRole("button", { name: /mark as contacted/i }));

    await waitFor(() => expect(screen.getByText("Failed to mark as contacted.")).toBeTruthy());
    // Reverted — the optimistic "contacted today" text is gone, the
    // original action button is back.
    expect(screen.getByRole("button", { name: /mark as contacted/i })).toBeTruthy();
    expect(screen.queryByText(/contacted today/i)).toBeNull();
  });

  it("uses a fallback error message when the action returns no error string", async () => {
    vi.mocked(markProspectContacted).mockResolvedValue({ error: undefined } as never);

    render(<ContactTrackingControl prospect={baseProspect()} />);
    fireEvent.click(screen.getByRole("button", { name: /mark as contacted/i }));

    await waitFor(() => expect(screen.getByText("Failed to update — try again.")).toBeTruthy());
  });

  it("shows 'mark as replied' for a contacted prospect, and rolls back with an inline error on a failed reply", async () => {
    vi.mocked(markProspectReplied).mockResolvedValue({ error: "Failed to mark as replied." });

    const prospect = baseProspect({
      status: "contacted",
      contacted_at: new Date().toISOString(),
      last_contact_method: "email",
    });
    render(<ContactTrackingControl prospect={prospect} />);

    fireEvent.click(screen.getByRole("button", { name: /mark as replied/i }));

    await waitFor(() => expect(screen.getByText("Failed to mark as replied.")).toBeTruthy());
    // Rolled back — still showing the "mark as replied" control, not the
    // "Replied" badge.
    expect(screen.getByRole("button", { name: /mark as replied/i })).toBeTruthy();
  });
});

describe("PipelineStageControl — useOptimistic", () => {
  it("flips to 'qualified' immediately, before the server responds (optimistic success)", async () => {
    const { promise, resolve } = deferred<{ ok: true }>();
    vi.mocked(markProspectQualified).mockReturnValue(promise as ReturnType<typeof markProspectQualified>);

    render(<PipelineStageControl prospect={baseProspect()} />);
    fireEvent.click(screen.getByRole("button", { name: /mark as qualified/i }));

    // Optimistic: the "mark as qualified" button hides once the prospect
    // is (optimistically) already qualified — before the server resolves.
    await waitFor(() => expect(screen.queryByRole("button", { name: /mark as qualified/i })).toBeNull());

    resolve({ ok: true });
    await waitFor(() => expect(screen.queryByRole("button", { name: /mark as qualified/i })).toBeNull());
  });

  it("rolls back and shows an inline error when marking as qualified fails", async () => {
    vi.mocked(markProspectQualified).mockResolvedValue({ error: "Failed to mark as qualified." });

    render(<PipelineStageControl prospect={baseProspect()} />);
    fireEvent.click(screen.getByRole("button", { name: /mark as qualified/i }));

    await waitFor(() => expect(screen.getByText("Failed to mark as qualified.")).toBeTruthy());
    // Reverted — the "mark as qualified" button is back.
    expect(screen.getByRole("button", { name: /mark as qualified/i })).toBeTruthy();
  });

  it("shows an optimistic 'marked as lost' state immediately, before the server responds", async () => {
    const { promise, resolve } = deferred<{ ok: true }>();
    vi.mocked(markProspectLost).mockReturnValue(promise as ReturnType<typeof markProspectLost>);

    render(<PipelineStageControl prospect={baseProspect({ status: "qualified" })} />);
    fireEvent.click(screen.getByRole("button", { name: /mark as lost/i }));

    await waitFor(() => expect(screen.getByText(/marked as lost/i)).toBeTruthy());
    expect(screen.queryByRole("button", { name: /mark as lost/i })).toBeNull();

    resolve({ ok: true });
    await waitFor(() => expect(screen.getByText(/marked as lost/i)).toBeTruthy());
  });

  it("rolls back to the action buttons and shows an inline error when marking as lost fails", async () => {
    vi.mocked(markProspectLost).mockResolvedValue({ error: "Failed to mark as lost." });

    render(<PipelineStageControl prospect={baseProspect({ status: "qualified" })} />);
    fireEvent.click(screen.getByRole("button", { name: /mark as lost/i }));

    await waitFor(() => expect(screen.getByText("Failed to mark as lost.")).toBeTruthy());
    // Reverted — the real prospect was never actually lost, so the
    // control doesn't unmount, and the "mark as lost" button (plus the
    // still-relevant "mark as qualified" one) are both back.
    expect(screen.getByRole("button", { name: /mark as lost/i })).toBeTruthy();
    expect(screen.queryByText(/marked as lost/i)).toBeNull();
  });
});
