import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-log";

// Roadmap item #7 ("ongoing competitive intelligence") — points
// discoverLeads()'s existing live-web-research pattern (discover-leads.ts:
// tool-forced JSON, web_search_20250305, the pause_turn resume and
// "nudge if the model never calls the tool" fixes, all confirmed live
// there) at an org's own *existing* clients' competitors, not at new
// prospects. Same model (Haiku via ANTHROPIC_MODEL, load-bearing for
// web_search_20250305 — see that file's own comment on why the newer
// dynamic-filtering variant 400s on Haiku).
//
// Deliberately opt-in per org (organisations.brand.competitiveIntelEnabled,
// same jsonb pattern as autonomousOutreachEnabled) and hard-capped at
// MAX_CLIENTS_PER_ORG_PER_RUN — this is a real, uncapped-by-plan
// Anthropic spend per client researched, unlike prospect research (which
// usage-limits.ts already meters). Folded into the existing monthly
// monthly-reports cron rather than a new vercel.json entry — architecturally
// the same shape (a per-client, once-a-month real generation), same "cron
// count is worth conserving" reasoning trial-reminders.ts's own header
// documents. The monthly cadence itself is the throttle; no separate rate
// limit needed on top of it the way a more-frequently-triggerable action
// would need.

const MAX_CLIENTS_PER_ORG_PER_RUN = 3;

const SUBMIT_FINDING_TOOL: Anthropic.Tool = {
  name: "submit_finding",
  description: "Report whether a real, specific, verifiable competitor finding was found.",
  input_schema: {
    type: "object",
    properties: {
      found: { type: "boolean", description: "True only if a genuine, specific, verifiable finding was found." },
      headline: { type: "string", description: "One short sentence naming the competitor and what they did." },
      detail: { type: "string", description: "1-2 sentences of concrete, specific detail — not generic advice." },
      source_url: { type: "string", description: "A real URL supporting the finding, if one exists." },
    },
    required: ["found"],
  },
};

export type CompetitorFinding = { headline: string; detail: string; sourceUrl: string | null };

async function researchOneClient(
  anthropic: Anthropic,
  model: string,
  businessName: string,
  category: string | null,
  area: string | null
): Promise<CompetitorFinding | null> {
  const context = category && area ? `a ${category} business in ${area}` : category ? `a ${category} business` : "a small local business";

  const system = `You are researching real competitors on behalf of an agency that manages ${businessName}'s website and marketing, so the agency can bring genuinely useful competitive intelligence to their next check-in with this client.

${businessName} is ${context}. Use web search to find one real, current, specific development from a genuine competitor of theirs — a website redesign, a new offer, expanded hours, a new location, anything concrete a business owner would find useful to know about.

Never invent a competitor, a business, or a detail. If you can't confirm a real, specific, current finding, report found: false rather than something vague or generic ("competitors are also active on social media" is not a finding).`;

  const userMessage = "Research and report your finding now.";
  const tools = [{ type: "web_search_20250305" as const, name: "web_search" as const, max_uses: 4 }, SUBMIT_FINDING_TOOL];

  let response = await anthropic.messages.create({
    model,
    max_tokens: 1500,
    system,
    tools,
    messages: [{ role: "user", content: userMessage }],
  });

  // Same pause_turn resume as discover-leads.ts's searchCandidates() —
  // server-side web search can hit its internal iteration cap and pause
  // mid-task; resending unmodified lets the server resume where it left
  // off (never add a synthetic "continue" message here).
  if (response.stop_reason === "pause_turn") {
    response = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      system,
      tools,
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: response.content },
      ],
    });
  }

  let toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "submit_finding");

  // Same confirmed-live gap discover-leads.ts's own comment documents:
  // the model can spend its whole web_search budget, conclude there's
  // nothing solid, and just explain that in text instead of calling the
  // tool — even though found: false is explicitly the right answer for
  // that case. One forced follow-up (web_search dropped, tool_choice
  // pinned) makes it actually answer.
  if (!toolUse) {
    const nudge = await anthropic.messages.create({
      model,
      max_tokens: 800,
      system,
      tools: [SUBMIT_FINDING_TOOL],
      tool_choice: { type: "tool", name: "submit_finding" },
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: response.content },
        { role: "user", content: "Call submit_finding now with whatever you found, even if found is false. Do not explain in text — just call the tool." },
      ],
    });
    toolUse = nudge.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "submit_finding");
  }

  // Even the forced nudge can come back with no tool_use at all — treated
  // as "nothing found" (same as an honest found: false), never as an
  // error that would block researching the org's other clients this run.
  if (!toolUse) return null;

  const input = toolUse.input as { found?: boolean; headline?: string; detail?: string; source_url?: string };
  if (!input.found || !input.headline || !input.detail) return null;

  return { headline: input.headline, detail: input.detail, sourceUrl: input.source_url ?? null };
}

type ClientRow = { id: string; business_name: string; source_lead_id: string | null };

// Exported for competitor-intel.test.ts — same "test the real selection
// logic directly rather than only through the AI-calling function"
// precedent discover-leads.test.ts already establishes for its own pure
// helpers (pickPairsForWeek, isoWeekIndex). researchOneClient() and
// researchCompetitorIntelForAllOrgs() itself aren't tested directly here,
// same reason discover-leads.ts's own searchCandidates() isn't — neither
// this codebase's test suite nor its conventions mock the Anthropic SDK.
export async function pickClientsToResearch(admin: SupabaseClient, orgId: string): Promise<ClientRow[]> {
  const { data: clients } = await admin.from("clients").select("id, business_name, source_lead_id").eq("org_id", orgId).neq("status", "churned");
  if (!clients?.length) return [];

  const { data: lastChecks } = await admin
    .from("client_competitor_intel")
    .select("client_id, created_at")
    .in(
      "client_id",
      clients.map((c) => c.id)
    )
    .order("created_at", { ascending: false });

  // First (most recent) row per client_id wins — created_at descending
  // above means the first time a client_id is seen here is its latest
  // check.
  const lastCheckedAt = new Map<string, string>();
  for (const row of lastChecks ?? []) {
    if (!lastCheckedAt.has(row.client_id)) lastCheckedAt.set(row.client_id, row.created_at);
  }

  // Never-checked clients (no entry -> "") sort first, then oldest-checked
  // next — every client eventually gets a turn across enough monthly
  // runs, instead of the same few being re-researched indefinitely.
  return [...clients].sort((a, b) => (lastCheckedAt.get(a.id) ?? "").localeCompare(lastCheckedAt.get(b.id) ?? "")).slice(0, MAX_CLIENTS_PER_ORG_PER_RUN);
}

export async function researchCompetitorIntelForAllOrgs() {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." as const };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  // Never HamishAI's own internal org — this is a tenant-facing feature
  // for a tenant's *own* clients, and HamishAI's internal client base
  // (its own real customers) isn't what this was built to protect.
  const { data: orgs, error } = await admin.from("organisations").select("id, name, brand").eq("is_internal", false);
  if (error) return { error: "Failed to fetch organisations." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  let totalFound = 0;
  const byOrg: Record<string, number> = {};

  for (const org of orgs ?? []) {
    const brand = (org.brand ?? {}) as { competitiveIntelEnabled?: boolean };
    if (!brand.competitiveIntelEnabled) continue;

    const toResearch = await pickClientsToResearch(admin, org.id);
    let foundThisOrg = 0;

    for (const client of toResearch) {
      let category: string | null = null;
      let area: string | null = null;
      // A client converted from a real researched prospect (source_lead_id)
      // carries a real category/neighbourhood from that prospect row —
      // reused here rather than left blank, same "don't discard research
      // already paid for" instinct draft-sales-kit.ts's own use of cached
      // `research` documents. A manually-added client with no such link
      // simply searches on business name alone — still a real, meaningful
      // query, just less targeted.
      if (client.source_lead_id) {
        const { data: prospect } = await admin.from("prospects").select("category, neighbourhood").eq("id", client.source_lead_id).maybeSingle();
        category = prospect?.category ?? null;
        area = prospect?.neighbourhood ?? null;
      }

      const finding = await researchOneClient(anthropic, model, client.business_name, category, area);
      if (!finding) continue;

      const { error: insertError } = await admin.from("client_competitor_intel").insert({
        client_id: client.id,
        org_id: org.id,
        headline: finding.headline,
        detail: finding.detail,
        source_url: finding.sourceUrl,
      });
      if (insertError) {
        console.error(`Failed to save competitor intel for client ${client.id} (org ${org.id}):`, insertError);
        continue;
      }

      logAuditEvent({
        actor: org.name,
        actorType: "system",
        action: "client.competitor_intel_found",
        targetType: "client",
        targetId: client.id,
        metadata: { orgId: org.id },
      });
      foundThisOrg++;
    }

    if (foundThisOrg > 0) {
      byOrg[org.id] = foundThisOrg;
      totalFound += foundThisOrg;
    }
  }

  return { found: totalFound, byOrg };
}
