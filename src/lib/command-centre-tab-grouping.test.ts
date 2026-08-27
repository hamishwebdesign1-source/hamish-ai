import { describe, it, expect } from "vitest";
import { blockTab, COMMAND_CENTRE_TAB_ORDER, COMMAND_CENTRE_TAB_LABELS, type CommandCentreTabId } from "./command-centre-tab-grouping";
import type { Block } from "./command-centre-layout";

describe("blockTab", () => {
  it("groups every section-type block under its documented tab", () => {
    const cases: [Block["type"], CommandCentreTabId][] = [
      ["actions_required", "overview"],
      ["insights", "overview"],
      ["health_breakdown", "overview"],
      ["briefing", "prospects"],
      ["top_prospects", "prospects"],
      ["engagement_risk", "clients"],
      ["recent_activity", "clients"],
      ["client_ai_adoption", "clients"],
      ["model_performance", "performance"],
    ];
    for (const [type, expected] of cases) {
      expect(blockTab({ id: type, type } as Block)).toBe(expected);
    }
  });

  it("puts a stat card block on the overview tab", () => {
    expect(blockTab({ id: "stat:health", type: "stat", cardId: "health", span: 1 })).toBe("overview");
  });

  it("routes an adoption chart to Performance, not Prospects", () => {
    expect(blockTab({ id: "chart:1", type: "chart", metric: "adoption", kind: "area", range: "30d", span: 2 })).toBe("performance");
  });

  it("routes revenue and prospect charts to Prospects, not Performance", () => {
    expect(blockTab({ id: "chart:1", type: "chart", metric: "revenue", kind: "bar", range: "30d", span: 2 })).toBe("prospects");
    expect(blockTab({ id: "chart:2", type: "chart", metric: "prospects", kind: "area", range: "7d", span: 2 })).toBe("prospects");
  });

  it("puts freeform text and cta blocks on overview", () => {
    expect(blockTab({ id: "text:1", type: "text", title: "t", body: "b", span: 1 })).toBe("overview");
    expect(blockTab({ id: "cta:1", type: "cta", label: "l", href: "/x", span: 1 })).toBe("overview");
  });

  it("keeps the tab order and labels in sync with every CommandCentreTabId", () => {
    const ids: CommandCentreTabId[] = ["overview", "prospects", "clients", "performance"];
    expect(COMMAND_CENTRE_TAB_ORDER).toEqual(ids);
    for (const id of ids) {
      expect(COMMAND_CENTRE_TAB_LABELS[id]).toBeTruthy();
    }
  });
});
