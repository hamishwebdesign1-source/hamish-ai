import { Resend } from "resend";
import { siteConfig } from "@/lib/site-config";

// Same lightweight Resend-to-Hamish pattern as send-error-alert.ts and
// send-site-alert.ts, kept as its own file for the same reason those two
// are separate rather than merged: each is a distinct kind of alert with
// its own subject line and meaning, not a generic "email Hamish"
// catch-all. This one specifically closes the Studio feedback loop
// (the form now lives on /studio/help, merged there from its own former
// /studio/feedback route — Studio Design Audit, Tier 5 item #13) —
// unlike sendErrorAlert (application failures) or sendSiteAlertEmail
// (automated health checks), the trigger here is a tenant deliberately
// telling us something, so it's worth its own identity in the inbox.
export async function sendFeedbackAlert(orgName: string, fromEmail: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`Feedback (RESEND_API_KEY not set, not emailed) from ${orgName} <${fromEmail}>:`, message);
    return;
  }

  const resend = new Resend(apiKey);
  const toEmail = process.env.CONTACT_TO_EMAIL || siteConfig.email;

  const { error } = await resend.emails.send({
    from: "Hamish AI <onboarding@resend.dev>",
    to: toEmail,
    replyTo: fromEmail,
    subject: `Agency Platform feedback from ${orgName}`,
    text: `${message}\n\n—\n${orgName} (${fromEmail})`,
  });

  if (error) {
    console.error("Resend feedback alert email failed:", error);
  }
}
