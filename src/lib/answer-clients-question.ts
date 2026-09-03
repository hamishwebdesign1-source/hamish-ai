import { getSupabaseAdmin } from "@/lib/supabase";
import { computeClientHealth } from "@/lib/client-health";
import { getStudioAnalytics } from "@/lib/studio-analytics";

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
//
// Studio Design Audit, Tier 2 item #5 (2026-09) — this file's own
// question-answering wrapper (answerClientsQuestion(), and the
// askClientsCopilot() Server Action that called it) is retired; the
// global Studio AI Assistant (answer-studio-question.ts) now answers
// every "ask about your business" question everywhere in Studio,
// including on the Clients page. What's left below —
// buildClientsSummary()/buildAnalyticsSummary() — is genuinely still
// used: answer-studio-question.ts imports both rather than duplicating
// this real-data computation. See docs/ai-team/DECISIONS.md.

export type ClientSummary = {
  businessName: string;
  healthScore: number | null;
  openRequests: number;
  unpaidInvoiceCount: number;
  unpaidPence: number;
  overdueProjectCount: number;
};

// Exported for answer-studio-question.ts (the global Studio AI Assistant,
// the only remaining caller of this "ask about your business" data since
// the Studio Design Audit's AI-surface consolidation) to reuse the exact
// same real-data computation rather than a second copy that could drift —
// that assistant's own system prompt is broader (also grounded in the
// Help FAQs), but the underlying client/analytics numbers it reasons over
// are identical to what this file computes.
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

