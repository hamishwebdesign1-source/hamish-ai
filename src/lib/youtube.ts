import { Readable } from "stream";
import { google } from "googleapis";
import { getGoogleAuthClient } from "@/lib/google-auth";

// Content Factory — YouTube Shorts publishing. Reuses the same shared
// Google OAuth2 client every other Google integration in this codebase
// uses (google-auth.ts) — one refresh token, one connect flow
// (/admin/google-setup), now covering Gmail + Calendar + YouTube upload
// together rather than a separate connector. Requires the
// youtube.upload scope to have been granted — see google-setup/page.tsx's
// SCOPES array; an account connected before that scope was added needs
// to reconnect once (same "revoked/expired only surfaces on a real
// call" pattern as check-google-connection.ts).

// Content channel topics (AI tools, science, history, psychology) skew
// informational — Education reads truer than a generic Entertainment
// default, though this is a minor field either way and easy to change.
const DEFAULT_CATEGORY_ID = "27";

export type YouTubePrivacyStatus = "private" | "unlisted" | "public";

export async function checkYouTubeConnection(): Promise<{ connected: true; channelTitle: string } | { connected: false; reason: string }> {
  const auth = getGoogleAuthClient();
  if (!auth) return { connected: false, reason: "Google isn't connected — see /admin/google-setup." };

  try {
    const youtube = google.youtube({ version: "v3", auth });
    const res = await youtube.channels.list({ part: ["snippet"], mine: true });
    const channel = res.data.items?.[0];
    if (!channel) return { connected: false, reason: "Connected to Google, but no YouTube channel exists on this account yet." };
    return { connected: true, channelTitle: channel.snippet?.title ?? "Unknown channel" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    // The most common real failure here isn't "not connected" — it's
    // "connected, but without the youtube.upload scope" (a pre-existing
    // Gmail/Calendar connection made before this scope was added). Both
    // surface as an API error only on a real call, same reasoning as
    // check-google-connection.ts.
    return { connected: false, reason: `${message} — if Google is already connected for Gmail/Calendar, reconnect at /admin/google-setup to grant the YouTube scope.` };
  }
}

export type UploadVideoParams = {
  videoBytes: ArrayBuffer;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: YouTubePrivacyStatus;
};

export async function uploadVideoToYouTube(params: UploadVideoParams): Promise<{ videoId: string; url: string } | { error: string }> {
  const auth = getGoogleAuthClient();
  if (!auth) return { error: "Google isn't connected — see /admin/google-setup." };

  try {
    const youtube = google.youtube({ version: "v3", auth });
    // YouTube's title limit is 100 characters — truncated defensively
    // rather than letting the API reject the whole upload over it.
    const title = params.title.length > 100 ? `${params.title.slice(0, 97)}...` : params.title;

    const res = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title,
          description: params.description,
          tags: params.tags,
          categoryId: DEFAULT_CATEGORY_ID,
        },
        status: {
          privacyStatus: params.privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: Readable.from(Buffer.from(params.videoBytes)),
      },
    });

    const videoId = res.data.id;
    if (!videoId) return { error: "YouTube accepted the upload but returned no video ID." };

    return { videoId, url: `https://youtube.com/shorts/${videoId}` };
  } catch (error) {
    console.error("YouTube upload failed:", error);
    return { error: error instanceof Error ? error.message : "YouTube upload failed." };
  }
}
