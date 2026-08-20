import { NextResponse } from "next/server";
import { sendTrialReminders } from "@/lib/trial-reminders";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { recordCronRun } from "@/lib/record-cron-run";

// Triggered daily by the Vercel Cron job in vercel.json — same
// shared-secret bearer-token pattern as every other cron route.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendTrialReminders();
  if ("error" in result) {
    await sendErrorAlert("Trial reminders cron", result.error ?? "Unknown error.");
    await recordCronRun("trial-reminders", "error", { error: result.error });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await recordCronRun("trial-reminders", "success", { summary: { sent: result.sent.length } });

  return NextResponse.json({ sent: result.sent.length });
}
