"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";
import { draftLeadEmail } from "@/lib/draft-lead-email";
import { draftLeadCallScript } from "@/lib/draft-lead-call-script";
import { sendInvoiceReminder } from "@/lib/send-invoice-reminder";

export async function updateTaskStatus(taskId: string, status: string, revalidate: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("title, request_id")
    .single();

  if (error) console.error("Failed to update task status:", error);

  // Only "done" gets a client email — todo/in_progress are internal-workflow
  // states the client has no action to take on, so notifying them would just
  // be noise (same reasoning as the awaiting_info-only trigger in triageRequest).
  if (status === "done" && task?.request_id) {
    const { data: request } = await supabase
      .from("requests")
      .select("client_id")
      .eq("id", task.request_id)
      .single();

    if (request?.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("business_name, email")
        .eq("id", request.client_id)
        .single();

      if (client?.email) {
        await sendClientEmail(
          client.email,
          `Done: ${task.title}`,
          `Hi,\n\nJust a quick update — "${task.title}" is finished.\n\nLog into your portal any time to see everything else in progress.\n\n— Hamish AI`
        );
      }
    }
  }

  revalidatePath(revalidate);
}

export async function updateDraftResponse(requestId: string, formData: FormData) {
  const draftResponse = String(formData.get("draft_response") || "");
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from("requests")
    .update({ draft_response: draftResponse })
    .eq("id", requestId);

  if (error) console.error("Failed to update draft response:", error);

  revalidatePath(`/admin/requests/${requestId}`);
}

export async function deleteKnowledgeEntry(entryId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("knowledge_base").delete().eq("id", entryId);
  if (error) console.error("Failed to delete knowledge entry:", error);

  revalidatePath("/admin/knowledge");
}

export async function updateLeadStatus(leadId: string, status: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // contacted_at tracks the most recent contact touch — set every time
  // status moves to "contacted" (including re-clicking it after a
  // follow-up), since that's what the stale-outreach check is measured from.
  const update: { status: string; contacted_at?: string } = { status };
  if (status === "contacted") update.contacted_at = new Date().toISOString();

  const { error } = await supabase.from("prospects").update(update).eq("id", leadId);
  if (error) console.error("Failed to update lead status:", error);

  revalidatePath("/admin/leads");
}

export async function deleteLead(leadId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("prospects").delete().eq("id", leadId);
  if (error) console.error("Failed to delete lead:", error);

  revalidatePath("/admin/leads");
}

export async function updateLeadEmail(leadId: string, formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const email = String(formData.get("email") || "").trim();
  const { error } = await supabase
    .from("prospects")
    .update({ email: email || null })
    .eq("id", leadId);
  if (error) console.error("Failed to update lead email:", error);

  revalidatePath("/admin/leads");
}

export async function updateLeadPhone(leadId: string, formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const phone = String(formData.get("phone") || "").trim();
  const { error } = await supabase
    .from("prospects")
    .update({ phone: phone || null })
    .eq("id", leadId);
  if (error) console.error("Failed to update lead phone:", error);

  revalidatePath("/admin/leads");
}

export async function updateLeadConceptSlug(leadId: string, formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const conceptSlug = String(formData.get("concept_slug") || "").trim();
  const { error } = await supabase
    .from("prospects")
    .update({ concept_slug: conceptSlug || null })
    .eq("id", leadId);
  if (error) console.error("Failed to update lead concept slug:", error);

  revalidatePath("/admin/leads");
}

export async function updateClientStatus(clientId: string, status: string, revalidate: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("clients").update({ status }).eq("id", clientId);
  if (error) console.error("Failed to update client status:", error);

  revalidatePath(revalidate);
  revalidatePath("/admin/clients");
}

export async function toggleAnalyticsEnabled(clientId: string, enabled: boolean, revalidate: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("clients").update({ analytics_enabled: enabled }).eq("id", clientId);
  if (error) console.error("Failed to toggle AI Business Analytics entitlement:", error);

  revalidatePath(revalidate);
}

export async function updateMaintenanceRate(clientId: string, revalidate: string, formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const pounds = parseFloat(String(formData.get("maintenance_monthly") || ""));
  const pence = Number.isFinite(pounds) && pounds > 0 ? Math.round(pounds * 100) : null;

  const { error } = await supabase.from("clients").update({ maintenance_monthly_pence: pence }).eq("id", clientId);
  if (error) console.error("Failed to update maintenance rate:", error);

  revalidatePath(revalidate);
}

export async function reviewAutoSend(requestId: string, accurate: boolean, revalidate: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from("requests")
    .update({ auto_send_reviewed: true, auto_send_accurate: accurate })
    .eq("id", requestId);
  if (error) console.error("Failed to record auto-send review:", error);

  revalidatePath(revalidate);
}

export async function sendInvoiceReminderAction(invoiceId: string, revalidate: string) {
  const result = await sendInvoiceReminder(invoiceId);
  if ("error" in result) console.error("Failed to send invoice reminder:", result.error);

  revalidatePath(revalidate);
}

// Admin-managed team invites, not self-serve — consistent with the rest of
// this product's consultation-gated model (no client-facing signup or
// checkout anywhere). If a client ever wants to invite their own
// colleagues without going through Hamish, that's a distinct, larger
// feature (in-portal invite UI + its own RLS write policy) worth building
// only once someone actually asks for it.
export async function inviteClientMember(clientId: string, revalidate: string, formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "member") === "owner" ? "owner" : "member";
  if (!email) return;

  const { data: client } = await supabase.from("clients").select("business_name").eq("id", clientId).single();

  const { error } = await supabase.from("client_members").insert({ client_id: clientId, email, role, invited_by: "admin" });

  if (error) {
    // 23505 = unique_violation (client_id, email) -- they're already a
    // member, which isn't really a failure worth logging as one.
    if (error.code !== "23505") console.error("Failed to invite client member:", error);
  } else if (client) {
    await sendClientEmail(
      email,
      `You've been added to ${client.business_name}'s Hamish AI portal`,
      `Hi,\n\nYou now have access to ${client.business_name}'s Hamish AI client portal.\n\nSign in any time at https://hamishai.org/portal/login with this email address (${email}) — we'll send you a one-time login link, no password needed.\n\n— Hamish AI`
    );
  }

  revalidatePath(revalidate);
}

export async function removeClientMember(memberId: string, revalidate: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("client_members").delete().eq("id", memberId);
  if (error) console.error("Failed to remove client member:", error);

  revalidatePath(revalidate);
}

export type DraftEmailState = { subject?: string; body?: string; email?: string | null; error?: string };

export async function generateLeadEmailDraft(
  leadId: string,
  isFollowUp: boolean,
  _prevState: DraftEmailState,
  _formData: FormData
): Promise<DraftEmailState> {
  const result = await draftLeadEmail(leadId, isFollowUp);
  if ("error" in result) return { error: result.error };
  return { subject: result.subject, body: result.body, email: result.email };
}

export type CallScriptState = {
  opener?: string;
  talkingPoints?: string[];
  ifHesitant?: string;
  closingAsk?: string;
  phone?: string | null;
  error?: string;
};

export async function generateLeadCallScript(
  leadId: string,
  _prevState: CallScriptState,
  _formData: FormData
): Promise<CallScriptState> {
  const result = await draftLeadCallScript(leadId);
  if ("error" in result) return { error: result.error };
  return {
    opener: result.opener,
    talkingPoints: result.talkingPoints,
    ifHesitant: result.ifHesitant,
    closingAsk: result.closingAsk,
    phone: result.phone,
  };
}
