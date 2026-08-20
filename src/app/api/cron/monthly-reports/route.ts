import { NextResponse } from "next/server";
import { generateMonthlyReportsForAllClients } from "@/lib/monthly-report";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { recordCronRun } from "@/lib/record-cron-run";

// Triggered on the 1st of each month by the Vercel Cron job in
// vercel.json — same shared-secret bearer-token pattern as every other
// cron route (no user session exists on a scheduled trigger).
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

  await recordCronRun("monthly-reports", "success", { summary: { generated: result.generated.length } });

  return NextResponse.json({ generated: result.generated.length });
}
