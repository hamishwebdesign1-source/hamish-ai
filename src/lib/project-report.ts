import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// The "AI Project Manager" writes-progress-reports capability from the
// HamishAI Operating System roadmap — on-demand rather than a fully
// autonomous background agent. Treats the client as the project (a single
// operator with one active thread of work per client, at this stage).
export async function generateProgressReport(clientId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("business_name, package, maintenance_plan")
    .eq("id", clientId)
    .single();

  if (clientError || !client) return { error: "Client not found." as const };

  const { data: requests } = await supabase
    .from("requests")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await supabase.from("tasks").select("*").in("request_id", requestIds)
    : { data: [] };

  const requestsList = (requests ?? [])
    .map((r) => `- [${r.status}] (${r.category ?? "uncategorised"}, ${r.priority ?? "no priority"}): ${r.raw_text}`)
    .join("\n");

  const tasksList = (tasks ?? [])
    .map((t) => `- [${t.status}] ${t.title}`)
    .join("\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const systemPrompt = `You are Hamish AI's internal Project Manager assistant, writing a plain-English progress report for Hamish about one of his clients. Be direct and specific — reference actual requests and tasks, not generic filler. Cover: what's been completed, what's in progress, what's outstanding, any risks or blockers worth flagging, and a short recommended next step. 3-5 short paragraphs, no headings, no markdown formatting (no asterisks or bullet symbols) — plain prose with paragraph breaks.`;

  const userPrompt = `Client: ${client.business_name} (${client.package || "no package set"}, ${client.maintenance_plan} maintenance plan)

Requests (most recent first):
${requestsList || "None logged yet."}

Tasks:
${tasksList || "None yet."}`;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = stripMarkdownEmphasis(
      response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
    );

    return { report: text };
  } catch (error) {
    console.error("Progress report generation failed:", error);
    return { error: "Could not generate the progress report — please try again." as const };
  }
}
