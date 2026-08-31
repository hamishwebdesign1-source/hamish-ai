// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AlertTriangle } from "lucide-react";
import { buildSectionContent, type ActionRequiredItem } from "./command-centre-section-cards";
import type { Insight } from "@/lib/studio-insights";
import type { StudioBriefing } from "@/lib/studio-briefing";
import type { ClientEngagementRisk } from "@/lib/studio-engagement";
import type { ModelPerformanceWithCost } from "@/lib/studio-model-performance";
import type { AiAdoption } from "@/lib/studio-ai-adoption";
import type { ClientActivityItem } from "@/lib/studio-client-activity";

// Same regression this class of test guards against as
// command-centre-stat-cards.test.tsx - the 2026-08 UX/UI Director audit
// found bg-primary had drifted onto every card instead of exactly the
// one section (actions_required) genuinely meant to be featured. This
// is the automated check that drift can't happen silently again.

function emptyBriefing(): StudioBriefing {
  return { newThisWeek: 0, needsResearch: 0, readyToContact: 0, followUpsDue: 0, topOpportunity: null, topOpportunities: [] };
}

function emptyModelPerformance(): ModelPerformanceWithCost {
  return { callCount: 0, successRatePct: null, medianLatencyMs: null, estimatedCostUsd: null, estimatedCostGbp: null, fxRateFetchedAt: null };
}

function emptyAiAdoption(): AiAdoption {
  return { activeClientCount: 0, adoptedCount: 0, adoptionPct: null, usedCount: 0, totalMessages: 0 };
}

function baseParams(overrides: Partial<Parameters<typeof buildSectionContent>[0]> = {}): Parameters<typeof buildSectionContent>[0] {
  return {
    actionsRequired: [],
    insights: [],
    hasBriefingContent: false,
    briefing: emptyBriefing(),
    engagementRisks: [],
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

const oneActionRequired: ActionRequiredItem[] = [{ count: 1, label: "request awaiting your reply", href: "/studio/requests", icon: AlertTriangle }];
const oneInsight: Insight[] = [{ id: "1", category: "opportunity", impact: "high", headline: "New prospects up 100%", evidence: "13 vs 0" }];
const oneEngagementRisk: ClientEngagementRisk[] = [
  { clientId: "c1", businessName: "Demo Client", tier: "warning", quietWeeks: 3, hasOverdueInvoice: false, weeks: [] },
];
const oneActivity: ClientActivityItem[] = [
  { id: "a1", kind: "client_joined", clientId: "c1", businessName: "Demo Client", detail: "joined", occurredAt: new Date().toISOString() },
];

describe("buildSectionContent — card tier regression guard", () => {
  it("actions_required is the one section that uses bg-primary", () => {
    const content = buildSectionContent(baseParams({ actionsRequired: oneActionRequired }));
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
    const content = buildSectionContent(baseParams({ actionsRequired: [] }));
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
  it("shows the real count and label for an action-required item", () => {
    const content = buildSectionContent(baseParams({ actionsRequired: oneActionRequired }));
    const { container } = render(content.actions_required as React.ReactElement);
    expect(container.textContent).toContain("1");
    expect(container.textContent).toContain("request awaiting your reply");
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
