// Content Factory MVP Phase C (docs/content-factory-plan.md) — thin
// client for ViewMax's v1 REST API (https://viewmax.studio/docs/api),
// modeled on google-auth.ts + check-google-connection.ts's shape: every
// exported function returns `null`/`{error}` rather than throwing when
// VIEWMAX_API_KEY is unset, so nothing else in the pipeline needs to
// special-case "not configured" — it just gets a clean failure result.
//
// Confirmed from ViewMax's public docs: base URL, auth header, the
// {code, message, data} envelope, the five error codes below, and that
// GET /api/v1/models is the one endpoint that doesn't require auth.
// NOT independently confirmed (no ViewMax account exists yet to test
// against — see the plan doc): the exact field names on a real task
// response. Their own marketing example shows `{task_id, status,
// video_urls}`; their docs page separately says `data.taskUrls`. Both are
// checked defensively below rather than assumed — verify against a real
// response the first time a video actually generates, and simplify once
// confirmed.

const VIEWMAX_BASE_URL = "https://viewmax.studio";

function getViewMaxApiKey(): string | null {
  return process.env.VIEWMAX_API_KEY || null;
}

type ViewMaxEnvelope<T> = { code: number; message: string; data: T };
type ViewMaxResult<T> = { data: T } | { error: string; code?: number };

function describeViewMaxError(status: number, code: number, message: string): string {
  if (code === -1001) return "ViewMax API key missing or invalid.";
  if (code === -1002) return "Insufficient ViewMax credits.";
  if (status === 404) return "ViewMax task not found.";
  if (status === 400) return `ViewMax rejected the request: ${message}`;
  return `ViewMax error (${status}): ${message}`;
}

async function viewmaxRequest<T>(path: string, init: RequestInit = {}, requireAuth = true): Promise<ViewMaxResult<T>> {
  const apiKey = getViewMaxApiKey();
  if (requireAuth && !apiKey) return { error: "ViewMax is not configured — no VIEWMAX_API_KEY set." };

  try {
    const res = await fetch(`${VIEWMAX_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15000),
    });

    const envelope = (await res.json()) as ViewMaxEnvelope<T>;
    if (envelope.code !== 0) {
      return { error: describeViewMaxError(res.status, envelope.code, envelope.message), code: envelope.code };
    }
    return { data: envelope.data };
  } catch (error) {
    console.error(`ViewMax request failed (${path}):`, error);
    return { error: error instanceof Error ? error.message : "ViewMax request failed." };
  }
}

export type ViewMaxModel = { id: string; name?: string; [key: string]: unknown };

// Always called live at submission time — never hardcode a model ID, per
// the explicit requirement (models go obsolete, new ones ship, and this
// is the one endpoint ViewMax doesn't require auth for).
export async function listViewMaxModels(type: "video" | "image" | "music" = "video"): Promise<ViewMaxModel[] | null> {
  const result = await viewmaxRequest<{ models?: ViewMaxModel[] } | ViewMaxModel[]>(`/api/v1/models?type=${type}`, { method: "GET" }, false);
  if ("error" in result) {
    console.error("Failed to list ViewMax models:", result.error);
    return null;
  }
  const data = result.data;
  return Array.isArray(data) ? data : (data.models ?? []);
}

export async function getViewMaxCredits(): Promise<number | null> {
  const result = await viewmaxRequest<{ credits: number }>("/api/v1/credits", { method: "GET" });
  if ("error" in result) return null;
  return result.data.credits;
}

// The cheapest possible real call — distinguishes "key is set" from "key
// actually works" (revoked, expired, wrong project), same reasoning as
// checkGoogleConnection(): an env var can be present but non-functional,
// and that only ever surfaces on a real API call.
export async function checkViewMaxConnection(): Promise<{ connected: true; credits: number } | { connected: false; reason: string }> {
  if (!getViewMaxApiKey()) return { connected: false, reason: "Not configured — no VIEWMAX_API_KEY set." };
  const credits = await getViewMaxCredits();
  if (credits == null) return { connected: false, reason: "Key set but the credits check failed — see server logs." };
  return { connected: true, credits };
}

export type SubmitVideoPayload = {
  model: string;
  prompt: string;
  duration?: string;
  resolution?: string;
  aspect_ratio?: string;
};

type RawViewMaxTask = {
  task_id?: string;
  taskId?: string;
  id?: string;
  status?: string;
  taskUrls?: string[];
  video_urls?: string[];
  urls?: string[];
  [key: string]: unknown;
};

export async function submitVideoGeneration(payload: SubmitVideoPayload): Promise<{ taskId: string } | { error: string }> {
  const result = await viewmaxRequest<RawViewMaxTask>("/api/v1/videos", { method: "POST", body: JSON.stringify(payload) });
  if ("error" in result) return { error: result.error };
  const taskId = result.data.task_id ?? result.data.taskId ?? result.data.id;
  if (!taskId) return { error: "ViewMax accepted the job but returned no task ID." };
  return { taskId };
}

export type ViewMaxTaskStatus = "pending" | "processing" | "success" | "failed" | "canceled";

export type ViewMaxTaskResult = { status: ViewMaxTaskStatus; resultUrls: string[]; raw: RawViewMaxTask };

export async function getViewMaxTaskStatus(taskId: string): Promise<ViewMaxTaskResult | { error: string }> {
  const result = await viewmaxRequest<RawViewMaxTask>(`/api/v1/tasks/${taskId}`, { method: "GET" });
  if ("error" in result) return { error: result.error };
  const raw = result.data;
  return {
    status: (raw.status as ViewMaxTaskStatus) ?? "pending",
    resultUrls: raw.taskUrls ?? raw.video_urls ?? raw.urls ?? [],
    raw,
  };
}
