// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { buildStatContent } from "./command-centre-stat-cards";
import type { ClientHealth } from "@/lib/client-health";
import type { HealthTrend } from "@/lib/studio-health-history";

// The actual regression QA flagged during the 2026-08 Command Centre
// audit: zero test coverage over these card renderers meant a future
// accidental revert of the bg-primary -> bg-card tiering fix wouldn't be
// caught by `npm run test`. These tests exist specifically to catch that
// class of regression, not to exhaustively snapshot every card's markup.
//
// CountUp and HealthRing both read window.matchMedia(prefers-reduced-
// motion) directly and, when it matches, render their final value
// synchronously instead of animating via requestAnimationFrame - jsdom
// has no real frame loop, so without this stub the animated value would
// still read 0 immediately after render(), making any text-content
// assertion flaky/wrong rather than testing real behaviour.
beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

function health(overrides: Partial<ClientHealth> = {}): ClientHealth {
  return { healthScore: 69, components: [{ label: "Site uptime", value: 100 }], ...overrides };
}

function baseParams(overrides: Partial<Parameters<typeof buildStatContent>[0]> = {}) {
  return {
    agencyHealth: health(),
    healthTrend: null as HealthTrend | null,
    prospectCount: 13,
    clientCount: 1,
    pipelineValuePence: 0,
    ...overrides,
  };
}

function renderCard(node: React.ReactNode) {
  return render(node as React.ReactElement);
}

function cardClass(node: React.ReactNode): string {
  return renderCard(node).container.firstElementChild?.className ?? "";
}

describe("buildStatContent — card tier regression guard", () => {
  it("every one of the 5 stat cards uses bg-card, never bg-primary", () => {
    const content = buildStatContent(baseParams());
    for (const key of ["health", "prospects", "clients", "conversion", "pipeline"] as const) {
      const cls = cardClass(content[key]);
      expect(cls, `${key} card class`).toContain("bg-card");
      expect(cls, `${key} card class`).not.toContain("bg-primary");
    }
  });

  it("still uses bg-card even in the health card's 'not enough data yet' branch", () => {
    const content = buildStatContent(baseParams({ agencyHealth: health({ healthScore: null, components: [] }) }));
    const cls = cardClass(content.health);
    expect(cls).toContain("bg-card");
    expect(cls).not.toContain("bg-primary");
  });
});

describe("buildStatContent — real content", () => {
  it("shows the real health score via HealthRing when there is one", () => {
    const { container } = renderCard(buildStatContent(baseParams({ agencyHealth: health({ healthScore: 69 }) })).health);
    expect(container.textContent).toContain("69");
  });

  it("shows a real 'not enough data yet' message when the health score is null", () => {
    const { container } = renderCard(buildStatContent(baseParams({ agencyHealth: health({ healthScore: null, components: [] }) })).health);
    expect(container.textContent).toContain("Not enough data yet");
  });

  it("shows a real health trend delta when one is provided, not a generic message", () => {
    const { container } = renderCard(buildStatContent(baseParams({ healthTrend: { deltaValue: 5, daysAgo: 7 } })).health);
    expect(container.textContent).toContain("+5");
    expect(container.textContent).toContain("7d ago");
    expect(container.textContent).not.toContain("See breakdown below");
  });

  it("falls back to a generic message when there is no trend data yet", () => {
    const { container } = renderCard(buildStatContent(baseParams({ healthTrend: null })).health);
    expect(container.textContent).toContain("See breakdown below");
  });

  it("shows the real prospect and client counts", () => {
    const content = buildStatContent(baseParams({ prospectCount: 42, clientCount: 3 }));
    expect(renderCard(content.prospects).container.textContent).toContain("42");
    expect(renderCard(content.clients).container.textContent).toContain("3");
  });

  it("shows a real em-dash for conversion rate when there are zero prospects to divide by", () => {
    const { container } = renderCard(buildStatContent(baseParams({ prospectCount: 0, clientCount: 0 })).conversion);
    expect(container.textContent).toContain("—");
  });

  it("shows a real computed conversion percentage when there are prospects", () => {
    const { container } = renderCard(buildStatContent(baseParams({ prospectCount: 10, clientCount: 3 })).conversion);
    expect(container.textContent).toContain("30%");
  });

  it("shows real pipeline value converted from pence to pounds", () => {
    const { container } = renderCard(buildStatContent(baseParams({ pipelineValuePence: 250000 })).pipeline);
    expect(container.textContent).toContain("£2,500");
  });

  it("shows £0 plainly for zero pipeline value, not a blank or dash", () => {
    const { container } = renderCard(buildStatContent(baseParams({ pipelineValuePence: 0 })).pipeline);
    expect(container.textContent).toContain("£0");
  });
});
