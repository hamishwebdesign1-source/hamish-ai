"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";
import { draftLeadEmail } from "@/lib/draft-lead-email";
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

export async function sendInvoiceReminderAction(invoiceId: string, revalidate: string) {
  const result = await sendInvoiceReminder(invoiceId);
  if ("error" in result) console.error("Failed to send invoice reminder:", result.error);

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
