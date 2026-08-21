import { getSupabaseAdmin } from "@/lib/supabase";

// AI Website Creation Guide, WB8 — real browser-initiated file uploads
// (plan doc §2). Second Storage bucket in this codebase, same private/
// signed-URL-only convention as content-video-storage.ts (the first).
// HamishAI never builds the site itself, so these files exist purely to
// be downloaded by the agency and handed to their AI coding tool — a
// real logo, real photos — never fed into an AI generation call here.
const BUCKET = "website-project-files";

export type FileKind = "logo" | "photo" | "other";
export const FILE_KINDS: FileKind[] = ["logo", "photo", "other"];

// Kept intentionally small and image-only for v1 — the real use case is
// a logo and real business photos to replace placeholder imagery, not a
// general document store. 4MB (not a rounder number like 5MB) is
// deliberate headroom under Vercel's serverless function request-body
// ceiling on the Hobby plan this app runs on (confirmed earlier this
// session) — matches next.config.ts's serverActions.bodySizeLimit.
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
export const MAX_FILES_PER_PROJECT = 20;

export type WebsiteProjectFile = {
  id: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  kind: FileKind;
  created_at: string;
};

// Strips to a safe, predictable filename — the real name is kept in the
// file_name column for display, this is only what ends up in the
// storage path, so it never needs to round-trip through a URL or a
// filesystem correctly.
function safeFileSegment(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  return cleaned || "file";
}

// Never throws — every failure path (bad type, too large, storage
// error, DB error) returns {error}, same convention as
// storeGeneratedVideo(). The caller (uploadProjectFile in
// website-builder/actions.ts) has already checked the org's file count
// against MAX_FILES_PER_PROJECT before calling this.
export async function uploadWebsiteProjectFile(
  orgId: string,
  projectId: string,
  file: File,
  kind: FileKind
): Promise<WebsiteProjectFile | { error: string }> {
  if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
    return { error: "Only JPEG, PNG, WebP, or SVG images are accepted." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: `That file is too large — ${(file.size / 1024 / 1024).toFixed(1)}MB, the limit is ${MAX_FILE_BYTES / 1024 / 1024}MB.` };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const path = `${orgId}/${projectId}/${crypto.randomUUID()}-${safeFileSegment(file.name)}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, arrayBuffer, { contentType: file.type, upsert: false });
  if (uploadError) return { error: `Failed to upload: ${uploadError.message}` };

  const { data, error: insertError } = await admin
    .from("website_project_files")
    .insert({
      org_id: orgId,
      website_project_id: projectId,
      storage_path: path,
      file_name: file.name.slice(0, 300),
      content_type: file.type,
      size_bytes: file.size,
      kind,
    })
    .select("id, storage_path, file_name, content_type, size_bytes, kind, created_at")
    .single();

  if (insertError || !data) {
    // Uploaded but couldn't record it — clean up the orphaned object
    // rather than leaving storage and the DB out of sync.
    await admin.storage.from(BUCKET).remove([path]);
    return { error: "Uploaded but failed to save — try again." };
  }

  return data as WebsiteProjectFile;
}

// Server-side only — powers the Download link in the files panel.
// Returns null (not throw) if Supabase isn't configured or the path is
// missing, same degrade-gracefully convention as getSignedVideoUrl().
export async function getSignedFileUrl(storagePath: string, expiresInSeconds = 3600): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) {
    console.error(`Failed to create a signed URL for ${storagePath}:`, error);
    return null;
  }
  return data.signedUrl;
}

export async function deleteWebsiteProjectFile(storagePath: string): Promise<{ error: string } | { ok: true }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin.storage.from(BUCKET).remove([storagePath]);
  if (error) return { error: `Failed to delete: ${error.message}` };
  return { ok: true as const };
}
