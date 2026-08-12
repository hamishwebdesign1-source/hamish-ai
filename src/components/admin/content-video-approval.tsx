"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, XCircle, Pencil, RefreshCw, AlertTriangle, X, Check, Upload, ExternalLink } from "lucide-react";
import {
  approveContentVideo,
  rejectContentVideo,
  regenerateContentVideo,
  editContentVideoCopy,
  publishVideoToYouTube,
  type PublishYouTubeState,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/time-ago";
import type { QualityFlags } from "@/lib/content-quality-check";
import type { YouTubePrivacyStatus } from "@/lib/youtube";

export type PlatformCopy = { title: string; caption: string; hashtags: string[] };

// Content Factory MVP Phase D (docs/content-factory-plan.md) — the
// review screen the whole pipeline exists to produce: "review a whole
// video in under 30 seconds." Shown once a video succeeds and is still
// awaiting a decision. Approve/Reject are plain server-action forms (no
// client state needed, same shape as the status buttons on
// leads/[id]/page.tsx); Regenerate needs a pending indicator since it
// makes a real ViewMax call with real latency, so it's wrapped in
// useTransition.
export function ContentVideoApproval({
  videoId,
  ideaId,
  videoUrl,
  qualityFlags,
  platformCopy,
  platformCopyGeneratedAt,
}: {
  videoId: string;
  ideaId: string;
  videoUrl: string | null;
  qualityFlags: QualityFlags | null;
  platformCopy: PlatformCopy | null;
  platformCopyGeneratedAt: string | null;
}) {
  const [editingCopy, setEditingCopy] = useState(false);
  const [isRegenerating, startRegenerate] = useTransition();

  function handleRegenerate() {
    startRegenerate(async () => {
      await regenerateContentVideo(videoId, ideaId);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-[color-mix(in_oklch,var(--gradient-violet),transparent_75%)] bg-[color-mix(in_oklch,var(--gradient-violet),transparent_94%)] p-4">
      {videoUrl ? (
        <video src={videoUrl} controls playsInline className="mx-auto max-h-96 w-auto rounded-lg border border-border bg-black" />
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <AlertTriangle className="size-4" />
          Video preview isn&apos;t available (couldn&apos;t create a signed URL — check Supabase Storage).
        </p>
      )}

      {qualityFlags && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {qualityFlags.size_flag && (
            <Badge variant={qualityFlags.size_flag === "ok" ? "success" : "warning"}>
              {qualityFlags.size_flag === "ok" ? "File size OK" : "File suspiciously small"}
            </Badge>
          )}
          {qualityFlags.duration_flag && (
            <Badge variant={qualityFlags.duration_flag === "ok" ? "success" : "warning"}>
              {qualityFlags.duration_flag === "ok" ? "Duration matches" : "Duration mismatch"}
            </Badge>
          )}
        </div>
      )}
      {qualityFlags?.notes && qualityFlags.notes.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {qualityFlags.notes.map((n, i) => (
            <li key={i}>⚠️ {n}</li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-border bg-card p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-foreground">
            Title, caption &amp; hashtags
            {platformCopyGeneratedAt && <span className="ml-1.5 font-normal text-muted-foreground">· {timeAgo(platformCopyGeneratedAt)}</span>}
          </p>
          <Button type="button" variant="ghost" size="xs" onClick={() => setEditingCopy((v) => !v)} className="gap-1 text-muted-foreground">
            <Pencil className="size-3" />
            {editingCopy ? "Cancel" : "Edit"}
          </Button>
        </div>

        {editingCopy ? (
          <form
            action={async (formData) => {
              await editContentVideoCopy(videoId, ideaId, formData);
              setEditingCopy(false);
            }}
            className="mt-2 space-y-2"
          >
            <Input name="title" defaultValue={platformCopy?.title ?? ""} placeholder="Title" className="h-8 text-xs" />
            <Textarea name="caption" defaultValue={platformCopy?.caption ?? ""} placeholder="Caption" rows={2} className="text-xs" />
            <Input name="hashtags" defaultValue={(platformCopy?.hashtags ?? []).join(", ")} placeholder="hashtags, comma, separated" className="h-8 text-xs" />
            <Button type="submit" size="xs" className="gap-1">
              <Check className="size-3" />
              Save
            </Button>
          </form>
        ) : platformCopy ? (
          <div className="mt-2 space-y-1.5">
            <p className="font-medium text-foreground">{platformCopy.title}</p>
            <p className="text-muted-foreground">{platformCopy.caption}</p>
            <p className="flex flex-wrap gap-1">
              {platformCopy.hashtags.map((h, i) => (
                <span key={i} className="text-accent">
                  #{h}
                </span>
              ))}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-muted-foreground">Not generated yet.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <form action={approveContentVideo.bind(null, videoId, ideaId)}>
          <Button type="submit" size="sm" className="gap-1">
            <CheckCircle2 className="size-3.5" />
            Approve &amp; Schedule
          </Button>
        </form>
        <Button type="button" variant="outline" size="sm" onClick={handleRegenerate} disabled={isRegenerating} className="gap-1">
          <RefreshCw className={`size-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
          {isRegenerating ? "Regenerating…" : "Regenerate"}
        </Button>
        <form action={rejectContentVideo.bind(null, videoId, ideaId)} className="flex items-center gap-1.5">
          <Textarea name="reason" placeholder="Reason (optional)…" rows={1} className="h-8 max-w-64 py-1.5 text-xs" />
          <Button type="submit" variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-destructive">
            <XCircle className="size-3.5" />
            Reject
          </Button>
        </form>
      </div>
      <p className="text-xs text-muted-foreground">
        &ldquo;Approve &amp; Schedule&rdquo; marks this ready — publish to YouTube from the approved state below. TikTok publishing isn&apos;t built yet.
      </p>
    </div>
  );
}

export type PlatformPost = {
  id: string;
  status: "pending" | "uploading" | "published" | "failed";
  privacy_status: YouTubePrivacyStatus;
  external_url: string | null;
  error: string | null;
  published_at: string | null;
};

const PRIVACY_OPTIONS: { value: YouTubePrivacyStatus; label: string }[] = [
  { value: "private", label: "Private (only you)" },
  { value: "unlisted", label: "Unlisted (link only)" },
  { value: "public", label: "Public" },
];

// The actual "one click does the whole job" upload — fetches the video
// out of storage, uploads with the AI-drafted title/caption/hashtags,
// server-side, in one server action. Shown once a video is approved
// (see ContentVideoDecided below), separate from the approve/reject
// decision itself so publishing stays an explicit second step even
// after approval, not bundled into the same click.
function YouTubePublishPanel({ videoId, ideaId, latestPost }: { videoId: string; ideaId: string; latestPost: PlatformPost | null }) {
  const [privacyStatus, setPrivacyStatus] = useState<YouTubePrivacyStatus>(latestPost?.privacy_status ?? "private");
  const boundAction = publishVideoToYouTube.bind(null, videoId, ideaId, privacyStatus);
  const [state, formAction, isPending] = useActionState<PublishYouTubeState, FormData>(boundAction, {});

  const publishedUrl = state.url ?? (latestPost?.status === "published" ? latestPost.external_url : null);

  if (publishedUrl) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-xs">
        <Upload className="size-4 shrink-0 text-success" />
        <span className="text-foreground">Published to YouTube.</span>
        <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-accent hover:underline">
          Watch <ExternalLink className="size-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border bg-card p-3 text-xs">
      <p className="flex items-center gap-1.5 font-medium text-foreground">
        <Upload className="size-3.5" />
        Publish to YouTube
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={privacyStatus}
          onChange={(e) => setPrivacyStatus(e.target.value as YouTubePrivacyStatus)}
          disabled={isPending}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
        >
          {PRIVACY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <form action={formAction}>
          <Button type="submit" size="xs" disabled={isPending} className="gap-1">
            <Upload className="size-3" />
            {isPending ? "Uploading…" : "Upload to YouTube"}
          </Button>
        </form>
      </div>
      {(state.error || latestPost?.status === "failed") && (
        <p className="text-destructive">{state.error || latestPost?.error || "The last upload attempt failed — try again."}</p>
      )}
    </div>
  );
}

// Terminal states — approved/rejected — shown instead of the interactive
// panel once a decision's been made, so re-visiting an already-decided
// video doesn't invite a second decision. Once approved, the YouTube
// publish panel appears here — a deliberate second step, not bundled
// into the approve click itself.
export function ContentVideoDecided({
  status,
  reason,
  decidedAt,
  videoId,
  ideaId,
  latestPost,
}: {
  status: "approved" | "rejected";
  reason?: string | null;
  decidedAt?: string | null;
  videoId: string;
  ideaId: string;
  latestPost?: PlatformPost | null;
}) {
  return (
    <div>
      <div className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${status === "approved" ? "border-success/30 bg-success/5" : "border-border bg-muted/30"}`}>
        {status === "approved" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
        <div>
          <p className="font-medium text-foreground">{status === "approved" ? "Approved" : "Rejected"}</p>
          {reason && <p className="mt-0.5 text-muted-foreground">{reason}</p>}
          {decidedAt && <p className="mt-0.5 text-muted-foreground">{timeAgo(decidedAt)}</p>}
        </div>
      </div>
      {status === "approved" && <YouTubePublishPanel videoId={videoId} ideaId={ideaId} latestPost={latestPost ?? null} />}
    </div>
  );
}
