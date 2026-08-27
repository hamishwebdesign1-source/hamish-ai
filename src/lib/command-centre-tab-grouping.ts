import type { Block } from "@/lib/command-centre-layout";

// Home page tabs — a presentation-only grouping, not a block-canvas
// concept. Settings → Command Centre layout still owns which blocks
// exist, their order, and their width; this only decides which of 4
// tabs a given non-stat block's card renders under on the home page
// itself. Stat cards stay outside the tabs entirely, in their own
// always-visible row above — the same "shouldn't be hidden" reasoning
// today-strip.tsx's own comment already gives for the TODAY masthead
// applies just as much to the org's own headline numbers.
//
// Pulled out of page.tsx (the real-improvement pass's own audit flagged
// that file at 1,197 lines) — this is the one piece of that file's own
// logic that's genuinely pure and self-contained, taking only a Block
// and nothing from the page's own closure, so it's a safe extraction on
// its own merits, not a token gesture toward a fuller split. The stat-
// card and section-content builders stay in page.tsx: both close over
// two dozen+ page-scope values (agencyHealth, briefing, analytics,
// membership, …), and turning those into safely-parameterised functions
// is real, careful work this pass didn't want to rush through at the
// tail end of a ten-item batch.
export type CommandCentreTabId = "overview" | "prospects" | "clients" | "performance";

export const COMMAND_CENTRE_TAB_ORDER: CommandCentreTabId[] = ["overview", "prospects", "clients", "performance"];

export const COMMAND_CENTRE_TAB_LABELS: Record<CommandCentreTabId, string> = {
  overview: "Overview",
  prospects: "Prospects",
  clients: "Clients",
  performance: "Performance",
};

export function blockTab(block: Block): CommandCentreTabId {
  switch (block.type) {
    case "actions_required":
    case "insights":
    case "health_breakdown":
    case "text":
    case "cta":
      return "overview";
    case "briefing":
    case "top_prospects":
      return "prospects";
    case "engagement_risk":
    case "recent_activity":
    case "client_ai_adoption":
      return "clients";
    case "model_performance":
      return "performance";
    case "chart":
      // adoption is a Performance metric; revenue/prospects both read
      // as pipeline numbers, so they sit with the rest of Prospects.
      return block.metric === "adoption" ? "performance" : "prospects";
    default:
      return "overview";
  }
}
