import type { MetadataRoute } from "next";

// SEO audit (2026-09-02) — verified live and in source: hamishai.org had
// no robots.txt at all (/robots.txt 404'd on the real domain). Next.js's
// native MetadataRoute.Robots convention generates a real one at build
// time — no static file to keep in sync by hand.
//
// /demo and /concepts are deliberately NOT disallowed here, even though
// they're noindexed (demo/layout.tsx, concepts/layout.tsx) — disallowing
// crawl access would stop Google ever seeing the noindex meta tag in the
// first place, which is the wrong way to keep a page out of search
// (and can leave an already-indexed URL stuck showing with no snippet,
// since Google can't recrawl it to confirm removal). noindex is the
// correct tool for "don't show this in results"; robots.txt disallow is
// for "don't spend crawl budget here at all" — this file's own
// disallow list below is scoped to genuinely non-content paths instead
// (the authed apps, internal APIs, one-off redirect/token routes).
//
// AI crawlers explicitly allowed, not just left to the wildcard: this
// site's own stated goal (Phase 8 of the SEO audit that added this file)
// is being discoverable by ChatGPT Search, Perplexity, Gemini, and
// Claude — blocking or ignoring their crawlers would work directly
// against that. GPTBot/OAI-SearchBot (OpenAI), ClaudeBot/Claude-Web
// (Anthropic), PerplexityBot (Perplexity), Google-Extended (Gemini's
// training/grounding crawler, separate from Googlebot itself, which
// already gets the default `*` allow) — all real, documented user-agent
// tokens these providers publish, not guessed names.
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/studio",
    "/studio/",
    "/studio-action/",
    "/admin",
    "/admin/",
    "/portal",
    "/portal/",
    "/api/",
    "/go/",
    "/proposal/",
  ];
  // /embed-demo deliberately NOT here (2 Sep 2026) — it's real, rendered
  // content, not an API/redirect route, so it now uses noindex on the
  // page itself (embed-demo/page.tsx) instead, same reasoning as
  // /demo and /concepts above: disallow would stop Google ever seeing
  // that noindex tag in the first place.

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: "GPTBot", allow: "/", disallow },
      { userAgent: "OAI-SearchBot", allow: "/", disallow },
      { userAgent: "ClaudeBot", allow: "/", disallow },
      { userAgent: "Claude-Web", allow: "/", disallow },
      { userAgent: "anthropic-ai", allow: "/", disallow },
      { userAgent: "PerplexityBot", allow: "/", disallow },
      { userAgent: "Google-Extended", allow: "/", disallow },
    ],
    // www, not the apex — same fix as layout.tsx/sitemap.ts (2 Sep 2026):
    // the apex 308-redirects to www at the hosting layer, so both of
    // these were pointing at a URL that redirects rather than the real
    // sitemap/host.
    sitemap: "https://www.hamishai.org/sitemap.xml",
    host: "https://www.hamishai.org",
  };
}
