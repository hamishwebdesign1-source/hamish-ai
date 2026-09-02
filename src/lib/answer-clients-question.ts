import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { computeClientHealth } from "@/lib/client-health";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { getStudioAnalytics } from "@/lib/studio-analytics";
import { logAiCall } from "@/lib/ai-call-log";

// Studio's own equivalent of the portal's AI Copilot (answer-account-question.ts)
// — same "only ever talk about real numbers in the prompt" discipline, but
// scoped to an agency owner's whole client roster instead of one client's
// own account. Read-only by design: this answers questions, it never
// writes anything — the same caution this session's whole GDPR/rate-limit/
// usage-cap work has applied to every AI-cost surface.
//
// Command Centre Phase 3 — broadened from "ask about your clients" toward
// the brief's "AI Business Analyst" by also including real 30-day
// analytics (getStudioAnalytics(), the same computation the Analytics
// page itself shows). Not the full Business Analyst vision yet — still
// one fixed 30-day window, no drill-down — but a genuine step: it can now
// actually answer "why did revenue change" instead of the old prompt's
// explicit "I don't have that."

export type ClientSummary = {
  businessName: string;
  healthScore: number | null;
  openRequests: number;
  unpaidInvoiceCount: number;
  unpaidPence: number;
  overdueProjectCount: number;
};

// Exported for answer-studio-question.ts (the global Studio AI Assistant)
// to reuse the exact same real-data computation rather than a second copy
// that could drift — that assistant's own system prompt is broader (also
// grounded in the Help FAQs), but the underlying client/analytics numbers
// it reasons over should be identical to what this file's own
// answerClientsQuestion() already computes.
export async function buildClientsSummary(orgId: string): Promise<ClientSummary[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data: clients } = await admin.from("clients").select("id, business_name").eq("org_id", orgId);
  if (!clients?.length) return [];

  const clientIds = clients.map((c) => c.id);

  const [{ data: requests }, { data: invoices }, { data: siteChecks }, { data: projects }] = await Promise.all([
    admin.from("requests").select("id, client_id, status, responded_at").in("client_id", clientIds),
    admin.from("invoices").select("client_id, status, due_date, paid_at, amount_pence").in("client_id", clientIds),
    admin.from("site_checks").select("client_id, uptime_ok").in("client_id", clientIds),
    admin.from("projects").select("client_id, status, target_date").in("client_id", clientIds),
  ]);

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await admin.from("tasks").select("id, request_id, status").in("request_id", requestIds)
    : { data: [] };

  const todayStr = new Date().toISOString().slice(0, 10);

  return clients.map((client) => {
    const clientRequests = (requests ?? []).filter((r) => r.client_id === client.id);
    const clientRequestIds = new Set(clientRequests.map((r) => r.id));
    const clientTasks = (tasks ?? []).filter((t) => t.request_id && clientRequestIds.has(t.request_id));
    const clientInvoices = (invoices ?? []).filter((i) => i.client_id === client.id);
    const clientSiteChecks = (siteChecks ?? []).filter((s) => s.client_id === client.id);
    const clientProjects = (projects ?? []).filter((p) => p.client_id === client.id);

    const { healthScore } = computeClientHealth(clientRequests, clientTasks, clientInvoices, clientSiteChecks);

    // "Open" = not yet responded to — the same real signal
    // portal-insights-data.ts's own funnel and the Overview page's own
    // openRequestCount stat already use.
    const openRequests = clientRequests.filter((r) => !r.responded_at).length;

    const unpaidInvoices = clientInvoices.filter((i) => i.status === "open");
    const overdueProjects = clientProjects.filter((p) => p.status === "active" && p.target_date && p.target_date < todayStr);

    return {
      businessName: client.business_name,
      healthScore,
      openRequests,
      unpaidInvoiceCount: unpaidInvoices.length,
      unpaidPence: unpaidInvoices.reduce((sum, i) => sum + i.amount_pence, 0),
      overdueProjectCount: overdueProjects.length,
    };
  });
}

export function buildAnalyticsSummary(analytics: Awaited<ReturnType<typeof getStudioAnalytics>>): string {
  const lines = analytics.kpis.map((kpi) => {
    const current = kpi.format === "money" ? `£${(kpi.value / 100).toLocaleString("en-GB")}` : kpi.value.toLocaleString("en-GB");
    const previous = kpi.format === "money" ? `£${(kpi.previousValue / 100).toLocaleString("en-GB")}` : kpi.previousValue.toLocaleString("en-GB");
    return `- ${kpi.label}: ${current} in the last 30 days (${previous} in the 30 days before that)`;
  });
  return lines.join("\n");
}

function buildSystemPrompt(orgName: string, clients: ClientSummary[], analyticsSummary: string) {
  const clientLines = clients.length
    ? clients
        .map((c) => {
          const parts = [
            `health ${c.healthScore === null ? "no data yet" : `${c.healthScore}%`}`,
            `${c.openRequests} open request${c.openRequests === 1 ? "" : "s"}`,
            c.unpaidInvoiceCount > 0 ? `£${(c.unpaidPence / 100).toFixed(2)} unpaid across ${c.unpaidInvoiceCount} invoice${c.unpaidInvoiceCount === 1 ? "" : "s"}` : "no unpaid invoices",
            c.overdueProjectCount > 0 ? `${c.overdueProjectCount} overdue project${c.overdueProjectCount === 1 ? "" : "s"}` : null,
          ].filter(Boolean);
          return `- ${c.businessName}: ${parts.join(", ")}`;
        })
        .join("\n")
    : "(no clients yet)";

  return `You are the AI Business Analyst inside ${orgName}'s Studio — you help the agency owner (not their clients) understand their own business and quickly see who needs attention across their whole client roster. You answer questions using only the exact figures below. Never invent, round loosely, or infer a number that isn't stated here. If asked something none of this data can answer, say plainly you don't have that, rather than guessing.

Your business, last 30 days vs the 30 days before that:
${analyticsSummary}

Your clients:
${clientLines}

Plain English, direct, no markdown formatting, no jargon. Keep answers short — a sentence or two unless asked for detail. If several clients match a question (e.g. "who hasn't paid"), list them by name. If asked "why" something changed and the data doesn't explain the cause (it rarely will — these are what-changed numbers, not why-it-changed reasons), say what changed and suggest where to look, rather than inventing a cause.`;
}

export async function answerClientsQuestion(orgId: string, orgName: string, messages: { role: "user" | "assistant"; content: string }[]) {
  const admin = getSupabaseAdmin();
  const [clients, analytics] = await Promise.all([
    buildClientsSummary(orgId),
    admin ? getStudioAnalytics(admin, orgId, "30d") : Promise.resolve(null),
  ]);
  const analyticsSummary = analytics ? buildAnalyticsSummary(analytics) : "(not available)";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  // Same single-log-point reasoning as proposeCommandCentreLayout()'s own
  // comment: measured from just before the real API call, logged once
  // regardless of which branch below produced the result.
  const startedAt = Date.now();
  let result: { reply: string } | { error: string };
  let usage: Anthropic.Usage | undefined;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 400,
      system: buildSystemPrompt(orgName, clients, analyticsSummary),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    usage = response.usage;

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
    result = textBlock ? { reply: stripMarkdownEmphasis(textBlock.text) } : { error: "The copilot did not return an answer." };
  } catch (error) {
    console.error("Clients copilot question failed:", error);
    result = { error: "The copilot is temporarily unavailable." };
  }

  await logAiCall(orgId, "business_analyst", {
    success: "reply" in result,
    latencyMs: Date.now() - startedAt,
    inputTokens: usage?.input_tokens,
    outputTokens: usage?.output_tokens,
  });
  return result;
}
