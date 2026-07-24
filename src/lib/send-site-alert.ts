import { Resend } from "resend";
import { siteConfig } from "@/lib/site-config";

export type FlaggedClient = {
  businessName: string;
  websiteUrl: string;
  reasons: string[];
  aiSummary: string | null;
};

// Same Resend pattern already established in src/lib/save-lead.ts — one
// consolidated email per cron run, not one per flagged client, so a bad
// morning doesn't turn into an inbox flood.
export async function sendSiteAlertEmail(flagged: FlaggedClient[]) {
  if (flagged.length === 0) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("Site check alerts (RESEND_API_KEY not set, not emailed):", flagged);
    return;
  }

  const resend = new Resend(apiKey);
  const toEmail = process.env.CONTACT_TO_EMAIL || siteConfig.email;

  const body = flagged
    .map(
      (f) =>
        `${f.businessName} (${f.websiteUrl})\nIssues: ${f.reasons.join(", ")}\n${f.aiSummary || ""}`
    )
    .join("\n\n---\n\n");

  const { error } = await resend.emails.send({
    from: "Hamish AI <onboarding@resend.dev>",
    to: toEmail,
    subject: `Site check alert: ${flagged.length} client${flagged.length === 1 ? "" : "s"} need attention`,
    text: `The daily website health check found issues for ${flagged.length} client${flagged.length === 1 ? "" : "s"}:\n\n${body}`,
  });

  if (error) {
    console.error("Resend site alert email failed:", error);
  }
}
