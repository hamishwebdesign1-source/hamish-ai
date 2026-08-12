// Content Factory MVP Phase C (docs/content-factory-plan.md) — thin
// client for ViewMax's v1 REST API (https://viewmax.studio/docs/api),
// modeled on google-auth.ts + check-google-connection.ts's shape: every
// exported function returns `null`/`{error}` rather than throwing when
// VIEWMAX_API_KEY is unset, so nothing else in the pipeline needs to
// special-case "not configured" — it just gets a clean failure result.
//
// Confirmed against a real account, a real API key, and a real paid
// submission (2026-08-12): base URL, auth header, the {code, message,
// data} envelope, GET /api/v1/models needing no auth, the full model
// catalog shape (each model's per-mode durations/resolutions/
// aspect_ratios/cost table — see pickCheapestVideoOption below), GET
// /api/v1/credits's real field name (`remainingCredits`), and — the one
// that actually mattered — the real POST /api/v1/videos response shape,
// including a genuine bug this surfaced: see RawViewMaxTask's comment
// for why `id`, not `taskId`, is the field that must be used to poll
// GET /api/v1/tasks/{id} afterward.

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

// Confirmed against the real endpoint — each model exposes per-mode
// (text-to-video, image-to-video, ...) arrays of the *exact* duration/
// resolution/aspect_ratio strings it accepts, plus a cost table keyed by
// those same strings (either a flat {resolution:{duration:credits}}
// grid, or a credits_per_second rate per resolution). There is no
// free-form duration/resolution — a value outside these arrays gets
// rejected, so submission must pick from what a model actually lists,
// never pass through an arbitrary AI-generated value.
export type ViewMaxModelMode = {
  durations: string[];
  resolutions: string[];
  aspect_ratios: string[];
  credits?: Record<string, Record<string, number>>; // credits[resolution][duration]
  credits_per_second?: Record<string, number>; // rate[resolution], multiply by parseInt(duration)
};

export type ViewMaxModel = {
  id: string;
  label?: string;
  vendor?: string;
  coming_soon?: boolean;
  modes?: Record<string, ViewMaxModelMode>;
  [key: string]: unknown;
};

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

function modeCost(mode: ViewMaxModelMode, resolution: string, duration: string): number | null {
  if (mode.credits) return mode.credits[resolution]?.[duration] ?? null;
  if (mode.credits_per_second) {
    const rate = mode.credits_per_second[resolution];
    if (rate == null) return null;
    const seconds = Number.parseInt(duration, 10);
    return Number.isFinite(seconds) ? Math.round(rate * seconds) : null;
  }
  return null;
}

// The smallest available duration at-or-above the target, or null if
// every duration this model offers falls short — a real bug caught
// during live testing: an earlier version of this function fell back to
// a model's longest duration even when that duration was *shorter* than
// the target, and because short-duration models tend to be the cheapest
// ones in the catalog, "pick the cheapest option" ended up silently
// selecting a video half the requested length. Returning null here lets
// pickCheapestVideoOption exclude a too-short model from the primary
// pass instead of letting it win purely on price.
function nearestDurationAtOrAbove(available: string[], targetSeconds: number): string | null {
  const parsed = available.map((d) => ({ raw: d, s: Number.parseInt(d, 10) })).filter((d) => Number.isFinite(d.s));
  const atOrAbove = parsed.filter((d) => d.s >= targetSeconds).sort((a, b) => a.s - b.s);
  return atOrAbove[0]?.raw ?? null;
}

function longestDuration(available: string[]): string | null {
  const parsed = available.map((d) => ({ raw: d, s: Number.parseInt(d, 10) })).filter((d) => Number.isFinite(d.s));
  return parsed.sort((a, b) => b.s - a.s)[0]?.raw ?? available[0] ?? null;
}

export type VideoOption = { model: string; duration: string; resolution: string; aspectRatio: string; credits: number };

function cheapestAcross(
  models: ViewMaxModel[],
  aspectRatio: string,
  chooseDuration: (durations: string[]) => string | null
): VideoOption | null {
  let best: VideoOption | null = null;
  for (const model of models) {
    if (model.coming_soon) continue;
    const mode = model.modes?.["text-to-video"];
    if (!mode || !mode.durations?.length || !mode.resolutions?.length || !mode.aspect_ratios?.length) continue;
    if (!mode.aspect_ratios.includes(aspectRatio)) continue;

    const duration = chooseDuration(mode.durations);
    if (!duration) continue;

    for (const resolution of mode.resolutions) {
      const credits = modeCost(mode, resolution, duration);
      if (credits == null) continue;
      if (!best || credits < best.credits) best = { model: model.id, duration, resolution, aspectRatio, credits };
    }
  }
  return best;
}

// Picks the cheapest (model, duration, resolution) combination that
// supports the requested aspect ratio and, in a first pass, only
// considers models that can meet or exceed the target duration — so cost
// is never optimised at the expense of silently truncating the video.
// Only if literally no model can reach the target duration does it fall
// back to each model's own longest option and pick the cheapest of those
// (a real content-length compromise, logged via the caller, not hidden).
// Rather than blindly using models[0] (the original, wrong approach: the
// first model in the list is not necessarily compatible or affordable).
// Returns null if nothing qualifies at all (e.g. a brand-new aspect
// ratio no model supports yet).
export function pickCheapestVideoOption(models: ViewMaxModel[], targetDurationS: number, aspectRatio: string): VideoOption | null {
  const meetsTarget = cheapestAcross(models, aspectRatio, (durations) => nearestDurationAtOrAbove(durations, targetDurationS));
  if (meetsTarget) return meetsTarget;
  return cheapestAcross(models, aspectRatio, longestDuration);
}

// Confirmed against a real key: the field is `remainingCredits`, not
// `credits` — the earlier guess was wrong (see the module header's note
// on unconfirmed field names). Checked defensively against both anyway,
// same tolerance-for-drift approach as the task-status URL fields below.
export async function getViewMaxCredits(): Promise<number | null> {
  const result = await viewmaxRequest<{ remainingCredits?: number; credits?: number }>("/api/v1/credits", { method: "GET" });
  if ("error" in result) return null;
  return result.data.remainingCredits ?? result.data.credits ?? null;
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

// Confirmed against a real submission (2026-08-12) — the response has
// TWO different ID-shaped fields, and they are NOT interchangeable:
// `id` (a UUID) is the record ViewMax's own API expects for
// GET /api/v1/tasks/{id}; `taskId` is a separate, internal reference to
// whatever upstream provider (Kie, per the raw response's callback URL)
// actually renders the video — passing `taskId` to /tasks/{id} returns
// "task not found" even seconds after a real, successfully-charged
// submission. A real bug here, not a defensive guess: the original
// version of this function preferred `task_id`/`taskId` over `id`,
// which meant every submission's task became permanently unpollable —
// found by submitting a real job, watching it "process" forever, and
// re-querying with every ID-shaped field in the raw response until one
// actually worked. `id` is now the only field trusted for polling.
type RawViewMaxTask = {
  id?: string; // the one that actually works for GET /api/v1/tasks/{id}
  taskId?: string; // present but NOT the polling ID — an internal upstream reference, kept here for logging only
  status?: string;
  taskUrls?: string[];
  video_urls?: string[];
  urls?: string[];
  [key: string]: unknown;
};

export async function submitVideoGeneration(payload: SubmitVideoPayload): Promise<{ taskId: string } | { error: string }> {
  const result = await viewmaxRequest<RawViewMaxTask>("/api/v1/videos", { method: "POST", body: JSON.stringify(payload) });
  if ("error" in result) return { error: result.error };
  const taskId = result.data.id;
  if (!taskId) return { error: "ViewMax accepted the job but returned no usable task ID." };
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
