import { google } from "googleapis";
import { getGoogleAuthClient } from "@/lib/google-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkDraftSendStatus } from "@/lib/gmail-draft";

// Sweeps every lead with a pending Gmail draft and marks it genuinely
// "contacted" only once the draft was actually sent — see gmail-draft.ts
// for how "sent" is told apart from "silently deleted". Run from the
// daily email-inbox cron (already Gmail-authenticated) and also callable
// on demand right after someone sends, for immediate feedback.
export async function checkPendingLeadSends() {
  const auth = getGoogleAuthClient();
  if (!auth) return { error: "Google (Gmail) is not configured." as const };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const gmail = google.gmail({ version: "v1", auth });

  const { data: pending } = await supabase
    .from("prospects")
    .select("id, business_name, pending_email_message_id")
    .not("pending_email_message_id", "is", null);

  const confirmed: string[] = [];
  const cleared: string[] = [];

  for (const lead of pending ?? []) {
    if (!lead.pending_email_message_id) continue;
    const status = await checkDraftSendStatus(gmail, lead.pending_email_message_id);

    if (status === "sent") {
      await supabase
        .from("prospects")
        .update({
          status: "contacted",
          contacted_at: new Date().toISOString(),
          last_contact_method: "email",
          pending_email_message_id: null,
        })
        .eq("id", lead.id);
      confirmed.push(lead.business_name);
    } else if (status === "gone") {
      // Draft was deleted (never sent) rather than sent — just stop
      // tracking it. Doesn't touch status, so it stays exactly where it
      // was before the draft was created.
      await supabase.from("prospects").update({ pending_email_message_id: null }).eq("id", lead.id);
      cleared.push(lead.business_name);
    }
    // "pending" — still sitting in Drafts, unsent. Leave as-is.
  }

  return { confirmed, cleared };
}

// Single-lead version for the "check now" button right after someone
// sends, so they get immediate feedback instead of waiting for the next
// daily sweep.
export async function checkOneLeadSend(leadId: string) {
  const auth = getGoogleAuthClient();
  if (!auth) return { error: "Google (Gmail) is not configured." as const };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: lead } = await supabase
    .from("prospects")
    .select("pending_email_message_id")
    .eq("id", leadId)
    .single();

  if (!lead?.pending_email_message_id) return { status: "no_pending_draft" as const };

  const gmail = google.gmail({ version: "v1", auth });
  const status = await checkDraftSendStatus(gmail, lead.pending_email_message_id);

  if (status === "sent") {
    await supabase
      .from("prospects")
      .update({
        status: "contacted",
        contacted_at: new Date().toISOString(),
        last_contact_method: "email",
        pending_email_message_id: null,
      })
      .eq("id", leadId);
    return { status: "sent" as const };
  }
  if (status === "gone") {
    await supabase.from("prospects").update({ pending_email_message_id: null }).eq("id", leadId);
    return { status: "gone" as const };
  }
  return { status: "pending" as const };
}
