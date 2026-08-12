import { NextResponse } from "next/server";
import { submitReadyIdeas, pollInFlightVideos } from "@/lib/content-video-pipeline";
import { sendContentReviewAlert } from "@/lib/send-content-alert";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { recordCronRun } from "@/lib/record-cron-run";

// Triggered once daily by the Vercel Cron job in vercel.json — was
// originally every 5 minutes, but Vercel's Hobby plan only allows daily
// cron jobs (a real deploy attempt failed outright on the */5 schedule;
// see cron-schedule.ts's file header). Each run still does a bounded
// inline poll burst per in-flight video (see content-video-pipeline.ts),
// so a video that finishes within that burst is picked up immediately —
// only one still processing after it waits until the next day's run.
// maxDuration gives the poll burst (up to 6 x 5s per video) headroom
// within Vercel's per-route execution limit.
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const submitResult = await submitReadyIdeas();
    if ("error" in submitResult) {
      console.error("Content video pipeline (submit) failed:", submitResult.error);
      await sendErrorAlert("Content video pipeline cron", submitResult.error);
      await recordCronRun("content-video-pipeline", "error", { error: submitResult.error });
      return NextResponse.json({ error: submitResult.error }, { status: 500 });
    }

    const pollResult = await pollInFlightVideos();
    if ("error" in pollResult) {
      console.error("Content video pipeline (poll) failed:", pollResult.error);
      await sendErrorAlert("Content video pipeline cron", pollResult.error);
      await recordCronRun("content-video-pipeline", "error", { error: pollResult.error });
      return NextResponse.json({ error: pollResult.error }, { status: 500 });
    }

    // Skip reasons look like "<ideaId>:insufficient_credits:need_20_have_10"
    // — per-idea now (see content-video-pipeline.ts's submitIdeaForVideo),
    // since affordability depends on which model/duration/resolution combo
    // that specific idea's video actually needs, not a single account-wide
    // threshold.
    const lowCreditsSkip = submitResult.skipped.find((s) => s.includes("insufficient_credits:"));
    const lowCredits = lowCreditsSkip ? Number(lowCreditsSkip.match(/have_(\d+)/)?.[1]) : undefined;

    await sendContentReviewAlert({ readyForReview: pollResult.completed, failed: pollResult.failed, lowCredits });

    await recordCronRun("content-video-pipeline", "success", {
      summary: { submitted: submitResult.submitted, skipped: submitResult.skipped.length, ...pollResult },
    });

    return NextResponse.json({ submitted: submitResult.submitted, ...pollResult });
  } catch (err) {
    console.error("Content video pipeline cron crashed:", err);
    await sendErrorAlert("Content video pipeline cron", `The run crashed partway through:\n\n${err}`);
    await recordCronRun("content-video-pipeline", "error", { error: String(err) });
    return NextResponse.json({ error: "Content video pipeline cron crashed." }, { status: 500 });
  }
}
