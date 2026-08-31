// BACKLOG.md "AI-assisted signed value" — the one number in this app that
// ties a specific AI action to a specific won deal. Every other revenue-
// adjacent figure is either pure activity metering (usage-limits.ts's
// counts) or outcome-blind (studio-analytics.ts's "Revenue" KPI, Command
// Centre's "Pipeline value" — both real, neither AI-attributed). See
// DECISIONS.md ("Scoping 'AI ROI' as an attribution rule...", 2026-08-31)
// for the full reasoning behind every choice below; this file is the
// implementation of that decision, not a fresh derivation of it.
//
// Attribution rule: a client counts as AI-assisted for a given calendar
// month if (1) clients.created_at falls in that month, (2)
// clients.source_lead_id is not null (manually-added clients have no
// prospect to check an AI touch against — real, still counted everywhere
// else, just outside this metric's population), and (3) the referenced
// prospect's sales_kit_generated_at or website_mockup_generated_at is not
// null AND predates clients.created_at (the AI deliverable existed before
// the deal closed, not generated afterwards as an unrelated coincidence).
//
// research_generated_at is deliberately never checked here — discover-
// leads.ts now researches every prospect found through normal discovery
// automatically, so it no longer distinguishes "AI did something for this
// specific deal" from "this prospect exists at all." Including it would
// make nearly every converted prospect qualify by default.
//
// This is correlation ("AI touched this prospect before it became a
// client"), not causation ("AI is why it signed") — the UI's own HelpTip
// says so explicitly; this module doesn't claim more than the data
// supports.

export type AiRoiClientRow = {
  id: string;
  business_name: string;
  created_at: string;
  source_lead_id: string | null;
};

export type AiRoiProspectRow = {
  id: string;
  deal_value_pence: number | null;
  sales_kit_generated_at: string | null;
  website_mockup_generated_at: string | null;
};

export type AiAssistedTouchVia = "sales_kit" | "website_mockup" | "both";

export type AiAssistedClient = {
  clientId: string;
  businessName: string;
  dealValuePence: number | null;
  touchedVia: AiAssistedTouchVia;
};

export type AiAssistedSignedValue = {
  signedThisMonth: number;
  aiAssistedCount: number;
  // null (not 0) when no AI-assisted client in the set has a recorded
  // deal_value_pence — the UI needs to tell "no data" apart from
  // "genuinely zero," and a manual, optional estimate field that's often
  // unset is exactly the case that distinction matters for.
  aiAssistedValuePence: number | null;
  aiAssistedClients: AiAssistedClient[];
};

// Calendar month, not a rolling 30 days — same startOfMonth() convention
// usage-limits.ts already uses, so "this month" means the same thing on
// this card as it does on the usage bars sitting right next to it.
function isInCalendarMonth(iso: string, now: Date): boolean {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const d = new Date(iso);
  return d >= monthStart && d < monthEnd;
}

// clients/prospects are expected pre-scoped to the caller's own org (same
// session-scoped RLS pattern every other billing/page.tsx query already
// uses) — this function itself still filters to the calendar month rather
// than trusting the caller did, same "never assume, verify" instinct as
// the rest of this codebase, and it keeps this function independently
// testable against a fixed `now` rather than real wall-clock time.
export function computeAiAssistedSignedValue(
  clients: AiRoiClientRow[],
  prospects: AiRoiProspectRow[],
  now: Date
): AiAssistedSignedValue {
  const signedClients = clients.filter((c) => isInCalendarMonth(c.created_at, now));
  const prospectsById = new Map(prospects.map((p) => [p.id, p]));

  const aiAssistedClients: AiAssistedClient[] = [];
  for (const client of signedClients) {
    if (!client.source_lead_id) continue;
    const prospect = prospectsById.get(client.source_lead_id);
    if (!prospect) continue;

    const salesKitBefore = prospect.sales_kit_generated_at !== null && prospect.sales_kit_generated_at <= client.created_at;
    const mockupBefore = prospect.website_mockup_generated_at !== null && prospect.website_mockup_generated_at <= client.created_at;
    if (!salesKitBefore && !mockupBefore) continue;

    const touchedVia: AiAssistedTouchVia = salesKitBefore && mockupBefore ? "both" : salesKitBefore ? "sales_kit" : "website_mockup";

    aiAssistedClients.push({
      clientId: client.id,
      businessName: client.business_name,
      dealValuePence: prospect.deal_value_pence,
      touchedVia,
    });
  }

  const recordedValues = aiAssistedClients.filter((c): c is AiAssistedClient & { dealValuePence: number } => c.dealValuePence !== null);
  const aiAssistedValuePence = recordedValues.length ? recordedValues.reduce((sum, c) => sum + c.dealValuePence, 0) : null;

  return {
    signedThisMonth: signedClients.length,
    aiAssistedCount: aiAssistedClients.length,
    aiAssistedValuePence,
    aiAssistedClients,
  };
}
