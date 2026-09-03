import { describe, it, expect, vi, beforeEach } from "vitest";

// Same mocking shape as clients/actions.test.ts's own — the first
// ownership-check tests for this file, so no local convention to
// reuse beyond that one.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const auditLogMock = vi.fn();
vi.mock("@/lib/audit-log", () => ({
  logAuditEvent: (...args: unknown[]) => auditLogMock(...args),
}));

const notifyAssigneeMock = vi.fn();
vi.mock("@/lib/team-members", () => ({
  notifyAssignee: (...args: unknown[]) => notifyAssigneeMock(...args),
}));

const getUserWithRetryMock = vi.fn();
vi.mock("@/lib/supabase-server-auth", () => ({
  createServerSupabaseClient: async () => ({}),
  getUserWithRetry: (...args: unknown[]) => getUserWithRetryMock(...args),
}));

const getOrgMembershipMock = vi.fn();
vi.mock("@/lib/org-membership", () => ({
  getOrgMembership: (...args: unknown[]) => getOrgMembershipMock(...args),
}));

const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

beforeEach(() => {
  vi.resetModules();
  auditLogMock.mockReset();
  notifyAssigneeMock.mockReset();
  getUserWithRetryMock.mockReset();
  getOrgMembershipMock.mockReset();
  getSupabaseAdminMock.mockReset();
  getUserWithRetryMock.mockResolvedValue({ data: { user: { email: "owner@org-a.example.com" } } });
  getOrgMembershipMock.mockResolvedValue({ orgId: "org-a" });
});

describe("updateProjectStage", () => {
  it("rejects a project belonging to another org, and never writes", async () => {
    const update = vi.fn();
    getSupabaseAdminMock.mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
        update,
      }),
    });
    const { updateProjectStage } = await import("./actions");

    const result = await updateProjectStage("project-owned-by-org-b", "in_progress");

    expect(result).toEqual({ error: "Project not found." });
    expect(update).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("rejects a stage value outside the real 5-stage pipeline before touching the database at all", async () => {
    const select = vi.fn();
    getSupabaseAdminMock.mockReturnValue({ from: () => ({ select }) });
    const { updateProjectStage } = await import("./actions");

    const result = await updateProjectStage("project-1", "approved");

    expect(result).toEqual({ error: "Not a valid stage." });
    expect(select).not.toHaveBeenCalled();
  });

  it("writes both stage and the derived status, and logs project.stage_changed with from/to metadata", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    getSupabaseAdminMock.mockReturnValue({
      from: (table: string) => {
        if (table === "projects") {
          return {
            select: () => ({
              eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "project-1", stage: "not_started" }, error: null }) }) }),
            }),
            update: (patch: Record<string, unknown>) => ({ eq: () => updateEq(patch) }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    });
    const { updateProjectStage } = await import("./actions");

    const result = await updateProjectStage("project-1", "client_review");

    expect(result).toEqual({ ok: true });
    expect(updateEq).toHaveBeenCalledWith({ stage: "client_review", status: "active" });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "project.stage_changed",
        targetId: "project-1",
        orgId: "org-a",
        metadata: { from: "not_started", to: "client_review" },
      })
    );
  });

  it("derives status: 'done' only for the completed stage", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    getSupabaseAdminMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "project-1", stage: "client_review" }, error: null }) }) }),
        }),
        update: (patch: Record<string, unknown>) => ({ eq: () => updateEq(patch) }),
      }),
    });
    const { updateProjectStage } = await import("./actions");

    await updateProjectStage("project-1", "completed");

    expect(updateEq).toHaveBeenCalledWith({ stage: "completed", status: "done" });
  });

  it("does not log an audit event when the stage hasn't actually changed", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    getSupabaseAdminMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "project-1", stage: "in_progress" }, error: null }) }) }),
        }),
        update: (patch: Record<string, unknown>) => ({ eq: () => updateEq(patch) }),
      }),
    });
    const { updateProjectStage } = await import("./actions");

    await updateProjectStage("project-1", "in_progress");

    expect(auditLogMock).not.toHaveBeenCalled();
  });
});

describe("createProjectTask", () => {
  it("rejects a project belonging to another org, and never inserts a task", async () => {
    const insert = vi.fn();
    getSupabaseAdminMock.mockReturnValue({
      from: (table: string) =>
        table === "projects"
          ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }
          : { insert },
    });
    const { createProjectTask } = await import("./actions");

    const result = await createProjectTask("project-owned-by-org-b", "Draft homepage copy", null);

    expect(result).toEqual({ error: "Project not found." });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a blank title before any query runs", async () => {
    const from = vi.fn();
    getSupabaseAdminMock.mockReturnValue({ from });
    const { createProjectTask } = await import("./actions");

    const result = await createProjectTask("project-1", "   ", null);

    expect(result).toEqual({ error: "Give the task a title." });
    expect(from).not.toHaveBeenCalled();
  });

  it("inserts a manually-added task with request_id null, scoped to the owned project", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    getSupabaseAdminMock.mockReturnValue({
      from: (table: string) =>
        table === "projects"
          ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "project-1" }, error: null }) }) }) }) }
          : { insert },
    });
    const { createProjectTask } = await import("./actions");

    const result = await createProjectTask("project-1", "Draft homepage copy", "First pass, needs client sign-off");

    expect(result).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith({
      request_id: null,
      project_id: "project-1",
      title: "Draft homepage copy",
      description: "First pass, needs client sign-off",
      status: "todo",
    });
  });
});

describe("updateProjectTaskStatus", () => {
  it("rejects a task with no project_id at all (a request-triaged task never assigned to a project)", async () => {
    const update = vi.fn();
    getSupabaseAdminMock.mockReturnValue({
      from: (table: string) =>
        table === "tasks"
          ? { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "task-1", project_id: null }, error: null }) }) }) }
          : { update },
    });
    const { updateProjectTaskStatus } = await import("./actions");

    const result = await updateProjectTaskStatus("task-1", "done");

    expect(result).toEqual({ error: "Task not found." });
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a task whose project belongs to another org, and never writes", async () => {
    const update = vi.fn();
    getSupabaseAdminMock.mockReturnValue({
      from: (table: string) => {
        if (table === "tasks") {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "task-1", project_id: "project-owned-by-org-b" }, error: null }) }) }) };
        }
        if (table === "projects") {
          return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) };
        }
        return { update };
      },
    });
    const { updateProjectTaskStatus } = await import("./actions");

    const result = await updateProjectTaskStatus("task-1", "done");

    expect(result).toEqual({ error: "Task not found." });
    expect(update).not.toHaveBeenCalled();
  });

  it("updates a manually-added task's status (request_id null) once its project ownership is confirmed", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    getSupabaseAdminMock.mockReturnValue({
      from: (table: string) => {
        if (table === "tasks") {
          return {
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "task-1", project_id: "project-1" }, error: null }) }) }),
            update: (patch: Record<string, unknown>) => ({ eq: () => updateEq(patch) }),
          };
        }
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "project-1" }, error: null }) }) }) }) };
      },
    });
    const { updateProjectTaskStatus } = await import("./actions");

    const result = await updateProjectTaskStatus("task-1", "done");

    expect(result).toEqual({ ok: true });
    expect(updateEq).toHaveBeenCalledWith({ status: "done" });
  });
});

describe("createProject", () => {
  it("rejects a client belonging to another org, and never inserts", async () => {
    const insert = vi.fn();
    getSupabaseAdminMock.mockReturnValue({
      from: (table: string) =>
        table === "clients"
          ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }
          : { insert },
    });
    const { createProject } = await import("./actions");

    const result = await createProject("client-owned-by-org-b", "Website redesign", null);

    expect(result).toEqual({ error: "Client not found." });
    expect(insert).not.toHaveBeenCalled();
  });

  it("creates the project at stage 'not_started', status 'active', and logs project.created", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "new-project-1" }, error: null });
    getSupabaseAdminMock.mockReturnValue({
      from: (table: string) =>
        table === "clients"
          ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "client-1" }, error: null }) }) }) }) }
          : { insert: () => ({ select: () => ({ single }) }) },
    });
    const { createProject } = await import("./actions");

    const result = await createProject("client-1", "Website redesign", null);

    expect(result).toEqual({ ok: true });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "project.created", targetId: "new-project-1", orgId: "org-a" })
    );
  });
});

describe("deleteProject", () => {
  it("rejects a project belonging to another org, and never deletes or unassigns its tasks", async () => {
    const deleteFn = vi.fn();
    const taskUpdate = vi.fn();
    getSupabaseAdminMock.mockReturnValue({
      from: (table: string) => {
        if (table === "projects") {
          return {
            select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
            delete: deleteFn,
          };
        }
        return { update: taskUpdate };
      },
    });
    const { deleteProject } = await import("./actions");

    const result = await deleteProject("project-owned-by-org-b");

    expect(result).toEqual({ error: "Project not found." });
    expect(deleteFn).not.toHaveBeenCalled();
    expect(taskUpdate).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("logs project.deleted once ownership is confirmed and the row is actually removed", async () => {
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    getSupabaseAdminMock.mockReturnValue({
      from: (table: string) => {
        if (table === "projects") {
          return {
            select: () => ({
              eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "project-1", name: "Website redesign" }, error: null }) }) }),
            }),
            delete: () => ({ eq: deleteEq }),
          };
        }
        return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
      },
    });
    const { deleteProject } = await import("./actions");

    const result = await deleteProject("project-1");

    expect(result).toEqual({ ok: true });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "project.deleted", targetId: "project-1", orgId: "org-a", metadata: { name: "Website redesign" } })
    );
  });
});
