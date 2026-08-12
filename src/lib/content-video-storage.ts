import { getSupabaseAdmin } from "@/lib/supabase";

// Content Factory MVP Phase C (docs/content-factory-plan.md) — first
// Supabase Storage usage anywhere in this codebase. Bucket name is a
// hardcoded constant, not an env var, matching this repo's convention for
// things that don't change (e.g. SELF_URL in self-monitor.ts) — see
// supabase/schema-content-storage.sql for how the bucket itself gets
// created (private, never a public URL).
const BUCKET = "content-videos";

// Measures a generated video's real duration by parsing its MP4
// container directly (the 'moov' > 'mvhd' box) rather than shelling out
// to ffprobe — Vercel's serverless runtime has no ffmpeg installed, and
// pulling in a binary for one field would be disproportionate. Found
// necessary the hard way (2026-08-12): ViewMax generated a 6-second clip
// for a request that asked for 30 seconds, and nothing in the pipeline
// could tell — computeQualityFlags' duration_flag existed but always got
// an undefined actualDurationS, so it silently reported "ok" on a video
// 80% shorter than requested with a rushed, overlapping voiceover as the
// direct, visible result. Verified against that exact real file (parsed
// value matched ffprobe's ground truth to 5 decimal places) before being
// wired in here.
function readMp4Box(buf: Buffer, offset: number, rangeEnd: number): { type: string; payloadStart: number; end: number } | null {
  if (offset + 8 > rangeEnd) return null;
  let size = buf.readUInt32BE(offset);
  const type = buf.toString("ascii", offset + 4, offset + 8);
  let headerSize = 8;
  if (size === 1) {
    // 64-bit extended size — vanishingly unlikely for a short generated
    // clip, but handled rather than silently misreading the box.
    if (offset + 16 > rangeEnd) return null;
    size = Number(buf.readBigUInt64BE(offset + 8));
    headerSize = 16;
  } else if (size === 0) {
    size = rangeEnd - offset; // "extends to end of enclosing range" per the MP4 spec
  }
  if (size < headerSize) return null;
  return { type, payloadStart: offset + headerSize, end: offset + size };
}

function findMp4Box(buf: Buffer, type: string, rangeStart: number, rangeEnd: number): { payloadStart: number; end: number } | null {
  let offset = rangeStart;
  while (offset < rangeEnd) {
    const box = readMp4Box(buf, offset, rangeEnd);
    if (!box) return null;
    if (box.type === type) return box;
    offset = box.end;
  }
  return null;
}

export function getMp4DurationSeconds(buf: Buffer): number | null {
  try {
    const moov = findMp4Box(buf, "moov", 0, buf.length);
    if (!moov) return null;
    const mvhd = findMp4Box(buf, "mvhd", moov.payloadStart, moov.end);
    if (!mvhd) return null;

    const p = mvhd.payloadStart; // 1 byte version + 3 bytes flags precede the fields below
    const version = buf.readUInt8(p);
    if (version === 1) {
      const timescale = buf.readUInt32BE(p + 4 + 16); // past version/flags + 8-byte creation_time + 8-byte modification_time
      const duration = Number(buf.readBigUInt64BE(p + 4 + 16 + 4));
      return timescale > 0 ? duration / timescale : null;
    }
    const timescale = buf.readUInt32BE(p + 4 + 8); // past version/flags + 4-byte creation_time + 4-byte modification_time
    const duration = buf.readUInt32BE(p + 4 + 8 + 4);
    return timescale > 0 ? duration / timescale : null;
  } catch (error) {
    console.error("Failed to parse MP4 duration:", error);
    return null;
  }
}

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
): Promise<{ path: string; sizeBytes: number; durationS: number | null } | { error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." };

  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return { error: `Failed to fetch the generated video (HTTP ${res.status}).` };

    const arrayBuffer = await res.arrayBuffer();
    const path = `${ideaId}/${videoId}.mp4`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, { contentType: "video/mp4", upsert: true });
    if (error) return { error: `Failed to upload to storage: ${error.message}` };

    return { path, sizeBytes: arrayBuffer.byteLength, durationS: getMp4DurationSeconds(Buffer.from(arrayBuffer)) };
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
