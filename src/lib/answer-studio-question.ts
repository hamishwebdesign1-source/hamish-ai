import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getStudioAnalytics } from "@/lib/studio-analytics";
import { buildClientsSummary, buildAnalyticsSummary } from "@/lib/answer-clients-question";
import { STUDIO_FAQS } from "@/lib/studio-help-faqs";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { logAiCall } from "@/lib/ai-call-log";

// The Studio AI Assistant — a global floating widget (bottom-left, every
// /studio page), scoped 2026-09-02 in chat before any code was written.
// Deliberately NOT a new AI surface built from scratch: it reuses the
// exact same real client/analytics computation answer-clients-question.ts
// already computed (buildClientsSummary/buildAnalyticsSummary, exported
// from there for exactly this reason), broadened with the Help page's own
// 22 FAQs (studio-help-faqs.ts) so it can also answer genuine "how do I…"
// product questions — a real, confirmed gap: the narrower Clients-page
// copilot correctly said "I don't have that" to a question the Help page
// already answered two clicks away.
//
// Studio Design Audit, Tier 2 item #5 (2026-09) — originally a sibling to
// the Clients-page ClientsCopilot/answerClientsQuestion(), left untouched
// alongside it per the scoping decision at the time. Confirmed afterward
// (per this comment's own claim, now load-bearing) that this function is
// a strict superset of that one's data, so the audit retired
// ClientsCopilot/answerClientsQuestion()/askClientsCopilot() entirely —
// this is now the only "ask about your business" engine in Studio,
// reached from the global widget, the Clients page, and the command
// palette's Ask flow alike. See docs/ai-team/DECISIONS.md.
function buildFaqBlock(): string {
  return STUDIO_FAQS.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
}

function buildSystemPrompt(orgName: string, clientLines: string, analyticsSummary: string, faqBlock: string): string {
  return `You are the Studio AI Assistant, a floating helper available on every page of ${orgName}'s Agency Platform workspace. You help the agency owner (not their clients) in two distinct ways — keep them clearly separate and never blend them:

1. Real business questions — revenue, clients, who needs attention, what's overdue. Answer these using ONLY the exact figures below. Never invent, round loosely, or infer a number that isn't stated here. If asked something none of this data can answer, say plainly you don't have that, rather than guessing.

Your business, last 30 days vs the 30 days before that:
${analyticsSummary}

Your clients:
${clientLines}

2. "How do I…" / "what is…" questions about using the platform itself — answer using ONLY the reference FAQs below, in your own words rather than quoting verbatim. If a question isn't covered by these FAQs and isn't a business-data question either, say you're not sure and suggest emailing hello@hamishai.org rather than guessing at how a feature works.

Platform FAQ reference:
${faqBlock}

Plain English, direct, no markdown formatting, no jargon. Keep answers short — a sentence or two unless asked for detail. If several clients match a business question (e.g. "who hasn't paid"), list them by name. If asked "why" something changed and the data doesn't explain the cause, say what changed and suggest where to look, rather than inventing a cause.`;
}

function buildClientLines(clients: Awaited<ReturnType<typeof buildClientsSummary>>): string {
  if (!clients.length) return "(no clients yet)";
  return clients
    .map((c) => {
      const parts = [
        `health ${c.healthScore === null ? "no data yet" : `${c.healthScore}%`}`,
        `${c.openRequests} open request${c.openRequests === 1 ? "" : "s"}`,
        c.unpaidInvoiceCount > 0
          ? `£${(c.unpaidPence / 100).toFixed(2)} unpaid across ${c.unpaidInvoiceCount} invoice${c.unpaidInvoiceCount === 1 ? "" : "s"}`
          : "no unpaid invoices",
        c.overdueProjectCount > 0 ? `${c.overdueProjectCount} overdue project${c.overdueProjectCount === 1 ? "" : "s"}` : null,
      ].filter(Boolean);
      return `- ${c.businessName}: ${parts.join(", ")}`;
    })
    .join("\n");
}

export async function answerStudioQuestion(orgId: string, orgName: string, messages: { role: "user" | "assistant"; content: string }[]) {
  const admin = getSupabaseAdmin();
  const [clients, analytics] = await Promise.all([
    buildClientsSummary(orgId),
    admin ? getStudioAnalytics(admin, orgId, "30d") : Promise.resolve(null),
  ]);
  const analyticsSummary = analytics ? buildAnalyticsSummary(analytics) : "(not available)";
  const clientLines = buildClientLines(clients);
  const faqBlock = buildFaqBlock();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  // Same single-log-point reasoning as answerClientsQuestion()'s own
  // comment: measured from just before the real API call, logged once
  // regardless of success or failure below.
  const startedAt = Date.now();
  let result: { reply: string } | { error: string };
  let usage: Anthropic.Usage | undefined;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 400,
      system: buildSystemPrompt(orgName, clientLines, analyticsSummary, faqBlock),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    usage = response.usage;

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
    result = textBlock ? { reply: stripMarkdownEmphasis(textBlock.text) } : { error: "The assistant did not return an answer." };
  } catch (error) {
    console.error("Studio assistant question failed:", error);
    result = { error: "The assistant is temporarily unavailable." };
  }

  await logAiCall(orgId, "studio_assistant", {
    success: "reply" in result,
    latencyMs: Date.now() - startedAt,
    inputTokens: usage?.input_tokens,
    outputTokens: usage?.output_tokens,
  });
  return result;
}
