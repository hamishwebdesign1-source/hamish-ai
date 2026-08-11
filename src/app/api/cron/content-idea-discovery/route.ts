import { NextResponse } from "next/server";
import { discoverContentIdeas } from "@/lib/discover-content-ideas";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { recordCronRun } from "@/lib/record-cron-run";

// Triggered weekly by the Vercel Cron job in vercel.json — same
// shared-secret pattern as every other cron route (see
// lead-discovery/route.ts). No user session exists at 7am, so a bearer
// token is the auth boundary instead.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await discoverContentIdeas();
    if ("error" in result) {
      console.error("Content idea discovery cron failed:", result.error);
      await sendErrorAlert("Weekly content-idea-discovery cron", result.error);
      await recordCronRun("content-idea-discovery", "error", { error: result.error });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (result.searchFailures.length > 0) {
      await sendErrorAlert(
        "Weekly content-idea-discovery cron",
        `${result.searchFailures.length} of ${result.topicsSearched.length} topic searches failed:\n\n${result.searchFailures.join("\n")}`
      );
    }

    await recordCronRun("content-idea-discovery", "success", {
      summary: {
        inserted: result.inserted.length,
        skippedDuplicates: result.skippedDuplicates.length,
        topicsSearched: result.topicsSearched.length,
        searchFailures: result.searchFailures.length,
      },
    });

    return NextResponse.json({
      inserted: result.inserted.length,
      insertedTitles: result.inserted.map((i) => i.title),
      skippedDuplicates: result.skippedDuplicates.length,
      topicsSearched: result.topicsSearched,
    });
  } catch (err) {
    console.error("Content idea discovery cron crashed:", err);
    await sendErrorAlert("Weekly content-idea-discovery cron", `The run crashed partway through:\n\n${err}`);
    await recordCronRun("content-idea-discovery", "error", { error: String(err) });
    return NextResponse.json({ error: "Content idea discovery cron crashed." }, { status: 500 });
  }
}
