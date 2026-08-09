import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { sendClientEmail } from "@/lib/send-client-email";
import { createTaskCalendarEvent } from "@/lib/calendar-sync";
import { logAuditEvent } from "@/lib/audit-log";

type Client = {
  id: string;
  business_name: string;
  email: string | null;
  package: string | null;
  maintenance_plan: string;
  tech_stack: string | null;
  brand_notes: string | null;
};

function buildTriageSystemPrompt(client: Client) {
  return `You are the Request Triage Agent for Hamish AI, an Edinburgh AI consultancy. You analyse incoming client requests and prepare everything Hamish needs before he looks at it: category, complexity, a suggested implementation approach, whether it's covered under the client's maintenance plan, a draft reply to send the client, priority, and any missing information needed before work can start.

Client context:
- Business: ${client.business_name}
- Package: ${client.package || "not set"}
- Maintenance plan: ${client.maintenance_plan}
- Tech stack: ${client.tech_stack || "not recorded"}
- Brand/tone notes: ${client.brand_notes || "not recorded"}

Maintenance plan coverage guide:
- "none": nothing is covered under an ongoing plan — any work is a new quote.
- "basic": small content/text/copy changes, bug fixes, and minor tweaks are covered; new features, new pages, or new integrations are not.
- "growth": everything "basic" covers, plus small new features and ongoing optimisation; large new builds (new sections of functionality, new integrations, structural redesigns) are still out of scope and need a separate quote.

Be a sharp, senior analyst: don't rubber-stamp everything as covered to be agreeable, and don't refuse everything to be safe — reason about genuine scope. If the request is too vague to size or scope confidently, list specific missing_info questions rather than guessing — better to ask than to draft a wrong response.

The draft_response should sound like Hamish: plain English, warm but direct, no jargon — and if not covered by maintenance, transparent that this is additional scope without being pushy about it. Do not use markdown formatting (no asterisks, headings, or bullet syntax) — plain sentences and simple dashes only.

Only include suggested_task if there's real implementation work to do — a pure question needs no task.`;
}

const SUBMIT_TRIAGE_TOOL: Anthropic.Tool = {
  name: "submit_triage",
  description: "Submit the structured triage analysis of a client's request.",
  input_schema: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["bug", "feature", "content", "question", "other"] },
      complexity: { type: "string", enum: ["XS", "S", "M", "L"] },
      suggested_approach: { type: "string" },
      covered_by_maintenance: { type: "boolean" },
      coverage_reasoning: { type: "string" },
      draft_response: { type: "string" },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      missing_info: { type: "array", items: { type: "string" } },
      suggested_task: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          acceptance_criteria: { type: "string" },
        },
      },
    },
    required: [
      "category",
      "complexity",
      "suggested_approach",
      "covered_by_maintenance",
      "coverage_reasoning",
      "draft_response",
      "priority",
      "missing_info",
    ],
  },
};

type TriageResult = {
  category: string;
  complexity: string;
  suggested_approach: string;
  covered_by_maintenance: boolean;
  coverage_reasoning: string;
  draft_response: string;
  priority: string;
  missing_info: string[];
  suggested_task?: { title: string; description: string; acceptance_criteria: string };
};

export async function triageRequest(clientId: string, rawText: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, business_name, email, package, maintenance_plan, tech_stack, brand_notes")
    .eq("id", clientId)
    .single();

  if (clientError || !client) return { error: "Client not found." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  let triage: TriageResult;
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system: buildTriageSystemPrompt(client),
      tools: [SUBMIT_TRIAGE_TOOL],
      tool_choice: { type: "tool", name: "submit_triage" },
      messages: [{ role: "user", content: rawText }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) return { error: "The AI did not return a structured result." as const };

    triage = toolUse.input as TriageResult;
    triage.draft_response = stripMarkdownEmphasis(triage.draft_response);
    triage.suggested_approach = stripMarkdownEmphasis(triage.suggested_approach);
  } catch (error) {
    console.error("Triage request failed:", error);
    return { error: "The triage agent is temporarily unavailable." as const };
  }

  const status = triage.missing_info?.length ? "awaiting_info" : "triaged";

  const { data: savedRequest, error: insertError } = await supabase
    .from("requests")
    .insert({
      client_id: clientId,
      raw_text: rawText,
      status,
      category: triage.category,
      complexity: triage.complexity,
      suggested_approach: triage.suggested_approach,
      covered_by_maintenance: triage.covered_by_maintenance,
      coverage_reasoning: triage.coverage_reasoning,
      draft_response: triage.draft_response,
      priority: triage.priority,
      missing_info: triage.missing_info ?? [],
      ai_raw: triage,
    })
    .select()
    .single();

  if (insertError || !savedRequest) {
    console.error("Failed to save triaged request:", insertError);
    return { error: "Failed to save the triaged request." as const };
  }

  // Portal redesign Stage 5 — triage previously left no trace in audit_log
  // at all, which is exactly the "AI activity is invisible" problem the
  // redesign brief called out. This is the one entry every triaged request
  // gets; request.auto_sent (below) is a second, separate entry only for
  // the subset that skip human review entirely.
  await logAuditEvent({
    actor: "system",
    actorType: "system",
    action: "request.triaged",
    targetType: "request",
    targetId: savedRequest.id,
    clientId,
    metadata: {
      category: triage.category,
      complexity: triage.complexity,
      priority: triage.priority,
      covered_by_maintenance: triage.covered_by_maintenance,
      status,
    },
  });

  if (triage.suggested_task) {
    const { data: savedTask, error: taskError } = await supabase
      .from("tasks")
      .insert({
        request_id: savedRequest.id,
        title: triage.suggested_task.title,
        description: triage.suggested_task.description,
        acceptance_criteria: triage.suggested_task.acceptance_criteria,
      })
      .select()
      .single();

    if (taskError) console.error("Failed to save suggested task:", taskError);

    if (savedTask) {
      const calendarResult = await createTaskCalendarEvent({
        taskId: savedTask.id,
        title: savedTask.title,
        description: savedTask.description ?? "",
        priority: triage.priority,
        businessName: client.business_name,
        requestId: savedRequest.id,
      });
      if ("eventId" in calendarResult && calendarResult.eventId) {
        await supabase.from("tasks").update({ calendar_event_id: calendarResult.eventId }).eq("id", savedTask.id);
      }
    }
  }

  // Only the "we need something from you" transition gets an email — a
  // freshly-triaged request doesn't, since nothing is expected of the client
  // yet, and pinging them for every internal status change would just be noise.
  if (status === "awaiting_info" && client.email) {
    const questions = triage.missing_info.map((q) => `- ${q}`).join("\n");
    await sendClientEmail(
      client.email,
      `A quick question about your request — ${client.business_name}`,
      `Hi,\n\nThanks for the note — before we can get started we need a bit more detail:\n\n${questions}\n\nJust reply to this email or log into your portal to add the details.\n\n— Hamish AI`
    );
  }

  // Autonomous auto-send: only for requests confident enough to skip human
  // review — already covered by the client's plan, small enough scope
  // (XS/S), and not urgent (urgent always gets a human's eyes first).
  // Hamish gets a copy of everything sent this way so nothing goes out
  // silently, even when he isn't the one reviewing it.
  const isAutoSendEligible =
    status === "triaged" &&
    triage.covered_by_maintenance &&
    (triage.complexity === "XS" || triage.complexity === "S") &&
    triage.priority !== "urgent";

  if (isAutoSendEligible && client.email) {
    await sendClientEmail(
      client.email,
      `Re: your request — ${client.business_name}`,
      `${triage.draft_response}\n\n— Hamish AI`
    );
    await supabase
      .from("requests")
      .update({ auto_sent: true, responded_at: new Date().toISOString() })
      .eq("id", savedRequest.id);

    await logAuditEvent({
      actor: "system",
      actorType: "system",
      action: "request.auto_sent",
      targetType: "request",
      targetId: savedRequest.id,
      clientId,
      metadata: { category: triage.category, complexity: triage.complexity },
    });

    const internalTo = process.env.CONTACT_TO_EMAIL;
    if (internalTo) {
      await sendClientEmail(
        internalTo,
        `Auto-sent reply — ${client.business_name}`,
        `This reply was sent automatically (covered by plan, small scope, not urgent) — no action needed unless something looks off.\n\nClient request:\n${rawText}\n\nWhat was sent:\n${triage.draft_response}`
      );
    }
  }

  return { request: savedRequest };
}
