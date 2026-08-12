import { getSupabaseAdmin } from "@/lib/supabase";

// Content Factory MVP Phase C (docs/content-factory-plan.md) — first
// Supabase Storage usage anywhere in this codebase. Bucket name is a
// hardcoded constant, not an env var, matching this repo's convention for
// things that don't change (e.g. SELF_URL in self-monitor.ts) — see
// supabase/schema-content-storage.sql for how the bucket itself gets
// created (private, never a public URL).
const BUCKET = "content-videos";

// Fetches the finished MP4 from ViewMax's result URL and uploads it into
// Storage. Never throws — on any failure (fetch fails, bucket missing
// because the SQL hasn't been run yet, upload fails) returns {error} and
// the caller sets content_videos.status = 'needs_review', same "every
// failure path resolves into a terminal status row" convention as
// deep-research-pipeline.ts.
export async function storeGeneratedVideo(
  videoId: string,
  ideaId: string,
  sourceUrl: string
): Promise<{ path: string; sizeBytes: number } | { error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." };

  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return { error: `Failed to fetch the generated video (HTTP ${res.status}).` };

    const buffer = await res.arrayBuffer();
    const path = `${ideaId}/${videoId}.mp4`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: "video/mp4", upsert: true });
    if (error) return { error: `Failed to upload to storage: ${error.message}` };

    return { path, sizeBytes: buffer.byteLength };
  } catch (error) {
    console.error(`Failed to store generated video ${videoId}:`, error);
    return { error: error instanceof Error ? error.message : "Failed to store the generated video." };
  }
}

// Server-side only — powers the <video> preview on the approval screen.
// Returns null (not throw) if Supabase isn't configured or the path is
// missing, same degrade-gracefully convention as everything else here.
export async function getSignedVideoUrl(storagePath: string, expiresInSeconds = 3600): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) {
    console.error(`Failed to create a signed URL for ${storagePath}:`, error);
    return null;
  }
  return data.signedUrl;
}
