import { getSupabaseAdmin } from "@/lib/supabase";
import {
  checkViewMaxConnection,
  listViewMaxModels,
  getViewMaxCredits,
  submitVideoGeneration,
  getViewMaxTaskStatus,
  pickCheapestVideoOption,
  type ViewMaxModel,
} from "@/lib/viewmax";
import { recordContentUsage } from "@/lib/content-ai-usage";
import { storeGeneratedVideo } from "@/lib/content-video-storage";
import { computeQualityFlags } from "@/lib/content-quality-check";
import { generateContentCopy } from "@/lib/generate-content-copy";
import { logAuditEvent } from "@/lib/audit-log";
import { MIN_SCORE_TO_PROCEED } from "@/lib/research-content-idea";
import type { VideoPromptSpec } from "@/lib/generate-video-prompt";

// Content Factory MVP Phase C (docs/content-factory-plan.md) — the
// ViewMax submit+poll orchestrator, modeled on deep-research-pipeline.ts's
// job-runner shape: every failure path resolves into a terminal or
// durable status row, never throws outward.

const MAX_SUBMISSIONS_PER_RUN = 3; // safety valve — mirrors MAX_NEW_LEADS_PER_RUN/MAX_NEW_IDEAS_PER_RUN elsewhere in this codebase
const MAX_INFLIGHT_PER_RUN = 5;
// A small safety margin kept back *on top of* whatever the chosen video
// actually costs (see pickCheapestVideoOption in viewmax.ts) — not a
// flat "minimum balance to do anything" check on its own. Real per-video
// costs run from ~13 credits (cheapest model, shortest 9:16 clip) up
// into the hundreds for premium models, confirmed against ViewMax's live
// model catalog — a fixed threshold with no cost awareness would either
// block affordable videos or let the account run to zero.
const VIEWMAX_MIN_CREDIT_BUFFER = Number(process.env.VIEWMAX_MIN_CREDIT_BUFFER) || 5;

// ViewMax's docs say poll every 5s, but a multi-minute generation can't
// be tracked by one Vercel invocation, and this codebase deliberately has
// no persistent job queue (see docs/content-factory-plan.md's "poll-
// interval decision"). Each cron tick does a short bounded burst — up to
// 6 polls, 5s apart (~30s), matching ViewMax's documented interval within
// the burst — then leaves the row for the next tick if still not done.
const POLL_BURST_ATTEMPTS = 6;
const POLL_BURST_INTERVAL_MS = 5000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SubmitReadyIdeasResult = { submitted: number; skipped: string[] } | { error: string };

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

// The actual per-idea ViewMax submission — pulled out of submitReadyIdeas
// so Phase D's manual "Regenerate" action (see admin/actions.ts) can
// reuse the exact same logic instead of a second, drifting copy. Caller
// owns the connection check and the model-catalog lookup (batched once
// per cron tick in submitReadyIdeas; done once per call in
// content-video-pipeline.ts's exported single-idea wrapper below) — this
// function picks the cheapest compatible (model, duration, resolution)
// combo for THIS idea's specific target duration/aspect ratio from that
// catalog and checks it's actually affordable before spending anything.
async function submitIdeaForVideo(
  supabase: SupabaseAdmin,
  idea: { id: string; score: number | null },
  models: ViewMaxModel[]
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if ((idea.score ?? 0) < MIN_SCORE_TO_PROCEED) return { ok: false, reason: "below_threshold" };

  const { data: script } = await supabase
    .from("content_scripts")
    .select("id, video_prompt")
    .eq("idea_id", idea.id)
    .eq("status", "selected")
    .maybeSingle();
  if (!script?.video_prompt) return { ok: false, reason: "no_video_prompt" };

  const videoPrompt = script.video_prompt as VideoPromptSpec;

  // Never pass the AI-generated duration/resolution straight through —
  // ViewMax models each accept only their own exact enumerated duration/
  // resolution strings (confirmed against the live catalog: there is no
  // free-form value), so this picks the cheapest real combination that
  // actually supports the target duration and aspect ratio.
  const option = pickCheapestVideoOption(models, videoPrompt.duration_s, videoPrompt.aspect_ratio);
  if (!option) return { ok: false, reason: `no_model_supports_${videoPrompt.aspect_ratio}` };

  const creditsBefore = await getViewMaxCredits();
  if (creditsBefore == null) return { ok: false, reason: "credits_check_failed" };
  if (creditsBefore < option.credits + VIEWMAX_MIN_CREDIT_BUFFER) {
    return { ok: false, reason: `insufficient_credits:need_${option.credits}_have_${creditsBefore}` };
  }

  const requestPayload = {
    model: option.model,
    prompt: videoPrompt.prompt,
    duration: option.duration,
    resolution: option.resolution,
    aspect_ratio: option.aspectRatio,
  };

  const result = await submitVideoGeneration(requestPayload);

  if ("error" in result) {
    await supabase.from("content_videos").insert({
      idea_id: idea.id,
      script_id: script.id,
      status: "failed",
      viewmax_model: option.model,
      request_payload: requestPayload,
      error: result.error,
    });
    // 'failed', not 'video_review' — nothing was ever generated, so
    // there's nothing to review yet. 'video_review' is reserved for
    // "a human should look at this" outcomes (success, or an ambiguous
    // needs_review case), not a clean submission failure.
    await supabase.from("content_ideas").update({ status: "failed" }).eq("id", idea.id);
    await logAuditEvent({
      actor: "system",
      actorType: "system",
      action: "content.video_failed",
      targetType: "content_idea",
      targetId: idea.id,
      metadata: { error: result.error, stage: "submit" },
    });
    return { ok: false, reason: "submit_failed" };
  }

  const creditsAfter = await getViewMaxCredits();
  const creditsSpent = creditsAfter != null ? Math.max(0, creditsBefore - creditsAfter) : option.credits; // fall back to the catalog's declared cost if the follow-up credits check itself fails

  await supabase.from("content_videos").insert({
    idea_id: idea.id,
    script_id: script.id,
    status: "submitted",
    viewmax_task_id: result.taskId,
    viewmax_model: option.model,
    request_payload: requestPayload,
    credits_spent: creditsSpent,
    started_at: new Date().toISOString(),
  });
  await supabase.from("content_ideas").update({ status: "generating_video" }).eq("id", idea.id);

  await recordContentUsage({ ideaId: idea.id, stage: "viewmax_video", provider: "viewmax", units: creditsSpent, unitType: "credits", metadata: { model: option.model } });

  await logAuditEvent({
    actor: "system",
    actorType: "system",
    action: "content.video_submitted",
    targetType: "content_idea",
    targetId: idea.id,
    metadata: { model: option.model, task_id: result.taskId, credits: creditsSpent },
  });

  return { ok: true };
}

// Finds ideas sitting at 'ready_for_video' and submits their selected
// script's video_prompt to ViewMax. Re-checks the score gate defensively
// (the primary check already happened in research-content-idea.ts —
// this guards against the threshold or a score changing between stages).
// The credit check itself now happens per-idea inside submitIdeaForVideo
// against that idea's actual chosen-option cost — a single flat balance
// check up front here would say nothing about whether any given idea's
// specific video is actually affordable.
export async function submitReadyIdeas(): Promise<SubmitReadyIdeasResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." };

  const connection = await checkViewMaxConnection();
  if (!connection.connected) {
    console.log(`ViewMax not configured or unreachable — skipping video submission (${connection.reason}).`);
    return { submitted: 0, skipped: [] };
  }

  const { data: ideas, error } = await supabase
    .from("content_ideas")
    .select("id, score")
    .eq("status", "ready_for_video")
    .order("created_at", { ascending: true })
    .limit(MAX_SUBMISSIONS_PER_RUN);
  if (error) return { error: "Failed to fetch ready ideas." };
  if (!ideas?.length) return { submitted: 0, skipped: [] };

  const models = await listViewMaxModels("video");
  if (!models?.length) {
    console.error("No ViewMax models returned — skipping submission this run.");
    return { submitted: 0, skipped: ["no_models_available"] };
  }

  let submitted = 0;
  const skipped: string[] = [];

  for (const idea of ideas) {
    const result = await submitIdeaForVideo(supabase, idea, models);
    if (result.ok) submitted++;
    else skipped.push(`${idea.id}:${result.reason}`);
  }

  return { submitted, skipped };
}

// Phase D — the manual "Regenerate" action's entry point (see
// regenerateContentVideo in admin/actions.ts): does its own connection/
// model-catalog lookup (there's no batch to share it across) then reuses
// submitIdeaForVideo for the actual submission (including its per-idea
// cost/affordability check) — so a human-triggered regenerate and the
// cron's automatic submission can never drift into two different code
// paths.
export async function submitSingleIdeaForVideo(ideaId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, reason: "Supabase is not configured." };

  const connection = await checkViewMaxConnection();
  if (!connection.connected) return { ok: false, reason: connection.reason };

  const { data: idea, error } = await supabase.from("content_ideas").select("id, score").eq("id", ideaId).single();
  if (error || !idea) return { ok: false, reason: "Idea not found." };

  const models = await listViewMaxModels("video");
  if (!models?.length) return { ok: false, reason: "No ViewMax models available." };

  return submitIdeaForVideo(supabase, idea, models);
}

export type PollInFlightResult = { completed: number; failed: number; stillProcessing: number } | { error: string };

// Bounded inline poll burst per in-flight video — see the module header
// for why. Every outcome (success, failure, still-processing) resolves
// into either a terminal content_videos.status or an updated
// poll_attempts/last_polled_at, never a throw.
export async function pollInFlightVideos(): Promise<PollInFlightResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." };

  const { data: videos, error } = await supabase
    .from("content_videos")
    .select("id, idea_id, script_id, viewmax_task_id, poll_attempts")
    .in("status", ["submitted", "processing"])
    .order("created_at", { ascending: true })
    .limit(MAX_INFLIGHT_PER_RUN);
  if (error) return { error: "Failed to fetch in-flight videos." };
  if (!videos?.length) return { completed: 0, failed: 0, stillProcessing: 0 };

  let completed = 0;
  let failed = 0;
  let stillProcessing = 0;

  for (const video of videos) {
    if (!video.viewmax_task_id) {
      stillProcessing++;
      continue;
    }

    let resolved = false;

    for (let attempt = 0; attempt < POLL_BURST_ATTEMPTS && !resolved; attempt++) {
      if (attempt > 0) await sleep(POLL_BURST_INTERVAL_MS);

      const pollNumber = video.poll_attempts + attempt + 1;
      const result = await getViewMaxTaskStatus(video.viewmax_task_id);

      if ("error" in result) {
        await supabase.from("content_videos").update({ poll_attempts: pollNumber, last_polled_at: new Date().toISOString() }).eq("id", video.id);
        continue;
      }

      if (result.status === "success") {
        resolved = true;
        await handleVideoSuccess(supabase, video, result.resultUrls, pollNumber);
        completed++;
      } else if (result.status === "failed" || result.status === "canceled") {
        resolved = true;
        await supabase
          .from("content_videos")
          .update({ status: "failed", error: `ViewMax reported "${result.status}".`, poll_attempts: pollNumber, last_polled_at: new Date().toISOString() })
          .eq("id", video.id);
        await supabase.from("content_ideas").update({ status: "failed" }).eq("id", video.idea_id); // same reasoning as the submit-failure branch above
        await logAuditEvent({
          actor: "system",
          actorType: "system",
          action: "content.video_failed",
          targetType: "content_idea",
          targetId: video.idea_id,
          metadata: { video_id: video.id, stage: "poll", viewmax_status: result.status },
        });
        failed++;
      } else {
        await supabase.from("content_videos").update({ status: "processing", poll_attempts: pollNumber, last_polled_at: new Date().toISOString() }).eq("id", video.id);
      }
    }

    if (!resolved) stillProcessing++;
  }

  return { completed, failed, stillProcessing };
}

async function handleVideoSuccess(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  video: { id: string; idea_id: string; script_id: string },
  resultUrls: string[],
  pollNumber: number
) {
  const sourceUrl = resultUrls[0];
  if (!sourceUrl) {
    await supabase
      .from("content_videos")
      .update({ status: "needs_review", error: "ViewMax reported success but returned no result URL.", poll_attempts: pollNumber, last_polled_at: new Date().toISOString() })
      .eq("id", video.id);
    await supabase.from("content_ideas").update({ status: "video_review" }).eq("id", video.idea_id);
    return;
  }

  const stored = await storeGeneratedVideo(video.id, video.idea_id, sourceUrl);
  if ("error" in stored) {
    await supabase
      .from("content_videos")
      .update({ status: "needs_review", error: stored.error, result_urls: resultUrls, poll_attempts: pollNumber, last_polled_at: new Date().toISOString() })
      .eq("id", video.id);
    await supabase.from("content_ideas").update({ status: "video_review" }).eq("id", video.idea_id);
    return;
  }

  const { data: script } = await supabase.from("content_scripts").select("video_prompt").eq("id", video.script_id).single();
  const videoPrompt = script?.video_prompt as VideoPromptSpec | null;
  const qualityFlags = computeQualityFlags({ fileSizeBytes: stored.sizeBytes, expectedDurationS: videoPrompt?.duration_s ?? 0 });

  await supabase
    .from("content_videos")
    .update({
      status: "succeeded",
      result_urls: resultUrls,
      storage_path: stored.path,
      quality_flags: qualityFlags,
      poll_attempts: pollNumber,
      last_polled_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("id", video.id);
  await supabase.from("content_ideas").update({ status: "video_review" }).eq("id", video.idea_id);

  await logAuditEvent({
    actor: "system",
    actorType: "system",
    action: "content.video_completed",
    targetType: "content_idea",
    targetId: video.idea_id,
    metadata: { video_id: video.id },
  });

  // Best-effort, same "one bad downstream call shouldn't undo a good
  // upstream result" reasoning used throughout this pipeline.
  try {
    await generateContentCopy(video.id);
  } catch (copyError) {
    console.error(`Caption generation failed for video ${video.id}:`, copyError);
  }
}
