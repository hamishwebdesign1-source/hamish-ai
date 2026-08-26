import { NextResponse } from "next/server";
import { isRateLimited, getClientKey } from "@/lib/chat-rate-limit";
import { runWebsiteAudit } from "@/lib/website-audit";
import { saveLead } from "@/lib/save-lead";

const MAX_FIELD_LENGTH = 200;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same route-handler shape as /api/contact and /api/chat (getClientKey()
// needs a real Request, which Server Actions don't receive) — but a
// tighter rate limit than either: this is the first *unauthenticated*
// surface in the app that spends a real Anthropic call per request (every
// other AI-cost path is gated behind a signed-in session and its own
// org-scoped monthly quota). 5 per 10 minutes per IP is generous for a
// genuine visitor (who'd realistically run this once or twice) and bounded
// against a script hammering it for free Claude calls.
function sanitize(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_FIELD_LENGTH) : "";
}

export async function POST(request: Request) {
  if (await isRateLimited(getClientKey(request), { windowSeconds: 600, maxRequests: 5 })) {
    return NextResponse.json({ error: "Too many requests — please try again in a few minutes." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const name = sanitize(body?.name);
  const businessName = sanitize(body?.businessName);
  const email = sanitize(body?.email);
  const website = sanitize(body?.website);

  if (!name || !email || !website || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "A valid name, email, and website are required." }, { status: 400 });
  }

  const result = await runWebsiteAudit(website, businessName || null);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Best-effort, after the audit itself succeeds — a lead-capture hiccup
  // shouldn't cost the visitor their report. Same saveLead() the site's
  // other public forms already use, so this shows up wherever leads
  // already show up, no new admin UI needed.
  try {
    await saveLead(
      { name, business_name: businessName || undefined, email, help_with: `Requested a free website health check for ${website}` },
      "website-audit"
    );
  } catch (error) {
    console.error("Failed to save website-audit lead:", error);
  }

  return NextResponse.json({ result });
}
