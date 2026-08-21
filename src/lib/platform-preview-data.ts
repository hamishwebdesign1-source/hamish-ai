// /platform hero product panel — illustrative demo data only. Named
// after a fictional business precisely so it reads as an example, never
// a real client (same "Illustrative example — fictional data" labelling
// convention analytics/command-centre.tsx already established for the
// exact same reason on /analytics).

export type PipelineStage = { id: string; label: string; value: number };

export const pipelineStages: PipelineStage[] = [
  { id: "discovered", label: "Discovered", value: 24 },
  { id: "analysed", label: "Analysed", value: 18 },
  { id: "outreach", label: "Outreach", value: 11 },
  { id: "replies", label: "Replies", value: 7 },
  { id: "qualified", label: "Qualified", value: 3 },
  { id: "client", label: "Client", value: 2 },
];

export type HeroMetric = { id: string; label: string; value: string };

export const heroMetrics: HeroMetric[] = [
  { id: "pipeline", label: "Pipeline", value: "£12,480" },
  { id: "prospects", label: "Prospects", value: "127" },
  { id: "analysed", label: "AI analysed", value: "34" },
  { id: "outreach", label: "Outreach ready", value: "18" },
];

export type ActivityEventKind = "discovery" | "analysis" | "outreach" | "report";

export type ActivityEvent = {
  id: string;
  kind: ActivityEventKind;
  label: string;
  detail: string;
};

// Ordered oldest-to-newest as they're revealed by the animation cycle —
// hero-product-panel.tsx reveals a growing prefix of this list, newest
// item last, then resets.
export const activityFeed: ActivityEvent[] = [
  { id: "discover", kind: "discovery", label: "New prospect discovered", detail: "Edinburgh Dental" },
  { id: "analyse", kind: "analysis", label: "AI analysis completed", detail: "Edinburgh Dental — score 87" },
  { id: "outreach", kind: "outreach", label: "Personalised outreach generated", detail: "Edinburgh Dental" },
  { id: "report", kind: "report", label: "Client analytics updated", detail: "Example Client" },
];

export const aiAnalysisDemo = {
  business: "Edinburgh Dental",
  channel: "Website",
  score: 62,
  opportunities: ["Poor conversion journey", "No AI receptionist", "Weak enquiry capture", "Limited analytics"],
  recommendedService: "AI Lead Generation",
  opportunityScore: 87,
};
