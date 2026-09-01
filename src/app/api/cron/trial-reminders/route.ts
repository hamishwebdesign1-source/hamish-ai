import { NextResponse } from "next/server";
import { sendTrialReminders } from "@/lib/trial-reminders";
import { sendUsageWarnings, pruneOldUsageWarnings } from "@/lib/usage-warnings";
import { sendAutonomousFollowUps } from "@/lib/autonomous-outreach";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { recordCronRun } from "@/lib/record-cron-run";

// Triggered daily by the Vercel Cron job in vercel.json — same
// shared-secret bearer-token pattern as every other cron route.
//
// Also runs the proactive usage-limit warning (usage-warnings.ts, a
// real-improvement pass) and the autonomous outreach cadence (roadmap
// item #2, autonomous-outreach.ts) — deliberately folded into this same
// cron rather than given its own vercel.json entry, same reasoning as
// adoption-snapshot folding into health-snapshot: architecturally the
// same shape (a daily check against a real threshold, one email when
// crossed), and this session flagged the cron count as worth a Vercel
// plan check more than once already. All three stay separate
// functions/tables/failure modes below, just one shared trigger.
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

  // A failed usage-warnings pass doesn't undo an already-successful
  // trial-reminders one — each write stands on its own, same "never let
  // a secondary failure erase a real completed run" instinct as the
  // health/adoption snapshot cron already established.
  const usageResult = await sendUsageWarnings();
  if ("error" in usageResult) {
    await sendErrorAlert("Usage warnings cron", usageResult.error ?? "Unknown error.");
  }

  // Real-improvement pass — retention for usage_warnings_sent, same
  // "don't let a secondary failure erase a real completed write"
  // reasoning as everything else in this route.
  const usagePruneResult = await pruneOldUsageWarnings();
  if ("error" in usagePruneResult) {
    await sendErrorAlert("Usage warnings prune", usagePruneResult.error ?? "Unknown error.");
  }

  // Same "don't let a secondary failure erase an already-completed run"
  // rule as the two steps above — a failure here is real prospect email
  // that didn't go out, worth alerting on, but not a reason to mark this
  // whole cron run as failed when trial reminders already sent fine.
  const autonomousResult = await sendAutonomousFollowUps();
  if ("error" in autonomousResult) {
    await sendErrorAlert("Autonomous outreach cadence", autonomousResult.error ?? "Unknown error.");
  }

  await recordCronRun("trial-reminders", "success", {
    summary: {
      sent: result.sent.length,
      usageWarningsSent: "error" in usageResult ? null : usageResult.sent.length,
      usageWarningsError: "error" in usageResult ? usageResult.error : null,
      usageWarningsPruned: "error" in usagePruneResult ? null : usagePruneResult.pruned,
      autonomousFollowUpsSent: "error" in autonomousResult ? null : autonomousResult.sent,
      autonomousFollowUpsError: "error" in autonomousResult ? autonomousResult.error : null,
    },
  });

  return NextResponse.json({
    sent: result.sent.length,
    usageWarningsSent: "error" in usageResult ? null : usageResult.sent.length,
    autonomousFollowUpsSent: "error" in autonomousResult ? null : autonomousResult.sent,
  });
}
