import { NextResponse } from "next/server";
import { snapshotHealthForAllOrgs } from "@/lib/studio-health-history";
import { snapshotAdoptionForAllOrgs } from "@/lib/studio-adoption-history";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { recordCronRun } from "@/lib/record-cron-run";

// Triggered weekly by the Vercel Cron job in vercel.json — same shared-
// secret bearer-token pattern as every other cron route.
//
// Also runs the AI adoption trend snapshot (studio-adoption-history.ts,
// Command Centre improvement #8) — deliberately folded into this same
// cron rather than given its own vercel.json entry. It's architecturally
// the same shape (one real per-org snapshot, once a week) as the health
// snapshot this route already runs, and this session flagged the cron
// count as worth a Vercel plan check more than once already; a 14th job
// for the same recurring shape didn't seem worth it. The two stay
// separate functions/tables/failure modes below, just one shared trigger.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const healthResult = await snapshotHealthForAllOrgs();
  if ("error" in healthResult) {
    await sendErrorAlert("Health snapshot cron", healthResult.error ?? "Unknown error.");
    await recordCronRun("health-snapshot", "error", { error: healthResult.error });
    return NextResponse.json({ error: healthResult.error }, { status: 500 });
  }

  // A failed adoption snapshot doesn't undo an already-successful health
  // one — each write stands on its own, same "never let a logging/
  // secondary failure erase a real completed write" instinct as
  // recordCronRun()'s own fire-and-forget contract.
  const adoptionResult = await snapshotAdoptionForAllOrgs();
  if ("error" in adoptionResult) {
    await sendErrorAlert("Adoption snapshot cron", adoptionResult.error ?? "Unknown error.");
  }

  await recordCronRun("health-snapshot", "success", {
    summary: {
      snapshotted: healthResult.snapshotted,
      adoptionSnapshotted: "error" in adoptionResult ? null : adoptionResult.snapshotted,
      adoptionError: "error" in adoptionResult ? adoptionResult.error : null,
    },
  });

  return NextResponse.json({
    snapshotted: healthResult.snapshotted,
    adoptionSnapshotted: "error" in adoptionResult ? null : adoptionResult.snapshotted,
  });
}
