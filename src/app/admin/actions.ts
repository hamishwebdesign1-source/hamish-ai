"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createResearchJob, runResearchJob } from "@/lib/deep-research-pipeline";
import { researchContentIdea, type ContentIdeaResearch } from "@/lib/research-content-idea";
import { generateContentScripts, type ScriptVariant } from "@/lib/generate-content-scripts";
import { generateVideoPrompt } from "@/lib/generate-video-prompt";
import { sendClientEmail } from "@/lib/send-client-email";
import { researchLead, type LeadResearch } from "@/lib/research-lead";
import { draftSalesKit, type SalesKit } from "@/lib/draft-sales-kit";
import { createLeadGmailDraft } from "@/lib/gmail-draft";
import { findAvailableSlots, createTeamsMeeting, type MeetingSlot } from "@/lib/teams-meeting";
import { checkOneLeadSend } from "@/lib/check-lead-sends";
import { sendInvoiceReminder } from "@/lib/send-invoice-reminder";
import { startSubscription, cancelSubscription } from "@/lib/subscription";
import { logAuditEvent } from "@/lib/audit-log";

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

  const { data: previous } = await supabase.from("prospects").select("status").eq("id", leadId).single();

  // contacted_at tracks the most recent contact touch — set every time
  // status moves to "contacted" (including re-clicking it after a
  // follow-up), since that's what the stale-outreach check is measured from.
  const update: { status: string; contacted_at?: string } = { status };
  if (status === "contacted") update.contacted_at = new Date().toISOString();

  const { error } = await supabase.from("prospects").update(update).eq("id", leadId);
  if (error) {
    console.error("Failed to update lead status:", error);
  } else {
    await logAuditEvent({
      actor: "admin",
      action: "lead.status_changed",
      targetType: "prospect",
      targetId: leadId,
      metadata: { from: previous?.status ?? null, to: status },
    });
  }

  revalidatePath("/admin/leads");
}

// Distinct from updateLeadStatus's generic "contacted" click: this is the
// explicit "I actually just phoned them" confirmation, separate from
// drafting/viewing the call script (which can happen well before the
// call itself, or be re-generated without a call ever being made).
export async function markLeadCalled(leadId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from("prospects")
    .update({ status: "contacted", contacted_at: new Date().toISOString(), last_contact_method: "call" })
    .eq("id", leadId);
  if (error) {
    console.error("Failed to mark lead called:", error);
  } else {
    await logAuditEvent({ actor: "admin", action: "lead.called", targetType: "prospect", targetId: leadId });
  }

  revalidatePath("/admin/leads");
}

// Manual counterpart to checkOneLeadSend's "sent" branch — same resulting
// state (contacted, email cadence started, pending draft cleared), but
// without calling the Gmail API. For when the operator has already sent
// the email themselves (from Gmail directly, or because the automated
// check is unavailable/erroring) and just needs to record it — this is
// what drives the checkbox next to the Email button, and starting
// contacted_at here is what makes the 5-day call reminder (see
// lead-status.ts's EMAIL_TO_CALL_DAYS) fire on schedule.
export async function markLeadEmailSent(leadId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from("prospects")
    .update({
      status: "contacted",
      contacted_at: new Date().toISOString(),
      last_contact_method: "email",
      pending_email_message_id: null,
    })
    .eq("id", leadId);
  if (error) {
    console.error("Failed to mark lead emailed:", error);
  } else {
    await logAuditEvent({ actor: "admin", action: "lead.email_marked_sent", targetType: "prospect", targetId: leadId });
  }

  revalidatePath("/admin/leads");
}

// No automated inbox-matching for prospect replies (unlike existing
// clients — see checkEmailInbox in email-inbox.ts, scoped to known
// client_members addresses), so this is a manual confirmation. Setting
// replied_at takes the lead out of the follow-up cadence entirely.
export async function markLeadReplied(leadId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from("prospects")
    .update({ replied_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) {
    console.error("Failed to mark lead replied:", error);
  } else {
    await logAuditEvent({ actor: "admin", action: "lead.replied", targetType: "prospect", targetId: leadId });
  }

  revalidatePath("/admin/leads");
}

// On-demand version of the daily cron sweep (checkPendingLeadSends) —
// lets the operator get an immediate answer right after they actually hit
// send in Gmail, instead of waiting for the next scheduled run.
export async function checkLeadEmailSent(leadId: string) {
  const result = await checkOneLeadSend(leadId);
  revalidatePath("/admin/leads");
  if ("error" in result) return { status: "no_pending_draft" as const };
  return result;
}

export async function deleteLead(leadId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // Fetched before deleting, not after — nothing to log a name against
  // once the row is gone. audit_log's target_id has no FK to prospects,
  // so the entry stays valid and readable after the lead itself doesn't.
  const { data: lead } = await supabase.from("prospects").select("business_name").eq("id", leadId).single();

  const { error } = await supabase.from("prospects").delete().eq("id", leadId);
  if (error) {
    console.error("Failed to delete lead:", error);
  } else {
    await logAuditEvent({
      actor: "admin",
      action: "lead.deleted",
      targetType: "prospect",
      targetId: leadId,
      metadata: { business_name: lead?.business_name ?? null },
    });
  }

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
  if (error) {
    console.error("Failed to update lead email:", error);
  } else {
    await logAuditEvent({ actor: "admin", action: "lead.email_updated", targetType: "prospect", targetId: leadId, metadata: { email: email || null } });
  }

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
  if (error) {
    console.error("Failed to update lead phone:", error);
  } else {
    await logAuditEvent({ actor: "admin", action: "lead.phone_updated", targetType: "prospect", targetId: leadId, metadata: { phone: phone || null } });
  }

  revalidatePath("/admin/leads");
}

// Freeform context that doesn't fit any of the structured fields — "called,
// no answer, try Thursday afternoon" and the like. Requires the `notes`
// column added by supabase/schema-lead-notes.sql — not run automatically,
// since this app has no migration runner and the service-role client can't
// execute DDL; that file needs to be pasted into the Supabase SQL editor
// once.
export async function updateLeadNotes(leadId: string, formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const notes = String(formData.get("notes") || "").trim();
  const { error } = await supabase
    .from("prospects")
    .update({ notes: notes || null })
    .eq("id", leadId);
  if (error) {
    console.error("Failed to update lead notes:", error);
  } else if (notes) {
    // Only logged when there's actually a note to show — an empty save
    // (clearing the field) doesn't need its own timeline entry.
    await logAuditEvent({ actor: "admin", action: "lead.notes_updated", targetType: "prospect", targetId: leadId, metadata: { notes } });
  }

  revalidatePath("/admin/leads");
}

export async function updateLeadConceptSlug(leadId: string, formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const conceptSlug = String(formData.get("concept_slug") || "").trim();

  // Read the previous value first — the deep research pipeline (below)
  // only fires on the null → set transition, not on every edit, and
  // never on leads that already had a concept_slug before this shipped
  // (per docs/deep-research-pipeline-plan.md's "going forward only"
  // decision — same convention research-lead.ts already follows for not
  // silently overwriting existing state).
  const { data: existing } = await supabase.from("prospects").select("concept_slug").eq("id", leadId).single();
  const previousSlug = existing?.concept_slug ?? null;

  const { error } = await supabase
    .from("prospects")
    .update({ concept_slug: conceptSlug || null })
    .eq("id", leadId);
  if (error) {
    console.error("Failed to update lead concept slug:", error);
  } else {
    await logAuditEvent({
      actor: "admin",
      action: "lead.concept_slug_updated",
      targetType: "prospect",
      targetId: leadId,
      metadata: { concept_slug: conceptSlug || null },
    });

    // Deep research pipeline Phase 1 — concept pages are hand-authored
    // static files, not something the app "creates" as an event, so this
    // is the only real "a concept page now exists for this lead" signal
    // available (see docs/deep-research-pipeline-plan.md §2.1). Runs via
    // after() so the concept-slug save the admin is waiting on isn't
    // blocked by it.
    if (!previousSlug && conceptSlug) {
      const jobId = await createResearchJob(leadId);
      if (jobId) after(() => runResearchJob(jobId));
    }
  }

  revalidatePath("/admin/leads");
}

export async function updateClientStatus(clientId: string, status: string, revalidate: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: previous } = await supabase.from("clients").select("status").eq("id", clientId).single();
  const { error } = await supabase.from("clients").update({ status }).eq("id", clientId);
  if (error) {
    console.error("Failed to update client status:", error);
  } else {
    await logAuditEvent({
      actor: "admin",
      action: "client.status_changed",
      targetType: "client",
      targetId: clientId,
      clientId,
      metadata: { from: previous?.status ?? null, to: status },
    });
  }

  revalidatePath(revalidate);
  revalidatePath("/admin/clients");
}

// Clients have no link back to whichever lead (if any) originally became
// them — see docs/lily-golf-test-project.md Phase 8 — so a concept page
// linked on the prospect record is invisible from the client's own admin
// view with no way to see or change it. This gives the client its own,
// independent concept_slug rather than trying to solve full lead-to-client
// linking here.
export async function updateClientConceptSlug(clientId: string, revalidate: string, formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const conceptSlug = String(formData.get("concept_slug") || "").trim();
  const { error } = await supabase.from("clients").update({ concept_slug: conceptSlug || null }).eq("id", clientId);
  if (error) {
    console.error("Failed to update client concept slug:", error);
  } else {
    await logAuditEvent({
      actor: "admin",
      action: "client.concept_slug_updated",
      targetType: "client",
      targetId: clientId,
      clientId,
      metadata: { concept_slug: conceptSlug || null },
    });
  }

  revalidatePath(revalidate);
}

export async function toggleAnalyticsEnabled(clientId: string, enabled: boolean, revalidate: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("clients").update({ analytics_enabled: enabled }).eq("id", clientId);
  if (error) console.error("Failed to toggle AI Business Analytics entitlement:", error);

  revalidatePath(revalidate);
}

export async function startSubscriptionAction(clientId: string, revalidate: string) {
  const result = await startSubscription(clientId);
  if ("error" in result) {
    console.error("Failed to start subscription:", result.error);
  } else {
    await logAuditEvent({
      actor: "admin",
      action: "subscription.started",
      targetType: "client",
      targetId: clientId,
      clientId,
      metadata: { stripe_subscription_id: result.subscriptionId },
    });
  }
  revalidatePath(revalidate);
}

export async function cancelSubscriptionAction(clientId: string, revalidate: string) {
  const result = await cancelSubscription(clientId);
  if ("error" in result) {
    console.error("Failed to cancel subscription:", result.error);
  } else {
    await logAuditEvent({ actor: "admin", action: "subscription.cancelled", targetType: "client", targetId: clientId, clientId });
  }
  revalidatePath(revalidate);
}

export async function updateMaintenanceRate(clientId: string, revalidate: string, formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const pounds = parseFloat(String(formData.get("maintenance_monthly") || ""));
  const pence = Number.isFinite(pounds) && pounds > 0 ? Math.round(pounds * 100) : null;

  const { error } = await supabase.from("clients").update({ maintenance_monthly_pence: pence }).eq("id", clientId);
  if (error) {
    console.error("Failed to update maintenance rate:", error);
  } else {
    await logAuditEvent({
      actor: "admin",
      action: "client.maintenance_rate_changed",
      targetType: "client",
      targetId: clientId,
      clientId,
      metadata: { maintenance_monthly_pence: pence },
    });
  }

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

  // getPortalMembership resolves one email to exactly one client (oldest
  // invite wins) — the portal doesn't support one email having access to
  // two organisations. Inviting an email already attached elsewhere
  // wouldn't hit the (client_id, email) unique constraint below (different
  // client_id), so without this check it would silently create a dead
  // invite that can never actually sign in to *this* client. Found by
  // hitting exactly this while testing the Lily Golf / Gowf project — see
  // docs/lily-golf-test-project.md Phase 8 — surfacing it here instead.
  const { data: existingElsewhere } = await supabase
    .from("client_members")
    .select("client_id, clients(business_name)")
    .eq("email", email)
    .neq("client_id", clientId)
    .limit(1)
    .maybeSingle();

  if (existingElsewhere) {
    const otherBusinessName =
      (existingElsewhere.clients as unknown as { business_name?: string } | null)?.business_name ?? "another client";
    redirect(
      `${revalidate}?member_error=${encodeURIComponent(
        `${email} already has portal access to ${otherBusinessName} — one email can only belong to one client's portal today, so inviting it here won't work.`
      )}`
    );
  }

  const { data: client } = await supabase.from("clients").select("business_name").eq("id", clientId).single();

  const { error } = await supabase.from("client_members").insert({ client_id: clientId, email, role, invited_by: "admin" });

  if (error) {
    // 23505 = unique_violation (client_id, email) -- they're already a
    // member, which isn't really a failure worth logging as one.
    if (error.code !== "23505") console.error("Failed to invite client member:", error);
  } else if (client) {
    await logAuditEvent({ actor: "admin", action: "client_member.invited", targetType: "client_member", clientId, metadata: { email, role } });
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

  const { data: member } = await supabase.from("client_members").select("client_id, email").eq("id", memberId).single();
  const { error } = await supabase.from("client_members").delete().eq("id", memberId);
  if (error) {
    console.error("Failed to remove client member:", error);
  } else if (member) {
    await logAuditEvent({
      actor: "admin",
      action: "client_member.removed",
      targetType: "client_member",
      targetId: memberId,
      clientId: member.client_id,
      metadata: { email: member.email },
    });
  }

  revalidatePath(revalidate);
}

export type ResearchState = { research?: LeadResearch; score?: number; generatedAt?: string; error?: string };

export async function generateLeadResearch(
  leadId: string,
  _prevState: ResearchState,
  _formData: FormData
): Promise<ResearchState> {
  const result = await researchLead(leadId);
  revalidatePath("/admin/leads");
  if ("error" in result) return { error: result.error };
  return { research: result.research, score: result.score, generatedAt: result.generatedAt };
}

export type SalesKitState = { kit?: SalesKit; generatedAt?: string; error?: string };

// High Impact #8: one Claude call producing all six outreach artifacts at
// once (see draft-sales-kit.ts) — replaces the old separate
// generateLeadEmailDraft (x2, initial + follow-up) and
// generateLeadCallScript actions/components, which are no longer wired
// into the leads page.
export async function generateSalesKit(
  leadId: string,
  _prevState: SalesKitState,
  _formData: FormData
): Promise<SalesKitState> {
  const result = await draftSalesKit(leadId);
  revalidatePath("/admin/leads");
  if ("error" in result) return { error: result.error };
  return { kit: result.kit, generatedAt: result.generatedAt };
}

export type SaveKitEmailState = { email?: string | null; error?: string; gmailError?: string };

// Saves the already-generated (cached) outreach or follow-up email from a
// lead's sales kit as a real Gmail draft — no new LLM call, just reads
// `sales_kit` back out and hands it to the same createLeadGmailDraft used
// by draft-lead-email.ts. Mirrors that file's "don't throw the draft away
// if Gmail saving fails" behaviour: the text stays cached either way, only
// the save-to-Gmail step can fail.
export async function saveSalesKitEmailToGmail(
  leadId: string,
  variant: "outreach" | "follow_up",
  _prevState: SaveKitEmailState,
  _formData: FormData
): Promise<SaveKitEmailState> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." };

  const { data: lead, error: leadError } = await supabase
    .from("prospects")
    .select("email, sales_kit")
    .eq("id", leadId)
    .single();
  if (leadError || !lead) return { error: "Lead not found." };

  const kit = lead.sales_kit as SalesKit | null;
  if (!kit) return { error: "No sales kit generated yet." };

  const { subject, body } = variant === "follow_up" ? kit.follow_up_email : kit.outreach_email;

  async function logSaved(savedToGmail: boolean, gmailError?: string) {
    await logAuditEvent({
      actor: "admin",
      action: "lead.email_drafted",
      targetType: "prospect",
      targetId: leadId,
      metadata: { subject, is_follow_up: variant === "follow_up", saved_to_gmail: savedToGmail, gmail_error: gmailError ?? null, source: "sales_kit" },
    });
  }

  if (!lead.email) {
    const gmailError = "No email on file for this lead — copy this and send it another way (e.g. Facebook).";
    await logSaved(false, gmailError);
    return { email: null, gmailError };
  }

  const created = await createLeadGmailDraft({ to: lead.email, subject, body });
  if ("error" in created) {
    await logSaved(false, created.error);
    return { email: lead.email, gmailError: created.error };
  }

  await supabase.from("prospects").update({ pending_email_message_id: created.threadId }).eq("id", leadId);
  await logSaved(true);
  revalidatePath("/admin/leads");
  return { email: lead.email };
}

// Phase 1 of docs/teams-meeting-intelligence-plan.md — scheduling only,
// no AI yet. Two plain RPC-style actions rather than useActionState: both
// are click-driven (pick a slot, confirm it), nothing text-typed to
// submit, so there's no form to bind to — same style markLeadCalled etc.
// already use via startTransition on the client side.
// _leadId isn't used yet — findAvailableSlots only reads Hamish's own
// calendar today. Kept on the signature (rather than dropped) for a future
// per-lead override, e.g. a client's own stated preferred hours.
export async function getMeetingSlotSuggestions(_leadId: string): Promise<{ slots: MeetingSlot[] } | { error: string }> {
  return findAvailableSlots();
}

export async function scheduleLeadMeeting(
  leadId: string,
  startLocal: string,
  endLocal: string
): Promise<{ joinUrl: string; scheduledStart: string; meetingId: string } | { error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." };

  const { data: lead, error: leadError } = await supabase
    .from("prospects")
    .select("business_name, email")
    .eq("id", leadId)
    .single();
  if (leadError || !lead) return { error: "Lead not found." };

  const created = await createTeamsMeeting({
    subject: `Hamish AI <> ${lead.business_name}`,
    attendeeEmail: lead.email,
    attendeeName: lead.business_name,
    startLocal,
    endLocal,
    bodyHtml: "<p>Looking forward to speaking — join using the Teams link in this invite.</p>",
  });
  if ("error" in created) return { error: created.error };

  const { data: inserted, error: insertError } = await supabase
    .from("lead_meetings")
    .insert({
      prospect_id: leadId,
      ms_event_id: created.eventId,
      ms_meeting_id: created.meetingId,
      scheduled_start: created.startIso,
      scheduled_end: created.endIso,
      join_url: created.joinUrl,
      status: "scheduled",
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    console.error("Failed to save scheduled meeting:", insertError);
    return { error: "Meeting created in Teams but failed to save here — check Outlook directly." };
  }

  await logAuditEvent({
    actor: "admin",
    action: "lead.meeting_scheduled",
    targetType: "prospect",
    targetId: leadId,
    metadata: { meeting_id: inserted.id, scheduled_start: created.startIso, join_url: created.joinUrl },
  });

  revalidatePath("/admin/leads");
  return { joinUrl: created.joinUrl, scheduledStart: created.startIso, meetingId: inserted.id };
}

// --- Content Factory MVP (docs/content-factory-plan.md) — Phase A ---
// Idea Discovery / Research / Scoring only. Script generation, video
// generation, and approval actions join this section as later build
// phases land.

export async function addContentIdea(formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const title = String(formData.get("title") || "");
  const concept = String(formData.get("concept") || "");
  const { data: inserted, error } = await supabase
    .from("content_ideas")
    .insert({
      title,
      concept,
      topic: String(formData.get("topic") || "") || null,
      platform_target: String(formData.get("platform_target") || "shorts"),
      status: "new",
      source: "manual",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert content idea:", error);
  } else if (inserted) {
    await logAuditEvent({
      actor: "admin",
      action: "content.idea_created",
      targetType: "content_idea",
      targetId: inserted.id,
      metadata: { title },
    });
  }

  revalidatePath("/admin/content-factory");
}

export type ContentIdeaResearchState = {
  research?: ContentIdeaResearch;
  score?: number;
  rejected?: boolean;
  generatedAt?: string;
  error?: string;
};

export async function generateIdeaResearch(
  ideaId: string,
  _prevState: ContentIdeaResearchState,
  _formData: FormData
): Promise<ContentIdeaResearchState> {
  const result = await researchContentIdea(ideaId);
  revalidatePath("/admin/content-factory");
  revalidatePath(`/admin/content-factory/${ideaId}`);
  if ("error" in result) return { error: result.error };
  return { research: result.research, score: result.score, rejected: result.rejected, generatedAt: result.generatedAt };
}

export async function rejectContentIdea(ideaId: string, formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const reason = String(formData.get("reason") || "") || "Rejected manually.";
  const { error } = await supabase
    .from("content_ideas")
    .update({ status: "rejected", rejected_reason: reason, rejected_at: new Date().toISOString() })
    .eq("id", ideaId);

  if (error) {
    console.error("Failed to reject content idea:", error);
  } else {
    await logAuditEvent({
      actor: "admin",
      action: "content.idea_rejected",
      targetType: "content_idea",
      targetId: ideaId,
      metadata: { reason },
    });
  }

  revalidatePath("/admin/content-factory");
  revalidatePath(`/admin/content-factory/${ideaId}`);
}

// --- Content Factory MVP Phase B (docs/content-factory-plan.md) ---
// Scripts auto-generate and auto-select via research-content-idea.ts's
// chain — these are the manual override paths: regenerate (with a
// confirm step if it would clobber a hand-edit), switch which variant is
// selected, or hand-edit the selected one directly.

export type ContentScriptsState = {
  variants?: (ScriptVariant & { id: string })[];
  selectedId?: string;
  error?: string;
  needsConfirm?: boolean;
};

export async function generateIdeaScripts(
  ideaId: string,
  _prevState: ContentScriptsState,
  formData: FormData
): Promise<ContentScriptsState> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: selected } = await supabase
      .from("content_scripts")
      .select("edited")
      .eq("idea_id", ideaId)
      .eq("status", "selected")
      .maybeSingle();
    const force = formData.get("force") === "1";
    if (selected?.edited && !force) {
      return {
        error: "The current script has a manual edit — regenerating replaces all three variants, including that edit. Submit again to confirm.",
        needsConfirm: true,
      };
    }
  }

  const result = await generateContentScripts(ideaId);
  revalidatePath("/admin/content-factory");
  revalidatePath(`/admin/content-factory/${ideaId}`);
  if ("error" in result) return { error: result.error };
  return { variants: result.variants, selectedId: result.selectedId };
}

// Manual override of the auto-selected variant — flips status on both
// sides (chosen -> selected, every sibling -> rejected) and re-chains
// video-prompt generation onto the newly-chosen script, same shape as the
// auto-select path in generate-content-scripts.ts itself.
export async function selectContentScript(scriptId: string, ideaId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: chosen } = await supabase.from("content_scripts").select("style").eq("id", scriptId).single();

  const { error } = await supabase
    .from("content_scripts")
    .update({ status: "selected", reviewed_at: new Date().toISOString() })
    .eq("id", scriptId);
  if (error) {
    console.error("Failed to select content script:", error);
    return;
  }
  await supabase.from("content_scripts").update({ status: "rejected" }).eq("idea_id", ideaId).neq("id", scriptId);

  await logAuditEvent({
    actor: "admin",
    action: "content.script_selected",
    targetType: "content_idea",
    targetId: ideaId,
    metadata: { style: chosen?.style, manual: true },
  });

  try {
    await generateVideoPrompt(scriptId);
  } catch (error) {
    console.error(`Video-prompt generation failed after manual script selection (script ${scriptId}):`, error);
  }

  revalidatePath("/admin/content-factory");
  revalidatePath(`/admin/content-factory/${ideaId}`);
}

// Hand-edit the selected script's hook/beats directly — sets edited=true
// so generateIdeaScripts' regenerate path knows to ask before clobbering
// it. Re-chains video-prompt generation so the ViewMax prompt reflects the
// edited text rather than going stale.
export async function editContentScript(scriptId: string, ideaId: string, formData: FormData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const hook = String(formData.get("hook") || "");
  const beats = {
    setup: String(formData.get("setup") || ""),
    escalation: String(formData.get("escalation") || ""),
    payoff: String(formData.get("payoff") || ""),
    ending: String(formData.get("ending") || ""),
  };
  const fullScript = [hook, beats.setup, beats.escalation, beats.payoff, beats.ending].join(" ");

  const { error } = await supabase
    .from("content_scripts")
    .update({ hook, beats, full_script: fullScript, edited: true })
    .eq("id", scriptId);
  if (error) {
    console.error("Failed to edit content script:", error);
    return;
  }

  await logAuditEvent({
    actor: "admin",
    action: "content.script_selected",
    targetType: "content_idea",
    targetId: ideaId,
    metadata: { manual: true, edited: true },
  });

  try {
    await generateVideoPrompt(scriptId);
  } catch (error) {
    console.error(`Video-prompt generation failed after manual script edit (script ${scriptId}):`, error);
  }

  revalidatePath("/admin/content-factory");
  revalidatePath(`/admin/content-factory/${ideaId}`);
}
