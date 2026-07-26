import { Resend } from "resend";
import { siteConfig } from "@/lib/site-config";

// Lightweight operational alerting — no dedicated error-tracking service,
// just an email via the Resend integration already used everywhere else.
// Reserved for failures serious enough that Hamish should know the same
// day rather than only discovering them by reading Vercel's own logs —
// not a catch-all for every console.error in the codebase.
export async function sendErrorAlert(context: string, detail: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`Error alert (RESEND_API_KEY not set, not emailed) [${context}]:`, detail);
    return;
  }

  const resend = new Resend(apiKey);
  const toEmail = process.env.CONTACT_TO_EMAIL || siteConfig.email;

  const { error } = await resend.emails.send({
    from: "Hamish AI <onboarding@resend.dev>",
    to: toEmail,
    subject: `Error: ${context}`,
    text: `Something failed that needs a look:\n\nContext: ${context}\n\n${detail}`,
  });

  if (error) {
    console.error("Failed to send error-alert email itself:", error);
  }
}
