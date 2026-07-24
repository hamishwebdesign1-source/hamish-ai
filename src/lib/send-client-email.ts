import { Resend } from "resend";

// Client-facing counterpart to send-site-alert.ts's internal-alert pattern.
// Sent to real client inboxes, so — unlike the internal alerts, which ride
// Resend's sandbox onboarding@resend.dev address since Hamish is always the
// recipient — this needs a from-address on the verified hamishai.org domain
// or Resend will refuse (or spam-flag) delivery to external recipients.
export async function sendClientEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`Client email (RESEND_API_KEY not set, not sent) to ${to}: ${subject}\n${text}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: "Hamish AI <hello@hamishai.org>",
    to,
    subject,
    text,
  });

  if (error) {
    console.error(`Resend client email to ${to} failed:`, error);
  }
}
