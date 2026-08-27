import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { sendClientEmail } from "@/lib/send-client-email";
import { createTaskCalendarEvent } from "@/lib/calendar-sync";
import { logAuditEvent } from "@/lib/audit-log";
import { getUsageStatus, recordUsageEvent } from "@/lib/usage-limits";
import { isTriageRateLimited } from "@/lib/chat-rate-limit";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

type Client = {
  id: string;
  business_name: string;
  email: string | null;
  package: string | null;
  maintenance_plan: string;
  tech_stack: string | null;
  brand_notes: string | null;
  org_id?: string | null;
};

// Who this triage run is on behalf of — resolved from the client's own
// org (clients.org_id -> organisations.name/is_internal) inside
// triageRequest() below, the same tenant-safety pattern already used by
// draft-sales-kit.ts and discover-leads.ts: a shared engine takes an
// explicit sender rather than trusting a hardcoded "Hamish AI" to happen
// to stay correct. Real bug found and fixed here — the prompt and every
// signed email previously said "Hamish AI" unconditionally, even for a
// Studio tenant's own client, since /portal/requests never gated
// submission to HamishAI's own clients in the first place.
type Sender = { name: string; isInternal: boolean };

// Decides who a triage run is on behalf of, from the organisations lookup's
// own result — separated out so the failure-mode logic is testable without
// mocking Supabase/Anthropic (same reason stripTriage/isWellFormed are their
// own exported functions).
//
// Fails closed: an errored lookup (network blip, connection pool
// exhaustion) or an unexpected null-with-no-error both resolve to
// isInternal:false, never the previous silent default of isInternal:true.
// That default used to flow straight into isAutoSendEligible's
// `sender.isInternal &&` gate, meaning a transient DB read failure could
// leave a tenant's own client's request eligible for an unsupervised,
// zero-human-review email auto-sent from HamishAI's own address — a real,
// found bug, not a hypothetical (see docs/ai-team/DECISIONS.md). The only
// case that still resolves to isInternal:true is client.org_id itself being
// absent (a pre-backfill legacy client, not a lookup failure) — everything
// else that isn't a confirmed internal org resolves to isInternal:false.
export function resolveSender(
  client: Pick<Client, "business_name" | "org_id">,
  org: { name: string; is_internal: boolean } | null,
  orgError: unknown
): Sender {
  if (!client.org_id) return { name: "Hamish AI", isInternal: true };

  if (orgError || !org) {
    // Fail closed. Using client.business_name rather than "Hamish AI" for
    // the name too — this sender is, by definition, not confirmed to be
    // Hamish, and isInternal:false already routes every downstream
    // isInternal-gated path (auto-send, the calendar sync, the
    // "awaiting_info" email) away from acting as HamishAI's own identity.
    return { name: client.business_name, isInternal: false };
  }

  return org.is_internal
    ? { name: "Hamish AI", isInternal: true }
    : { name: org.name, isInternal: false };
}

function buildTriageSystemPrompt(client: Client, sender: Sender) {
  const agentIntro = sender.isInternal
    ? `You are the Request Triage Agent for Hamish AI, an Edinburgh AI consultancy.`
    : `You are the Request Triage Agent for ${sender.name}, prepared on their behalf.`;
  const voiceInstruction = sender.isInternal
    ? "The draft_response should sound like Hamish: plain English, warm but direct, no jargon"
    : `The draft_response should sound like a helpful member of ${sender.name}'s own team: plain English, warm but direct, no jargon`;

  return `${agentIntro} You analyse incoming client requests and prepare everything the team needs before a human looks at it: category, complexity, a suggested implementation approach, whether it's covered under the client's maintenance plan, a draft reply to send the client, priority, and any missing information needed before work can start.

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

${voiceInstruction} — and if not covered by maintenance, transparent that this is additional scope without being pushy about it. Do not use markdown formatting (no asterisks, headings, or bullet syntax) — plain sentences and simple dashes only.

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

const CATEGORY_VALUES = ["bug", "feature", "content", "question", "other"] as const;
const COMPLEXITY_VALUES = ["XS", "S", "M", "L"] as const;
const PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;

// Same "coerce, don't trust structurally" standard as stripKit()
// (draft-sales-kit.ts) — this call site used to cast the tool-call result
// straight to TriageResult and read missing_info?.length unguarded, the
// exact "an array field came back as a bare string" failure mode this
// codebase's own siblings (research-lead.ts, draft-sales-kit.ts) already
// defend against. Matters more here than anywhere else in the app: this
// result (including draft_response) can flow straight into an unsupervised
// client email send (see isAutoSendEligible below), so every field actually
// read downstream gets a real, safe fallback instead of an unchecked cast.
function toText(value: unknown): string {
  return typeof value === "string" ? stripMarkdownEmphasis(value) : "";
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function toEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function toSafeBoolean(value: unknown): boolean {
  return value === true;
}

// Optional on the schema itself — a half-filled task is worth less than no
// task at all (same "mostly empty isn't worth saving" call as
// sanitizeSalesStrategy() in research-lead.ts).
function stripSuggestedTask(raw: unknown): TriageResult["suggested_task"] {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const title = toText(r.title);
  const description = toText(r.description);
  const acceptance_criteria = toText(r.acceptance_criteria);
  if (!title && !description && !acceptance_criteria) return undefined;
  return { title, description, acceptance_criteria };
}

// Final safety net before anything reaches the database, the audit log, or
// (for the auto-send-eligible subset) a real client's inbox — mirrors
// stripKit()'s role exactly: accepts the raw `unknown` tool-call payload,
// coerces every field, never throws on a malformed shape.
export function stripTriage(raw: unknown): TriageResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    category: toEnum(r.category, CATEGORY_VALUES, "other"),
    complexity: toEnum(r.complexity, COMPLEXITY_VALUES, "M"),
    suggested_approach: toText(r.suggested_approach),
    covered_by_maintenance: toSafeBoolean(r.covered_by_maintenance),
    coverage_reasoning: toText(r.coverage_reasoning),
    draft_response: toText(r.draft_response),
    // Fails closed, unlike complexity/covered_by_maintenance's fallbacks
    // which already fail closed toward blocking auto-send ("M" and
    // false). An unrecognized/malformed priority (wrong casing, a
    // hallucinated value outside PRIORITY_VALUES) used to fall back to
    // "medium", which satisfies isAutoSendEligible's `priority !== "urgent"`
    // check below and let a malformed value that may well have been
    // *intended* as urgent slip into an unsupervised client email send with
    // no trace that coercion happened. Defaulting to "urgent" here is free —
    // it only ever routes a request to human review, never blocks or
    // mis-sends anything (QA finding, post-083deeb).
    priority: toEnum(r.priority, PRIORITY_VALUES, "urgent"),
    missing_info: toStringArray(r.missing_info),
    suggested_task: stripSuggestedTask(r.suggested_task),
  };
}

// Same role as isWellFormed() in draft-sales-kit.ts — a cheap real-content
// check the retry loop below uses to tell "the model returned a genuinely
// usable triage" from "stripTriage() had to fall back on most of it."
// missing_info is deliberately not checked for length — an empty array is
// a legitimate, well-formed result (nothing missing), not a sign of a
// malformed payload.
export function isWellFormed(triage: TriageResult): boolean {
  return (
    triage.suggested_approach.length > 0 &&
    triage.coverage_reasoning.length > 0 &&
    triage.draft_response.length > 0
  );
}

async function requestTriage(
  anthropic: Anthropic,
  model: string,
  client: Client,
  sender: Sender,
  rawText: string
): Promise<TriageResult | null> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1000,
    system: buildTriageSystemPrompt(client, sender),
    tools: [SUBMIT_TRIAGE_TOOL],
    tool_choice: { type: "tool", name: "submit_triage" },
    messages: [{ role: "user", content: rawText }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  return toolUse ? stripTriage(toolUse.input) : null;
}

export async function triageRequest(clientId: string, rawText: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, business_name, email, package, maintenance_plan, tech_stack, brand_notes, org_id")
    .eq("id", clientId)
    .single();

  if (clientError || !client) return { error: "Client not found." as const };

  // Resolves who this request actually belongs to — see resolveSender()'s
  // own comment above for the fail-closed behaviour on a lookup error, and
  // the Sender type's comment for why this can no longer default to
  // "Hamish AI" unconditionally.
  let sender: Sender;
  if (client.org_id) {
    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .select("name, is_internal, plan")
      .eq("id", client.org_id)
      .single();

    sender = resolveSender(client, org, orgError);

    if (org && !orgError && !org.is_internal) {
      // Burst protection, checked before the monthly cap for the same
      // reason as checkUsage() in prospects/actions.ts: a tight loop of
      // submissions within an otherwise-unexceeded month is a different
      // risk from exceeding the month itself. A genuinely different
      // traffic pattern from Studio's own actions (this is triggered by a
      // tenant's client, not their own staff), so its own budget rather
      // than sharing isStudioActionRateLimited()'s.
      if (await isTriageRateLimited(client.org_id)) {
        return { error: "Too many requests submitted recently — please try again in a few minutes." as const };
      }

      // Usage-metered as of the platform readiness audit — unlike every
      // other AI action in this app, this one is triggered by a tenant's
      // own *client* (via /portal/requests), not the tenant themselves,
      // so it can't be gated in a Studio Server Action the way sales-kit
      // generation etc. are. The cap has to live here, the one place
      // every path into this function actually passes through.
      const usage = await getUsageStatus(client.org_id, "request_triaged", org.plan as PlatformPlanSlug);
      if (!usage.allowed) {
        return {
          error: "This organisation has reached its monthly request limit — please try again next month, or contact them directly." as const,
        };
      }
    }
  } else {
    sender = resolveSender(client, null, null);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  // Three attempts, not one — same reasoning as draft-sales-kit.ts's own
  // retry loop: occasional malformed tool-call output (a field back as the
  // wrong JS type, or a required field silently dropped) turned out more
  // common under real load than a single-attempt happy path assumed. Only
  // the last attempt's result is accepted as a last resort if still
  // imperfect, never a silent placeholder.
  let triage: TriageResult | null = null;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await requestTriage(anthropic, model, client, sender, rawText);
      if (result && isWellFormed(result)) {
        triage = result;
        break;
      }
      if (result && attempt === 2) triage = result; // last attempt: use what we have rather than nothing
    }
    if (!triage) return { error: "The AI did not return a structured result." as const };
  } catch (error) {
    console.error("Triage request failed:", error);
    return { error: "The triage agent is temporarily unavailable." as const };
  }

  const status = triage.missing_info.length ? "awaiting_info" : "triaged";

  const { data: savedRequest, error: insertError } = await supabase
    .from("requests")
    .insert({
      client_id: clientId,
      // requests.org_id (schema-backfill-internal-org.sql) defaults to
      // HamishAI's own org id — found live, testing this change against a
      // real tenant client: every tenant request was silently getting
      // mis-attributed to HamishAI on this column since the insert never
      // set it explicitly. Doesn't affect /studio/requests itself (its
      // RLS and queries join through clients.org_id, not this column),
      // but leaving requests.org_id wrong is a real correctness bug
      // waiting for the next thing that trusts it directly.
      org_id: client.org_id ?? null,
      raw_text: rawText,
      status,
      category: triage.category,
      complexity: triage.complexity,
      suggested_approach: triage.suggested_approach,
      covered_by_maintenance: triage.covered_by_maintenance,
      coverage_reasoning: triage.coverage_reasoning,
      draft_response: triage.draft_response,
      priority: triage.priority,
      missing_info: triage.missing_info,
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

    // Real cross-tenant leak, found while making this function
    // tenant-safe: calendar-sync.ts writes into Hamish's own personal
    // Google Calendar (getGoogleAuthClient() — single-account, not the
    // tenant-scoped Microsoft Graph flow built for inbox connections).
    // A tenant's task would otherwise have silently landed on Hamish's
    // own calendar. Gated to isInternal until a tenant-scoped calendar
    // integration exists — not something to build speculatively here.
    if (savedTask && sender.isInternal) {
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
  //
  // Gated to isInternal: sendClientEmail sends from a hardcoded
  // "Hamish AI <hello@hamishai.org>" address (send-client-email.ts) —
  // there's no per-tenant email-sending wired up yet (same reason
  // studio-briefing.ts stays in-app only, not emailed). Sending a tenant's
  // client an email from HamishAI's own domain, signed as HamishAI, would
  // be the exact identity leak this whole change exists to close. A
  // tenant sees this in their /studio/requests inbox and handles it
  // themselves instead — manual, not automated, same call as the
  // follow-up tracker.
  if (sender.isInternal && status === "awaiting_info" && client.email) {
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
  //
  // isInternal-gated for the same reason as the email above — auto-send
  // is Hamish trusting his own AI to email his own clients unsupervised;
  // that trust doesn't transfer to a tenant who's never seen this system
  // work. A tenant's requests always wait for a human in Studio, full stop.
  const isAutoSendEligible =
    sender.isInternal &&
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

  if (!sender.isInternal && client.org_id) await recordUsageEvent(client.org_id, "request_triaged");

  return { request: savedRequest };
}
