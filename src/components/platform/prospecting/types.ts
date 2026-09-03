// Shared types for the prospecting/ split (Studio Design Audit, Tier 1
// build item #3 — extracted from prospecting-panel.tsx, which had grown
// to 1,920 lines with no internal file boundaries). Pure extraction, no
// shape change — every field here matches the flat list prospects/page.tsx
// fetches.
import type { LeadResearch, ScoreBreakdown } from "@/lib/research-lead";
import type { WebsiteMockup } from "@/lib/draft-website-mockup";
import type { SalesKit } from "@/lib/draft-sales-kit";

export type Prospect = {
  id: string;
  business_name: string;
  category: string | null;
  neighbourhood: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  score: number | null;
  score_breakdown: ScoreBreakdown | null;
  research: LeadResearch | null;
  research_generated_at: string | null;
  website_mockup: WebsiteMockup | null;
  sales_kit: SalesKit | null;
  contacted_at: string | null;
  last_contact_method: string | null;
  replied_at: string | null;
  deal_value_pence: number | null;
  created_at: string;
  assigned_to: string | null;
};

export type TeamMember = { email: string; role: "owner" | "member" };

// Studio big-ticket ("proposal send-and-track workflow") — the latest
// proposal_tokens row for a prospect, reduced from the flat list
// prospects/page.tsx fetches (a prospect can have more than one if a
// proposal was sent twice; ProspectingPanel below keeps only the most
// recent per prospect_id, same "aggregate in the panel" shape
// requests-panel.tsx uses for tasksByRequest).
export type ProposalToken = { prospect_id: string; created_at: string; viewed_at: string | null; accepted_at: string | null };
