import { Resend } from "resend";
import { siteConfig } from "@/lib/site-config";

// Content Factory MVP Phase C (docs/content-factory-plan.md) — one
// consolidated email per content-video-pipeline cron run, same pattern as
// send-site-alert.ts, not one per video (a good morning of 3 videos
// completing shouldn't be 3 separate emails). Skips entirely if there's
// nothing actionable, same restraint as weekly-digest.ts.
export async function sendContentReviewAlert(params: { readyForReview: number; failed: number; lowCredits?: number }) {
  if (params.readyForReview === 0 && params.failed === 0 && params.lowCredits == null) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("Content review alert (RESEND_API_KEY not set, not emailed):", params);
    return;
  }

  const resend = new Resend(apiKey);
  const toEmail = process.env.CONTACT_TO_EMAIL || siteConfig.email;

  const lines: string[] = [];
  if (params.readyForReview > 0) lines.push(`🎬 ${params.readyForReview} video${params.readyForReview === 1 ? "" : "s"} ready for your review.`);
  if (params.failed > 0) lines.push(`⚠️ ${params.failed} video${params.failed === 1 ? "" : "s"} failed — check /admin/content-factory.`);
  if (params.lowCredits != null) lines.push(`⚠️ ViewMax credits are low (${params.lowCredits}) — video submission is paused until you top up.`);

  const { error } = await resend.emails.send({
    from: "Hamish AI <onboarding@resend.dev>",
    to: toEmail,
    subject: `Content Factory: ${params.readyForReview} ready, ${params.failed} failed`,
    text: lines.join("\n"),
  });

  if (error) console.error("Resend content-review alert email failed:", error);
}
