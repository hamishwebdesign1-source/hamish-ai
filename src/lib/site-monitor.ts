import { connect as tlsConnect } from "node:tls";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// On-demand website health check — the "AI should generate reports
// automatically" piece of the monitoring module from the HamishAI Operating
// System roadmap, scoped to uptime/SSL/broken-links and run on demand
// rather than the full always-on monitoring suite (deferred: performance,
// SEO, accessibility, analytics anomalies, security scanning, scheduling).

function getSslInfo(hostname: string): Promise<{ ok: boolean; validUntil: string | null }> {
  return new Promise((resolve) => {
    const socket = tlsConnect({ host: hostname, port: 443, servername: hostname, timeout: 5000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (cert && cert.valid_to) {
        resolve({ ok: new Date(cert.valid_to) > new Date(), validUntil: new Date(cert.valid_to).toISOString() });
      } else {
        resolve({ ok: false, validUntil: null });
      }
    });
    socket.on("error", () => resolve({ ok: false, validUntil: null }));
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, validUntil: null });
    });
  });
}

function extractLinks(html: string, origin: string): string[] {
  const matches = Array.from(html.matchAll(/<a\s+[^>]*href=["']([^"'#]+)["']/gi)).map((m) => m[1]);
  const urls = new Set<string>();
  for (const href of matches) {
    try {
      const resolved = new URL(href, origin);
      if (resolved.origin === origin) urls.add(resolved.toString());
    } catch {
      // ignore malformed hrefs
    }
  }
  return Array.from(urls).slice(0, 15);
}

export async function runSiteCheck(clientId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, business_name, website_url")
    .eq("id", clientId)
    .single();

  if (clientError || !client) return { error: "Client not found." as const };
  if (!client.website_url) return { error: "This client has no website URL set." as const };

  let urlObj: URL;
  try {
    urlObj = new URL(client.website_url);
  } catch {
    return { error: "The client's website URL is invalid." as const };
  }

  const start = Date.now();
  let uptimeOk = false;
  let responseMs: number | null = null;
  let html = "";

  try {
    const res = await fetch(urlObj.toString(), { signal: AbortSignal.timeout(8000) });
    responseMs = Date.now() - start;
    uptimeOk = res.ok;
    html = await res.text();
  } catch (error) {
    console.error("Site check fetch failed:", error);
  }

  const ssl =
    urlObj.protocol === "https:" ? await getSslInfo(urlObj.hostname) : { ok: null as boolean | null, validUntil: null };

  const links = html ? extractLinks(html, urlObj.origin) : [];
  const brokenLinks: { url: string; status: number | null }[] = [];
  for (const link of links) {
    try {
      const res = await fetch(link, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (!res.ok) brokenLinks.push({ url: link, status: res.status });
    } catch {
      brokenLinks.push({ url: link, status: null });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let aiSummary = "";
  if (apiKey) {
    try {
      const anthropic = new Anthropic({ apiKey });
      const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
      const response = await anthropic.messages.create({
        model,
        max_tokens: 300,
        system:
          "You are Hamish AI's site monitoring assistant. Write a single short plain-English paragraph summarising a website health check for Hamish. No markdown, no headings, be direct about anything that needs attention and reassuring about anything that's fine.",
        messages: [
          {
            role: "user",
            content: `Site: ${client.website_url}\nUptime: ${uptimeOk ? "reachable" : "unreachable"} (${responseMs ?? "n/a"}ms)\nSSL: ${ssl.ok === null ? "not applicable (not https)" : ssl.ok ? `valid until ${ssl.validUntil}` : "invalid or could not verify"}\nLinks checked: ${links.length}, broken: ${brokenLinks.length}${brokenLinks.length ? " (" + brokenLinks.map((b) => b.url).join(", ") + ")" : ""}`,
          },
        ],
      });
      aiSummary = stripMarkdownEmphasis(
        response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n")
      );
    } catch (error) {
      console.error("Site check AI summary failed:", error);
    }
  }

  const { data: saved, error: insertError } = await supabase
    .from("site_checks")
    .insert({
      client_id: clientId,
      uptime_ok: uptimeOk,
      response_ms: responseMs,
      ssl_ok: ssl.ok,
      ssl_valid_until: ssl.validUntil,
      broken_links: brokenLinks,
      ai_summary: aiSummary,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to save site check:", insertError);
    return { error: "Check ran but failed to save." as const };
  }

  return { check: saved };
}
