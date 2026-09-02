import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";

// Studio big-ticket #6 ("embedded chatbot has no lead-capture path") —
// see schema-embed-leads.sql for the full design reasoning. Deliberately
// small: no AI judgment call on *when* to offer this (the widget just
// always shows a "Leave your details" link, same reasoning as
// answer-embed-chat.ts's own scope decision to stay FAQ-only rather
// than trying to be a sales assistant) — a visitor decides for
// themselves whether the bot answered them well enough, not a model
// guessing at it.
export type CaptureLeadResult = { ok: true } | { error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 500;

export async function captureEmbedLead(clientId: string, email: string, message: string | null): Promise<CaptureLeadResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Not configured." };

  const trimmedEmail = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(trimmedEmail)) return { error: "Enter a valid email address." };

  // Same gate answerEmbedChat() already applies — never accept a lead
  // for a client whose embed isn't actually enabled, even if the
  // clientId itself is guessable (schema-chatbot-embed.sql's own
  // comment: the clientId isn't secret, the enabled flag + origin check
  // upstream in the route are the real gate).
  const { data: client } = await admin.from("clients").select("id, business_name, org_id, chatbot_embed_enabled").eq("id", clientId).maybeSingle();
  if (!client || !client.chatbot_embed_enabled) return { error: "Chat is not available." };

  const trimmedMessage = message?.trim().slice(0, MAX_MESSAGE_LENGTH) || null;

  const { error } = await admin.from("embed_leads").insert({
    client_id: clientId,
    org_id: client.org_id,
    email: trimmedEmail,
    message: trimmedMessage,
  });
  if (error) return { error: "Failed to save your details — please try again." };

  // Fire-and-forget, same convention as every other notification send
  // in this app — a lost notification should never mean the lead itself
  // wasn't actually captured.
  notifyNewEmbedLead(client.org_id, client.business_name, trimmedEmail, trimmedMessage);

  return { ok: true };
}

async function notifyNewEmbedLead(orgId: string, businessName: string, email: string, message: string | null): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  // Same recipient set owner-digest.ts/notifyProposalAccepted() already
  // use, and same sendClientEmail() reasoning — HamishAI genuinely
  // notifying a workspace about their own Studio activity, not the
  // tenant's own outbound identity.
  const { data: owners } = await admin.from("memberships").select("email").eq("org_id", orgId).eq("role", "owner").not("accepted_at", "is", null);
  const recipients = (owners ?? []).map((o) => o.email).filter((e): e is string => Boolean(e));

  const subject = `New lead from ${businessName}'s chatbot`;
  const text = `Hi,\n\nSomeone visiting ${businessName}'s website left their details with the embedded chatbot.\n\nEmail: ${email}${message ? `\nMessage: ${message}` : ""}\n\nView it here:\nhttps://hamishai.org/studio/clients\n\n— Hamish AI`;
  for (const recipient of recipients) {
    await sendClientEmail(recipient, subject, text);
  }
}
