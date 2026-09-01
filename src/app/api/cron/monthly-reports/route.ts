import { NextResponse } from "next/server";
import { generateMonthlyReportsForAllClients } from "@/lib/monthly-report";
import { researchCompetitorIntelForAllOrgs } from "@/lib/competitor-intel";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { recordCronRun } from "@/lib/record-cron-run";

// Triggered on the 1st of each month by the Vercel Cron job in
// vercel.json — same shared-secret bearer-token pattern as every other
// cron route (no user session exists on a scheduled trigger).
//
// Also runs roadmap item #7's competitive-intelligence research
// (competitor-intel.ts) — folded into this same monthly cron rather than
// given its own vercel.json entry, same "architecturally the same shape
// (a per-client, once-a-month real generation), cron count is worth
// conserving" reasoning as trial-reminders.ts's own header. A failure
// here doesn't undo an already-successful report generation, same "never
// let a secondary failure erase a real completed run" rule as everywhere
// else these two-step crons appear.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateMonthlyReportsForAllClients();
  if ("error" in result) {
    await sendErrorAlert("Monthly reports cron", result.error ?? "Unknown error.");
    await recordCronRun("monthly-reports", "error", { error: result.error });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const intelResult = await researchCompetitorIntelForAllOrgs();
  if ("error" in intelResult) {
    await sendErrorAlert("Competitor intel cron", intelResult.error ?? "Unknown error.");
  }

  await recordCronRun("monthly-reports", "success", {
    summary: {
      generated: result.generated.length,
      competitorIntelFound: "error" in intelResult ? null : intelResult.found,
      competitorIntelError: "error" in intelResult ? intelResult.error : null,
    },
  });

  return NextResponse.json({
    generated: result.generated.length,
    competitorIntelFound: "error" in intelResult ? null : intelResult.found,
  });
}
