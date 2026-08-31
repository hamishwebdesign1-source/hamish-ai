// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, within, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { buildSectionContent } from "./command-centre-section-cards";
import type { Insight } from "@/lib/studio-insights";
import type { StudioBriefing } from "@/lib/studio-briefing";
import type { ClientEngagementRisk } from "@/lib/studio-engagement";
import type { ModelPerformanceWithCost } from "@/lib/studio-model-performance";
import type { AiAdoption } from "@/lib/studio-ai-adoption";
import type { ClientActivityItem } from "@/lib/studio-client-activity";
import type { ActionQueueItem } from "@/lib/studio-action-queue";
import { generateSalesKit, markProspectContacted } from "@/app/studio/(authed)/prospects/actions";
import { sendClientInvoiceReminderAction } from "@/app/studio/(authed)/clients/actions";
import { markRequestResponded } from "@/app/studio/(authed)/requests/actions";
import { updateProjectStatus } from "@/app/studio/(authed)/projects/actions";

// TopOpportunityKitAction (mounted by both the briefing and top_prospects
// cards below) calls useRouter() unconditionally on render, same
// next/navigation mock top-opportunity-kit-action.test.tsx already uses
// for this component — not exercised (no click) in most of this file's
// tests, just needed so the app-router-less jsdom render doesn't throw.
// QueueItemAction (mounted by actions_required rows) does the same.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Row-independence coverage below (backlog: "Wire the same outreach-kit
// action to Command Centre's Top Prospects list") drives real clicks, so
// this mocks generateSalesKit itself rather than letting the real Server
// Action run in a test environment with no real session/org.
// markProspectContacted (actions_required's follow-up rows) is mocked for
// the same reason.
vi.mock("@/app/studio/(authed)/prospects/actions", () => ({
  generateSalesKit: vi.fn(),
  markProspectContacted: vi.fn(),
}));

// Same reason as generateSalesKit above — SendInvoiceReminderAction
// (mounted under engagement_risk rows below) calls the real Server Action
// otherwise, with no real session/org in this test environment.
vi.mock("@/app/studio/(authed)/clients/actions", () => ({
  sendClientInvoiceReminderAction: vi.fn(),
}));

// actions_required's unanswered-request rows call this Server Action.
vi.mock("@/app/studio/(authed)/requests/actions", () => ({
  markRequestResponded: vi.fn(),
}));

// actions_required's overdue-project rows call this Server Action.
vi.mock("@/app/studio/(authed)/projects/actions", () => ({
  updateProjectStatus: vi.fn(),
}));

// Same regression this class of test guards against as
// command-centre-stat-cards.test.tsx - the 2026-08 UX/UI Director audit
// found bg-primary had drifted onto every card instead of exactly the
// one section (actions_required) genuinely meant to be featured. This
// is the automated check that drift can't happen silently again.

function emptyBriefing(): StudioBriefing {
  return {
    newThisWeek: 0,
    needsResearch: 0,
    readyToContact: 0,
    followUpsDue: 0,
    topOpportunity: null,
    topOpportunities: [],
    followUpsDueList: [],
  };
}

function emptyModelPerformance(): ModelPerformanceWithCost {
  return { callCount: 0, successRatePct: null, medianLatencyMs: null, estimatedCostUsd: null, estimatedCostGbp: null, fxRateFetchedAt: null };
}

function emptyAiAdoption(): AiAdoption {
  return { activeClientCount: 0, adoptedCount: 0, adoptionPct: null, usedCount: 0, totalMessages: 0 };
}

function baseParams(overrides: Partial<Parameters<typeof buildSectionContent>[0]> = {}): Parameters<typeof buildSectionContent>[0] {
  return {
    actionQueue: [],
    actionsTotal: 0,
    insights: [],
    hasBriefingContent: false,
    briefing: emptyBriefing(),
    engagementRisks: [],
    isInternalOrg: false,
    modelPerformance: emptyModelPerformance(),
    aiAdoption: emptyAiAdoption(),
    recentActivity: [],
    agencyHealth: { healthScore: null, components: [] },
    ...overrides,
  };
}

function cardClass(node: React.ReactNode): string | null {
  if (!node) return null;
  const { container } = render(node as React.ReactElement);
  return container.firstElementChild?.className ?? "";
}

const oneQueueItem: ActionQueueItem[] = [
  { id: "r1", kind: "unanswered_request", businessName: "Demo Client", detail: "Fix the contact form", href: "/studio/requests" },
];
const oneInsight: Insight[] = [{ id: "1", category: "opportunity", impact: "high", headline: "New prospects up 100%", evidence: "13 vs 0" }];
const oneEngagementRisk: ClientEngagementRisk[] = [
  {
    clientId: "c1",
    businessName: "Demo Client",
    tier: "warning",
    quietWeeks: 3,
    hasOverdueInvoice: false,
    overdueInvoiceId: null,
    reminderSentAt: null,
    weeks: [],
  },
];
const oneActivity: ClientActivityItem[] = [
  { id: "a1", kind: "client_joined", clientId: "c1", businessName: "Demo Client", detail: "joined", occurredAt: new Date().toISOString() },
];

describe("buildSectionContent — card tier regression guard", () => {
  it("actions_required is the one section that uses bg-primary", () => {
    const content = buildSectionContent(baseParams({ actionQueue: oneQueueItem, actionsTotal: 1 }));
    const cls = cardClass(content.actions_required);
    expect(cls).toContain("bg-primary");
  });

  it("every OTHER populated section uses bg-card, never bg-primary", () => {
    const content = buildSectionContent(
      baseParams({
        insights: oneInsight,
        hasBriefingContent: true,
        briefing: {
          ...emptyBriefing(),
          newThisWeek: 3,
          topOpportunities: [{ id: "p1", businessName: "Demo Client", pursueBecause: "No website found", overallScore: 4, hasSalesKit: false }],
        },
        engagementRisks: oneEngagementRisk,
        modelPerformance: { ...emptyModelPerformance(), callCount: 5, successRatePct: 100 },
        aiAdoption: { ...emptyAiAdoption(), activeClientCount: 2, adoptedCount: 1 },
        recentActivity: oneActivity,
        agencyHealth: { healthScore: 69, components: [{ label: "Site uptime", value: 100 }] },
      })
    );
    const nonPrimarySections = [
      "insights",
      "briefing",
      "engagement_risk",
      "model_performance",
      "client_ai_adoption",
      "top_prospects",
      "recent_activity",
      "health_breakdown",
    ] as const;
    for (const key of nonPrimarySections) {
      const cls = cardClass(content[key]);
      expect(cls, `${key} card class`).not.toBeNull();
      expect(cls, `${key} card class`).toContain("bg-card");
      expect(cls, `${key} card class`).not.toContain("bg-primary");
    }
  });
});

describe("buildSectionContent — only renders with real content", () => {
  it("actions_required is undefined when there is nothing due", () => {
    const content = buildSectionContent(baseParams({ actionQueue: [] }));
    expect(content.actions_required).toBeUndefined();
  });

  it("insights is undefined when there are no real insights", () => {
    const content = buildSectionContent(baseParams({ insights: [] }));
    expect(content.insights).toBeUndefined();
  });

  it("briefing is undefined when hasBriefingContent is false, even with a non-empty briefing object", () => {
    const content = buildSectionContent(baseParams({ hasBriefingContent: false, briefing: { ...emptyBriefing(), newThisWeek: 5 } }));
    expect(content.briefing).toBeUndefined();
  });

  it("engagement_risk is undefined when no client is actually at risk", () => {
    const content = buildSectionContent(baseParams({ engagementRisks: [] }));
    expect(content.engagement_risk).toBeUndefined();
  });

  it("model_performance is undefined when there have been zero real AI calls", () => {
    const content = buildSectionContent(baseParams({ modelPerformance: emptyModelPerformance() }));
    expect(content.model_performance).toBeUndefined();
  });

  it("client_ai_adoption is undefined when no client has it active", () => {
    const content = buildSectionContent(baseParams({ aiAdoption: emptyAiAdoption() }));
    expect(content.client_ai_adoption).toBeUndefined();
  });

  it("top_prospects is undefined when there are no scored opportunities", () => {
    const content = buildSectionContent(baseParams({ briefing: emptyBriefing() }));
    expect(content.top_prospects).toBeUndefined();
  });

  it("recent_activity is undefined when nothing real has happened yet", () => {
    const content = buildSectionContent(baseParams({ recentActivity: [] }));
    expect(content.recent_activity).toBeUndefined();
  });

  it("health_breakdown is undefined when there's no real health score yet", () => {
    const content = buildSectionContent(baseParams({ agencyHealth: { healthScore: null, components: [] } }));
    expect(content.health_breakdown).toBeUndefined();
  });
});

describe("buildSectionContent — real content spot checks", () => {
  it("shows the real business name and detail for a queued action, plus its one-click clear control", () => {
    const content = buildSectionContent(baseParams({ actionQueue: oneQueueItem, actionsTotal: 1 }));
    const { container } = render(content.actions_required as React.ReactElement);
    expect(container.textContent).toContain("Demo Client");
    expect(container.textContent).toContain("Fix the contact form");
    expect(within(container).getByRole("button", { name: /mark as responded/i })).toBeInTheDocument();
  });

  it("shows a '+N more' line only when the real total exceeds what's actually rendered", () => {
    const content = buildSectionContent(baseParams({ actionQueue: oneQueueItem, actionsTotal: 4 }));
    const { container } = render(content.actions_required as React.ReactElement);
    expect(container.textContent).toContain("+3 more");

    const exact = buildSectionContent(baseParams({ actionQueue: oneQueueItem, actionsTotal: 1 }));
    const { container: exactContainer } = render(exact.actions_required as React.ReactElement);
    expect(exactContainer.textContent).not.toContain("more");
  });

  it("shows a PRIORITY badge only for a high-impact insight", () => {
    const content = buildSectionContent(baseParams({ insights: oneInsight }));
    const { container } = render(content.insights as React.ReactElement);
    expect(container.textContent).toContain("Priority");

    const lowImpact = buildSectionContent(
      baseParams({ insights: [{ id: "2", category: "recommendation", impact: "low", headline: "Something minor", evidence: "x" }] })
    );
    const low = render(lowImpact.insights as React.ReactElement);
    expect(low.container.textContent).not.toContain("Priority");
  });

  it("shows the real health breakdown component labels and values", () => {
    const content = buildSectionContent(
      baseParams({ agencyHealth: { healthScore: 75, components: [{ label: "Site uptime", value: 88 }, { label: "Requests moving", value: 100 }] } })
    );
    const { container } = render(content.health_breakdown as React.ReactElement);
    expect(container.textContent).toContain("Site uptime");
    expect(container.textContent).toContain("88%");
    expect(container.textContent).toContain("Requests moving");
    expect(container.textContent).toContain("100%");
  });
});

// Fast-follow to the shipped topOpportunity callout action (backlog:
// "Wire the same outreach-kit action to Command Centre's Top Prospects
// list") — every row in the top_prospects card gets its own
// TopOpportunityKitAction instance, keyed off that row's own real
// id/hasSalesKit, with independent pending/success/error state.
describe("buildSectionContent — top_prospects outreach-kit action wiring", () => {
  function fiveOpportunities(): StudioBriefing["topOpportunities"] {
    return Array.from({ length: 5 }, (_, i) => ({
      id: `p${i + 1}`,
      businessName: `Prospect ${i + 1}`,
      pursueBecause: "No website found",
      overallScore: 5 - i,
      hasSalesKit: i === 4, // last row already has a kit
    }));
  }

  it("renders one Generate outreach kit control per row without an existing kit, and a ready link for the row that has one", () => {
    const content = buildSectionContent(baseParams({ briefing: { ...emptyBriefing(), topOpportunities: fiveOpportunities() } }));
    const { container } = render(content.top_prospects as React.ReactElement);
    const scope = within(container);

    expect(scope.getAllByRole("button", { name: /generate outreach kit/i })).toHaveLength(4);
    expect(scope.getByText(/outreach kit ready — open in prospects/i)).toBeInTheDocument();
  });

  it("one row entering pending/error does not affect a sibling row's independent state", async () => {
    vi.mocked(generateSalesKit).mockImplementation(
      (prospectId: string) =>
        Promise.resolve(prospectId === "p1" ? { error: "AI generation failed." } : { kit: {} }) as ReturnType<typeof generateSalesKit>
    );

    const content = buildSectionContent(baseParams({ briefing: { ...emptyBriefing(), topOpportunities: fiveOpportunities() } }));
    const { container } = render(content.top_prospects as React.ReactElement);
    const scope = within(container);

    const buttons = scope.getAllByRole("button", { name: /generate outreach kit/i });
    expect(buttons).toHaveLength(4); // rows 1-4; row 5 already has a kit

    fireEvent.click(buttons[0]); // row 1 (p1) -> errors
    await waitFor(() => expect(scope.getByRole("alert")).toHaveTextContent("AI generation failed."));

    // Exactly one alert exists (row 1's), and the other 3 resting buttons
    // (rows 2-4) are untouched and still enabled.
    expect(scope.getAllByRole("alert")).toHaveLength(1);
    expect(scope.getAllByRole("button", { name: /generate outreach kit/i })).toHaveLength(3);
    expect(scope.getAllByRole("button", { name: /generate outreach kit/i })[0]).toBeEnabled();

    fireEvent.click(scope.getAllByRole("button", { name: /generate outreach kit/i })[0]); // row 2 (p2) -> succeeds
    await waitFor(() => expect(scope.getAllByText(/outreach kit ready — open in prospects/i)).toHaveLength(2));

    // Row 1's error is still visible even after row 2 succeeded.
    expect(scope.getByRole("alert")).toHaveTextContent("AI generation failed.");
  });
});

// Backlog: "One-click 'Send payment reminder' on Command Centre's
// Engagement Risk card, for rows with a real overdue invoice."
describe("buildSectionContent — engagement risk 'Send payment reminder' wiring", () => {
  function riskWithOverdueInvoice(overrides: Partial<ClientEngagementRisk> = {}): ClientEngagementRisk[] {
    return [
      {
        clientId: "c1",
        businessName: "Demo Client",
        tier: "warning",
        quietWeeks: 0,
        hasOverdueInvoice: true,
        overdueInvoiceId: "inv-1",
        reminderSentAt: null,
        weeks: [],
        ...overrides,
      },
    ];
  }

  it("never renders the Send reminder control for a non-internal org, even with a real overdue invoice", () => {
    const content = buildSectionContent(baseParams({ engagementRisks: riskWithOverdueInvoice(), isInternalOrg: false }));
    const { container } = render(content.engagement_risk as React.ReactElement);
    expect(within(container).queryByRole("button", { name: /send reminder/i })).not.toBeInTheDocument();
    expect(container.textContent).toContain("Invoice overdue");
  });

  it("renders the Send reminder control for HamishAI's own internal org when a real overdue invoice exists", () => {
    const content = buildSectionContent(baseParams({ engagementRisks: riskWithOverdueInvoice(), isInternalOrg: true }));
    const { container } = render(content.engagement_risk as React.ReactElement);
    expect(within(container).getByRole("button", { name: /send reminder/i })).toBeInTheDocument();
  });

  it("renders as already-done, with no button, when a reminder has already been sent", () => {
    const content = buildSectionContent(
      baseParams({ engagementRisks: riskWithOverdueInvoice({ reminderSentAt: "2026-08-20T09:00:00Z" }), isInternalOrg: true })
    );
    const { container } = render(content.engagement_risk as React.ReactElement);
    const scope = within(container);
    expect(scope.getByText(/reminder sent/i)).toBeInTheDocument();
    expect(scope.queryByRole("button", { name: /send reminder/i })).not.toBeInTheDocument();
  });

  it("does not render the control at all for a row with no overdue invoice, even for the internal org", () => {
    const content = buildSectionContent(baseParams({ engagementRisks: oneEngagementRisk, isInternalOrg: true }));
    const { container } = render(content.engagement_risk as React.ReactElement);
    expect(within(container).queryByRole("button", { name: /send reminder/i })).not.toBeInTheDocument();
  });

  it("clicking Send reminder shows pending, then success", async () => {
    vi.mocked(sendClientInvoiceReminderAction).mockResolvedValue({ ok: true });
    const content = buildSectionContent(baseParams({ engagementRisks: riskWithOverdueInvoice(), isInternalOrg: true }));
    const { container } = render(content.engagement_risk as React.ReactElement);
    const scope = within(container);

    fireEvent.click(scope.getByRole("button", { name: /send reminder/i }));
    await waitFor(() => expect(scope.getByText(/reminder sent/i)).toBeInTheDocument());
    expect(sendClientInvoiceReminderAction).toHaveBeenCalledWith("inv-1");
  });

  it("shows an inline error and keeps the button if sending fails", async () => {
    vi.mocked(sendClientInvoiceReminderAction).mockResolvedValue({ error: "Invoice not found." });
    const content = buildSectionContent(baseParams({ engagementRisks: riskWithOverdueInvoice(), isInternalOrg: true }));
    const { container } = render(content.engagement_risk as React.ReactElement);
    const scope = within(container);

    fireEvent.click(scope.getByRole("button", { name: /send reminder/i }));
    await waitFor(() => expect(scope.getByRole("alert")).toHaveTextContent("Invoice not found."));
    expect(scope.getByRole("button", { name: /send reminder/i })).toBeEnabled();
  });
});

// Command Centre improvement #1 ("cleared queue, not a dashboard") — each
// of the three real row kinds gets its own one-click clearing action,
// wired to the exact Server Action its own dedicated page already uses.
describe("buildSectionContent — actions_required queue clearing wiring", () => {
  it("clicking 'Mark as contacted' on a follow-up row shows pending, then done, calling markProspectContacted with the real prospect id", async () => {
    vi.mocked(markProspectContacted).mockResolvedValue({ ok: true });
    const queue: ActionQueueItem[] = [{ id: "p1", kind: "follow_up", businessName: "Acme", detail: "Due a call", href: "/studio/prospects" }];
    const content = buildSectionContent(baseParams({ actionQueue: queue, actionsTotal: 1 }));
    const { container } = render(content.actions_required as React.ReactElement);
    const scope = within(container);

    fireEvent.click(scope.getByRole("button", { name: /mark as contacted/i }));
    await waitFor(() => expect(scope.getByText(/marked as contacted/i)).toBeInTheDocument());
    expect(markProspectContacted).toHaveBeenCalledWith("p1");
  });

  it("clicking 'Mark as responded' on an unanswered-request row calls markRequestResponded with the real request id", async () => {
    vi.mocked(markRequestResponded).mockResolvedValue({ ok: true });
    const content = buildSectionContent(baseParams({ actionQueue: oneQueueItem, actionsTotal: 1 }));
    const { container } = render(content.actions_required as React.ReactElement);
    const scope = within(container);

    fireEvent.click(scope.getByRole("button", { name: /mark as responded/i }));
    await waitFor(() => expect(scope.getByText(/marked as responded/i)).toBeInTheDocument());
    expect(markRequestResponded).toHaveBeenCalledWith("r1");
  });

  it("clicking 'Mark done' on an overdue-project row calls updateProjectStatus with the real project id and 'done'", async () => {
    vi.mocked(updateProjectStatus).mockResolvedValue({ ok: true });
    const queue: ActionQueueItem[] = [
      { id: "proj1", kind: "overdue_project", businessName: "Acme", detail: "Website redesign — target date was 3 days ago", href: "/studio/projects" },
    ];
    const content = buildSectionContent(baseParams({ actionQueue: queue, actionsTotal: 1 }));
    const { container } = render(content.actions_required as React.ReactElement);
    const scope = within(container);

    fireEvent.click(scope.getByRole("button", { name: /mark done/i }));
    await waitFor(() => expect(scope.getByText(/marked done/i)).toBeInTheDocument());
    expect(updateProjectStatus).toHaveBeenCalledWith("proj1", "done");
  });

  it("one row's error doesn't affect a sibling row's independent state", async () => {
    vi.mocked(markProspectContacted).mockResolvedValue({ error: "Failed to mark as contacted." });
    vi.mocked(markRequestResponded).mockResolvedValue({ ok: true });
    const queue: ActionQueueItem[] = [
      { id: "p1", kind: "follow_up", businessName: "Acme", detail: "Due a call", href: "/studio/prospects" },
      { id: "r1", kind: "unanswered_request", businessName: "Beta Co", detail: "Fix the form", href: "/studio/requests" },
    ];
    const content = buildSectionContent(baseParams({ actionQueue: queue, actionsTotal: 2 }));
    const { container } = render(content.actions_required as React.ReactElement);
    const scope = within(container);

    fireEvent.click(scope.getByRole("button", { name: /mark as contacted/i }));
    await waitFor(() => expect(scope.getByRole("alert")).toHaveTextContent("Failed to mark as contacted."));

    fireEvent.click(scope.getByRole("button", { name: /mark as responded/i }));
    await waitFor(() => expect(scope.getByText(/marked as responded/i)).toBeInTheDocument());

    // Row 1's error and its still-enabled retry button are untouched by
    // row 2 succeeding.
    expect(scope.getByRole("alert")).toHaveTextContent("Failed to mark as contacted.");
    expect(scope.getByRole("button", { name: /mark as contacted/i })).toBeEnabled();
  });
});
