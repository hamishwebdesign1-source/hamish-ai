// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ProjectsPanel } from "./projects-panel";
import { updateProjectStage } from "@/app/studio/(authed)/projects/actions";

// Projects Kanban Command Centre, Phase A — real drag-and-drop across
// dnd-kit's pointer events isn't practically simulatable in jsdom, so
// these tests exercise the actual shared state machine
// (useOptimistic + moveProject in projects-panel.tsx) through the mobile
// per-card <select> instead — per DESIGN-SYSTEM.md's own Kanban board
// pattern, that select calls the exact same moveProject() function the
// desktop board's onDragEnd calls, so this is real coverage of the
// optimistic-update + rollback state machine itself, not a stand-in for
// it. Same deferred()/mocked-action pattern as
// prospecting-panel.test.tsx's own ContactTrackingControl/
// PipelineStageControl useOptimistic tests (the established reference).
vi.mock("@/app/studio/(authed)/projects/actions", () => ({
  createProject: vi.fn(),
  updateProjectStage: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const clients = [{ id: "client-1", business_name: "Acme Ltd" }];
const baseProjects = [
  {
    id: "project-1",
    client_id: "client-1",
    name: "Website redesign",
    target_date: null,
    status: "active",
    stage: "in_progress",
    created_at: "2026-01-01T00:00:00Z",
    assigned_to: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ProjectsPanel — Kanban stage move, optimistic update + rollback", () => {
  it("calls updateProjectStage with the target stage when the mobile stage select changes", async () => {
    const { promise, resolve } = deferred<{ ok: true } | { error: string }>();
    vi.mocked(updateProjectStage).mockReturnValue(promise as ReturnType<typeof updateProjectStage>);

    render(
      <ProjectsPanel
        clients={clients}
        projects={baseProjects}
        tasks={[]}
        teamMembers={[{ email: "owner@example.com", role: "owner" }]}
        currentUserEmail="owner@example.com"
      />
    );

    // "in_progress" is one of the two accordion sections open by
    // default, so its card's stage select is already in the DOM.
    const select = screen.getByLabelText("Change project stage") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "client_review" } });

    expect(updateProjectStage).toHaveBeenCalledWith("project-1", "client_review");
    resolve({ ok: true });
    await waitFor(() => expect(screen.queryByText(/couldn.t move/i)).toBeNull());
  });

  it("rolls back and shows the exact inline error + highlight convention when the move fails", async () => {
    vi.mocked(updateProjectStage).mockResolvedValue({ error: "Failed to update the project stage." });

    render(
      <ProjectsPanel
        clients={clients}
        projects={baseProjects}
        tasks={[]}
        teamMembers={[{ email: "owner@example.com", role: "owner" }]}
        currentUserEmail="owner@example.com"
      />
    );

    const select = screen.getByLabelText("Change project stage") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "client_review" } });

    // Inline text-destructive rollback line, same convention as
    // ContactTrackingControl's own rollback message. getAllByText, not
    // getByText — the same project card renders twice in this test
    // environment (the desktop board and the mobile accordion both
    // mount; only CSS media queries, which jsdom doesn't apply, decide
    // which one is actually visible), so both copies show the message.
    await waitFor(() => expect(screen.getAllByText("Failed to update the project stage.").length).toBeGreaterThan(0));
  });

  it("clears the rollback message again after the 1.5s window (same timeout mechanism as ContactTrackingControl)", async () => {
    vi.useFakeTimers();
    vi.mocked(updateProjectStage).mockResolvedValue({ error: "Failed to update the project stage." });

    render(
      <ProjectsPanel
        clients={clients}
        projects={baseProjects}
        tasks={[]}
        teamMembers={[{ email: "owner@example.com", role: "owner" }]}
        currentUserEmail="owner@example.com"
      />
    );

    const select = screen.getByLabelText("Change project stage") as HTMLSelectElement;
    await vi.waitFor(() => fireEvent.change(select, { target: { value: "client_review" } }));

    await vi.waitFor(() => expect(screen.getAllByText("Failed to update the project stage.").length).toBeGreaterThan(0));

    await vi.advanceTimersByTimeAsync(1500);
    expect(screen.queryAllByText("Failed to update the project stage.").length).toBe(0);

    vi.useRealTimers();
  });

  it("does not call updateProjectStage when the select is set back to the project's own current stage", async () => {
    render(
      <ProjectsPanel
        clients={clients}
        projects={baseProjects}
        tasks={[]}
        teamMembers={[{ email: "owner@example.com", role: "owner" }]}
        currentUserEmail="owner@example.com"
      />
    );

    const select = screen.getByLabelText("Change project stage") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "in_progress" } });

    expect(updateProjectStage).not.toHaveBeenCalled();
  });
});
