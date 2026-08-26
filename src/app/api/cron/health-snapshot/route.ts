import { NextResponse } from "next/server";
import { snapshotHealthForAllOrgs } from "@/lib/studio-health-history";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { recordCronRun } from "@/lib/record-cron-run";

// Triggered weekly by the Vercel Cron job in vercel.json — same shared-
// secret bearer-token pattern as every other cron route.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await snapshotHealthForAllOrgs();
  if ("error" in result) {
    await sendErrorAlert("Health snapshot cron", result.error ?? "Unknown error.");
    await recordCronRun("health-snapshot", "error", { error: result.error });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await recordCronRun("health-snapshot", "success", { summary: { snapshotted: result.snapshotted } });

  return NextResponse.json({ snapshotted: result.snapshotted });
}
