import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { buildPortalInsights, type PortalInsights } from "@/lib/portal-insights-data";

// The client-portal equivalent of the marketing site's "AI Copilot" —
// same chat UX, but every figure it's allowed to talk about is this one
// client's real account data (computed by portal-insights-data.ts), plus
// their knowledge base. It must never invent a number that isn't in the
// context below — no revenue, no bookings, no fabricated benchmarks.
function buildCopilotSystemPrompt(
  businessName: string,
  orgName: string,
  data: PortalInsights,
  knowledgeEntries: { title: string; content: string }[]
) {
  const componentsList = data.components.map((c) => `- ${c.label}: ${c.value}%`).join("\n") || "(not enough data yet)";
  const monthsList = data.requestsByMonth.map((m) => `${m.label}: ${m.value}`).join(", ");
  const spendList = data.spendByMonth.map((m) => `${m.label}: £${m.value.toFixed(0)}`).join(", ");
  const categoryList = data.categoryBreakdown.map((c) => `${c.label}: ${c.value}`).join(", ") || "(no requests yet)";
  const knowledge = knowledgeEntries.length ? knowledgeEntries.map((e) => `- ${e.title}: ${e.content}`).join("\n") : "(none yet)";
  const funnelList = data.funnel.map((f) => `${f.label}: ${f.value}`).join(" → ");

  // orgName is HamishAI's own clients' real portal name and, for every
  // Agency Platform tenant's own clients, that tenant's agency name
  // instead — this prompt must never say "Hamish AI" to someone who has
  // no idea what that is, on someone else's white-labelled portal.
  return `You are the AI Copilot inside ${businessName}'s ${orgName} client portal — the real, account-specific version of the AI Business Analytics product. You answer questions about this client's own account using only the exact figures below. This is NOT the illustrative demo shown to prospects — never invent, round loosely, or infer a number that isn't stated here, especially request counts and statuses. If someone asks something this data can't answer (revenue, bookings, marketing performance — anything about their actual business rather than their ${orgName} account), say plainly that you don't have access to that, rather than guessing.

Request status right now (use these exact numbers for any "how many/open/pending" question):
- Awaiting the client's input: ${data.needsInputCount}
- In progress (triaged, no input needed): ${data.inProgressCount}
- Fully finished (all linked work done): ${data.funnel[2]?.value ?? 0}
- Total requests all-time: ${data.totalRequests}

Request funnel (submitted → became real work → work finished): ${funnelList}

Account health score: ${data.healthScore ?? "not enough data yet"}/100
Health components:
${componentsList}

Requests by month: ${monthsList}
Spend by month: ${spendList}
Total paid all-time: £${data.totalPaid.toFixed(2)}
Request categories: ${categoryList}
${data.uptimePct !== null ? `Site uptime: ${data.uptimePct}%` : "Site monitoring: not set up"}
Automated replies sent: ${data.autoReplyCount}
Site checks run: ${data.siteCheckCount}

Knowledge base (general business facts, use for non-analytics questions too):
${knowledge}

Plain English, warm but direct, no markdown formatting, no jargon. Keep answers short — a sentence or two unless they ask for detail.`;
}

export async function answerAccountQuestion(
  supabase: SupabaseClient,
  clientId: string,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  const insights = await buildPortalInsights(supabase, clientId);
  if ("error" in insights) return { error: insights.error };

  // General entries (client_id null) scoped to this client's own org too
  // — RLS (schema-knowledge-base-org-scope.sql) enforces the same
  // boundary independently, but the explicit org_id filter here is what
  // makes the intent legible, same "belt and braces" convention as
  // everywhere else org-scoped data is read in this codebase. Falls back
  // to client-specific-only if org_id is somehow missing (shouldn't
  // happen post-backfill) rather than risking a malformed filter.
  const orgFilter = insights.client.org_id ? `,and(client_id.is.null,org_id.eq.${insights.client.org_id})` : "";
  const { data: knowledgeEntries } = await supabase
    .from("knowledge_base")
    .select("title, content")
    .or(`client_id.eq.${clientId}${orgFilter}`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 400,
      system: buildCopilotSystemPrompt(insights.client.business_name, insights.orgBranding.name, insights, knowledgeEntries ?? []),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
    if (!textBlock) return { error: "The copilot did not return an answer." as const };

    return { reply: stripMarkdownEmphasis(textBlock.text) };
  } catch (error) {
    console.error("Account copilot question failed:", error);
    return { error: "The copilot is temporarily unavailable." as const };
  }
}
