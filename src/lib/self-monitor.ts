import { getSslInfo } from "@/lib/site-monitor";

// Uptime/SSL check for hamishai.org itself — the client-facing site-checks
// cron (src/lib/site-monitor.ts) only ever monitored *client* websites;
// nobody was watching the agency's own domain, which is exactly how a full
// DNS misconfiguration went unnoticed until a real visitor hit it. This is
// deliberately a plain fetch from inside a Vercel serverless function
// against the public URL — not anything that shares infrastructure with
// the site being checked, so a DNS/hosting failure here is a genuine
// external signal, not a check of the check itself.
const SELF_URL = "https://www.hamishai.org/";

export type SelfCheckResult = {
  uptimeOk: boolean;
  responseMs: number | null;
  status: number | null;
  sslOk: boolean | null;
  sslValidUntil: string | null;
};

export async function checkOwnSite(): Promise<SelfCheckResult> {
  const start = Date.now();
  let uptimeOk = false;
  let responseMs: number | null = null;
  let status: number | null = null;

  try {
    const res = await fetch(SELF_URL, { signal: AbortSignal.timeout(8000), redirect: "follow" });
    responseMs = Date.now() - start;
    status = res.status;
    uptimeOk = res.ok;
  } catch (error) {
    console.error("Self site-check fetch failed:", error);
  }

  const ssl = await getSslInfo(new URL(SELF_URL).hostname);

  return { uptimeOk, responseMs, status, sslOk: ssl.ok, sslValidUntil: ssl.validUntil };
}
