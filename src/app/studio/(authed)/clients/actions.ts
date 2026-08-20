"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createInvoice } from "@/lib/create-invoice";
import { logAuditEvent } from "@/lib/audit-log";
import { trackServerEvent } from "@/lib/analytics";
import { generateMonthlyReport } from "@/lib/monthly-report";
import { answerClientsQuestion } from "@/lib/answer-clients-question";
import { getUsageStatus, recordUsageEvent } from "@/lib/usage-limits";
import { isRateLimited } from "@/lib/chat-rate-limit";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

// Same session-derivation as every other /studio actions.ts file.
async function requireOrgId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not signed in.");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) throw new Error("No organisation found for this session.");
  return membership.orgId;
}

// createInvoice() itself refuses to run for a tenant with no Connect
// account or unfinished onboarding (create-invoice.ts) — this action's
// own ownership check is the same belt-and-braces pattern as every other
// /studio Server Action, confirming the client id passed in actually
// belongs to the caller's own org before spending an API call on it.
export async function createClientInvoice(clientId: string, amountPounds: number, description: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  if (!amountPounds || amountPounds <= 0) return { error: "Enter an amount greater than £0." };
  if (!description.trim()) return { error: "Enter what this invoice is for." };

  const { data: client } = await admin.from("clients").select("id").eq("id", clientId).eq("org_id", orgId).maybeSingle();
  if (!client) return { error: "Client not found." };

  const result = await createInvoice({
    clientId,
    amountPence: Math.round(amountPounds * 100),
    description: description.trim(),
  });

  if ("error" in result) return { error: result.error };

  await trackServerEvent(orgId, "invoice_created", { client_id: clientId, amount_pence: Math.round(amountPounds * 100) });

  revalidatePath("/studio/clients");
  return { ok: true as const, invoiceUrl: result.invoiceUrl };
}

// GDPR minimum-viable compliance, part 2 — real, immediate erasure of one
// client's data, for a tenant fulfilling their own client's deletion
// request. Bounded and appropriate for an instant self-service action
// (one client's data, tenant-initiated) unlike whole-account deletion
// (deleteAccount() in settings/actions.ts), which is request-mediated
// instead — a single unconfirmed click hard-deleting an entire paying
// org's data is a real risk this codebase hasn't earned the right to
// take casually yet.
//
// Clears every table with its own client_id foreign key first (none of
// them cascade), then the client row itself. Confirmed against the
// caller's own org_id before touching anything, same rule as every other
// action in this file. A converted prospect's own row is untouched —
// clients.source_lead_id points at it, not the other way round, so
// nothing else breaks when a client is removed.
export async function deleteClientData(clientId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: client } = await admin
    .from("clients")
    .select("id, business_name, email")
    .eq("id", clientId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!client) return { error: "Client not found." };

  const { data: requests } = await admin.from("requests").select("id").eq("client_id", clientId);
  const requestIds = (requests ?? []).map((r) => r.id);
  if (requestIds.length) {
    await admin.from("tasks").delete().in("request_id", requestIds);
  }

  await admin.from("client_google_analytics").delete().eq("client_id", clientId);
  await admin.from("client_members").delete().eq("client_id", clientId);
  await admin.from("knowledge_base").delete().eq("client_id", clientId);
  await admin.from("invoices").delete().eq("client_id", clientId);
  await admin.from("requests").delete().eq("client_id", clientId);

  // Three more real foreign keys to clients, found by live-testing this
  // function against a real client before shipping it (the delete failed
  // outright the first time — none of these three were in the list
  // above). audit_log and processed_emails have a nullable client_id and
  // exist for operational/security record-keeping rather than being
  // personal data themselves — nulled rather than deleted, so that
  // history survives with the specific client reference severed, the
  // "preserve the record, sever the personal-data link" pattern GDPR
  // erasure actually calls for rather than scorched-earth deletion of
  // every row that ever mentioned this client. site_checks.client_id is
  // NOT NULL (a check result with no client makes no sense), so those
  // rows are deleted outright instead — uptime-check history, not
  // personal data.
  await admin.from("audit_log").update({ client_id: null }).eq("client_id", clientId);
  await admin.from("processed_emails").update({ client_id: null }).eq("client_id", clientId);
  await admin.from("site_checks").delete().eq("client_id", clientId);

  // projects.client_id and monthly_reports.client_id are also NOT NULL
  // (schema-projects.sql, schema-monthly-reports.sql) — same "delete
  // outright" rule as site_checks. Tasks are already gone by this point
  // (deleted above via request_id), so there's nothing left pointing at
  // these projects to orphan.
  await admin.from("projects").delete().eq("client_id", clientId);
  await admin.from("monthly_reports").delete().eq("client_id", clientId);

  const { error } = await admin.from("clients").delete().eq("id", clientId);
  if (error) return { error: "Failed to delete this client's data." };

  await logAuditEvent({
    actor: orgId,
    actorType: "admin",
    action: "client.data_deleted",
    targetType: "client",
    targetId: clientId,
    metadata: { business_name: client.business_name, email: client.email },
  });

  revalidatePath("/studio/clients");
  return { ok: true as const };
}

// Manual trigger for the monthly report the cron (/api/cron/monthly-reports)
// generates automatically on the 1st — lets an agency owner get their
// client's first report without waiting for month-end, and is the same
// function the cron calls, so this is a real test of the real path, not a
// separate one. Idempotent against the same month via
// generateMonthlyReport()'s own unique-index check.
export async function generateClientReportNow(clientId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: client } = await admin.from("clients").select("id").eq("id", clientId).eq("org_id", orgId).maybeSingle();
  if (!client) return { error: "Client not found." };

  const result = await generateMonthlyReport(clientId);
  if ("error" in result) return { error: result.error };
  if ("skipped" in result) return { error: "Already generated for this month." };

  revalidatePath("/studio/clients");
  return { ok: true as const };
}

// Studio's own AI Copilot for the Clients page — read-only, answers
// questions about the org's real client roster (answer-clients-question.ts).
// Two layers of protection on top of the answer itself never fabricating a
// number: a burst-protection rate limit (same shape as the portal's own
// copilot) and a monthly usage cap (same shape as every other AI-cost
// Server Action in this file), since this is a new Anthropic-calling
// surface that didn't exist before.
export async function askClientsCopilot(messages: { role: "user" | "assistant"; content: string }[]) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: org } = await admin.from("organisations").select("name, plan, is_internal").eq("id", orgId).single();
  if (!org) return { error: "Organisation not found." };

  if (!org.is_internal) {
    if (await isRateLimited(`clients-copilot:${orgId}`)) {
      return { error: "Too many questions in a short time — try again in a few minutes." };
    }

    const usage = await getUsageStatus(orgId, "clients_copilot_question", org.plan as PlatformPlanSlug);
    if (!usage.allowed) {
      return { error: `Monthly limit reached (${usage.used} of ${usage.limit}) — try again next month.` };
    }
  }

  const trimmed = messages.slice(-12).map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 4000) }));
  const result = await answerClientsQuestion(orgId, org.name, trimmed);

  if (!org.is_internal && "reply" in result) await recordUsageEvent(orgId, "clients_copilot_question");

  return result;
}

// Phase 3 of "sell a chatbot to your client's own website" — the Studio
// side of turning it on. The real security boundary is enforced
// server-side in /api/embed/chat (an origin check on every request), not
// here — this action just writes the two config fields
// (schema-chatbot-embed.sql). A basic shape check on the origin (must
// look like an actual origin, not a full URL with a path) catches the
// most likely mistake — pasting a full page URL — without trying to be a
// complete URL validator.
export async function updateChatbotEmbedConfig(clientId: string, enabled: boolean, allowedOrigin: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: client } = await admin.from("clients").select("id").eq("id", clientId).eq("org_id", orgId).maybeSingle();
  if (!client) return { error: "Client not found." };

  const trimmedOrigin = allowedOrigin.trim().replace(/\/$/, "");
  if (enabled) {
    if (!trimmedOrigin) return { error: "Enter the website this chatbot will live on first." };
    let parsed: URL;
    try {
      parsed = new URL(trimmedOrigin);
    } catch {
      return { error: "Enter a full URL, e.g. https://theirsite.com" };
    }
    if (parsed.pathname !== "/" && parsed.pathname !== "") {
      return { error: "Enter just the site's domain, not a specific page — e.g. https://theirsite.com" };
    }
  }

  const { error } = await admin
    .from("clients")
    .update({ chatbot_embed_enabled: enabled, chatbot_embed_allowed_origin: trimmedOrigin || null })
    .eq("id", clientId);
  if (error) return { error: "Failed to save." };

  revalidatePath("/studio/clients");
  return { ok: true as const };
}
