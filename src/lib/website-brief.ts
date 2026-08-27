import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// AI Website Creation Guide, WB1 — HamishAI does not build or host
// websites. This turns a discovery wizard's answers into a professional
// Website Build Brief: the project's source of truth, and the context
// the WB2 Build Prompt generator works from. Same pattern as
// draft-sales-kit.ts — one tool-forced Anthropic call, structured
// multi-part output, cached on the project row, never auto-regenerated.

export const WEBSITE_OBJECTIVES = [
  "Generate leads",
  "Sell products",
  "Take bookings",
  "Build credibility",
  "Provide information",
  "Generate enquiries",
] as const;

export const SITEMAP_PAGE_OPTIONS = ["Home", "About", "Services", "Products", "Contact", "FAQs", "Blog", "Case studies"] as const;

// The wizard's answers — text/select only for v1 (no file upload
// infrastructure exists in this app yet, see the architecture plan's own
// note on this). `existingWebsiteUrl` and `designExamples` let a user
// point at real reference sites by URL instead of uploading anything.
export type WebsiteDiscovery = {
  businessName: string;
  industry: string;
  location: string;
  targetAudience: string;
  servicesProducts: string;
  usps: string;
  objectives: string[];
  sitemapPages: string[];
  designStyle: string;
  designColours: string;
  designFonts: string;
  designExamples: string;
  existingWebsiteUrl: string;
  contentNotes: string;
};

export type WebsiteBrief = {
  businessOverview: string;
  targetAudience: string;
  objectives: string[];
  sitemap: { page: string; purpose: string }[];
  contentRequirements: string[];
  brandGuidelines: string;
  designDirection: string;
  ctaStrategy: string;
  seoRequirements: string[];
  analyticsRequirements: string[];
  technicalRequirements: string[];
  acceptanceCriteria: string[];
};

function buildSystemPrompt(d: WebsiteDiscovery): string {
  return `You are a senior web strategist writing a professional Website Build Brief for an agency's own client. This brief will be given to an AI coding agent (Claude Code, Codex, or Cursor) as the source of truth for building the website — be concrete and specific, never generic filler. Ground every section in the real answers below; never invent facts about the business beyond what's given.

Business: ${d.businessName} (${d.industry || "industry not specified"}, ${d.location || "location not specified"})
Target audience: ${d.targetAudience || "not specified"}
Services/products: ${d.servicesProducts || "not specified"}
Unique selling points: ${d.usps || "not specified"}
Website objectives: ${d.objectives.join(", ") || "not specified"}
Requested pages: ${d.sitemapPages.join(", ") || "not specified"}
Design style preference: ${d.designStyle || "not specified"}
Colour preference: ${d.designColours || "not specified"}
Font preference: ${d.designFonts || "not specified"}
Example/competitor sites mentioned: ${d.designExamples || "none given"}
Existing website: ${d.existingWebsiteUrl || "none"}
Other content notes (brand guidelines, testimonials, documents summarised by the agency): ${d.contentNotes || "none given"}

Write plain English, no markdown formatting inside any field (no asterisks, no heading syntax). Be specific to this business, not a generic template — reference the actual services, audience, and objectives above throughout.

1. businessOverview — 2-3 sentences summarising the business for someone who's never heard of it.
2. targetAudience — who the site needs to speak to and what they care about.
3. objectives — the real objectives listed above, each restated as one concrete sentence about what success looks like.
4. sitemap — one entry per requested page (use the pages listed above; if none were specified, propose a sensible minimal set for this kind of business), each with a one-sentence purpose specific to this business.
5. contentRequirements — 4-8 concrete content items the site actually needs (e.g. specific copy sections, images, proof points) grounded in the business details above.
6. brandGuidelines — a short paragraph capturing colour/font/style preferences as given, honest about what's genuinely specified vs. left to the builder's judgement.
7. designDirection — 2-3 sentences of concrete visual direction (not "clean and modern" platitudes — reference the actual style/example sites given).
8. ctaStrategy — what the primary call to action should be on each key page, tied to the real objectives.
9. seoRequirements — 3-5 concrete SEO requirements (metadata, headings, local SEO if a location was given, etc.).
10. analyticsRequirements — what should be tracked, tied to the real objectives (e.g. "track contact form submissions" only makes sense if lead generation is an objective).
11. technicalRequirements — 3-5 concrete technical requirements (responsive, fast-loading, accessible, contact form working, etc.) — practical, not exhaustive.
12. acceptanceCriteria — 5-8 concrete, checkable statements that define "this website is done and good" for this specific project.`;
}

const WEBSITE_BRIEF_TOOL: Anthropic.Tool = {
  name: "submit_website_brief",
  description: "Submit the complete Website Build Brief.",
  input_schema: {
    type: "object",
    properties: {
      businessOverview: { type: "string" },
      targetAudience: { type: "string" },
      objectives: { type: "array", items: { type: "string" } },
      sitemap: {
        type: "array",
        items: { type: "object", properties: { page: { type: "string" }, purpose: { type: "string" } }, required: ["page", "purpose"] },
      },
      contentRequirements: { type: "array", items: { type: "string" } },
      brandGuidelines: { type: "string" },
      designDirection: { type: "string" },
      ctaStrategy: { type: "string" },
      seoRequirements: { type: "array", items: { type: "string" } },
      analyticsRequirements: { type: "array", items: { type: "string" } },
      technicalRequirements: { type: "array", items: { type: "string" } },
      acceptanceCriteria: { type: "array", items: { type: "string" } },
    },
    required: [
      "businessOverview",
      "targetAudience",
      "objectives",
      "sitemap",
      "contentRequirements",
      "brandGuidelines",
      "designDirection",
      "ctaStrategy",
      "seoRequirements",
      "analyticsRequirements",
      "technicalRequirements",
      "acceptanceCriteria",
    ],
  },
};

// tool_choice forcing a specific tool makes Claude call it, but it's
// still a generative model, not a schema validator — a live-tested run
// against this exact prompt once returned a field as a bare string
// instead of an array. Never assume the tool call's `input` actually
// matches WEBSITE_BRIEF_TOOL's schema; coerce every field defensively,
// same "never trust structurally" instinct as sanitizeBlocksForWrite()
// in command-centre-layout.ts.
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string").map(stripMarkdownEmphasis);
  if (typeof value === "string" && value.trim()) return [stripMarkdownEmphasis(value)];
  return [];
}

function toText(value: unknown): string {
  return typeof value === "string" ? stripMarkdownEmphasis(value) : "";
}

function toSitemap(value: unknown): { page: string; purpose: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is { page?: unknown; purpose?: unknown } => Boolean(s) && typeof s === "object")
    .map((s) => ({ page: toText(s.page), purpose: toText(s.purpose) }))
    .filter((s) => s.page);
}

// Exported for website-brief.test.ts — same "never trust structurally"
// defensive-coercion pattern as sanitizeBlocksForWrite() and
// reconcilePhases(), worth testing directly.
export function stripBrief(raw: unknown): WebsiteBrief {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    businessOverview: toText(r.businessOverview),
    targetAudience: toText(r.targetAudience),
    objectives: toStringArray(r.objectives),
    sitemap: toSitemap(r.sitemap),
    contentRequirements: toStringArray(r.contentRequirements),
    brandGuidelines: toText(r.brandGuidelines),
    designDirection: toText(r.designDirection),
    ctaStrategy: toText(r.ctaStrategy),
    seoRequirements: toStringArray(r.seoRequirements),
    analyticsRequirements: toStringArray(r.analyticsRequirements),
    technicalRequirements: toStringArray(r.technicalRequirements),
    acceptanceCriteria: toStringArray(r.acceptanceCriteria),
  };
}

// Live-tested finding: this is a genuinely large, content-heavy schema
// (12 required fields, several 4-8 item arrays of full sentences) — the
// codebase's usual default model (Haiku, used successfully for smaller
// jobs like draft-sales-kit.ts's 6-field kit) dropped fields entirely on
// 2 of 3 real test runs, not just an occasional string-vs-array mixup.
// Worth a stronger model specifically for this one call — a project's
// whole first artifact being unreliable isn't an acceptable place to
// economise — plus a cheap well-formedness check with one retry, since
// even a good model can have an off run on structured output like this.
const BRIEF_MODEL = process.env.ANTHROPIC_MODEL_WEBSITE_BRIEF || "claude-sonnet-5";

export function isWellFormed(brief: WebsiteBrief): boolean {
  return (
    brief.businessOverview.length > 0 &&
    brief.objectives.length >= 1 &&
    brief.sitemap.length >= 2 &&
    brief.contentRequirements.length >= 2 &&
    brief.seoRequirements.length >= 2 &&
    brief.technicalRequirements.length >= 2 &&
    brief.acceptanceCriteria.length >= 3
  );
}

async function requestBrief(anthropic: Anthropic, discovery: WebsiteDiscovery): Promise<WebsiteBrief | null> {
  const response = await anthropic.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 4000,
    system: buildSystemPrompt(discovery),
    tools: [WEBSITE_BRIEF_TOOL],
    tool_choice: { type: "tool", name: "submit_website_brief" },
    messages: [{ role: "user", content: "Write the full Website Build Brief." }],
  });

  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  return toolUse ? stripBrief(toolUse.input) : null;
}

export async function generateWebsiteBrief(discovery: WebsiteDiscovery): Promise<{ brief: WebsiteBrief } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." };

  const anthropic = new Anthropic({ apiKey });

  try {
    // Up to two attempts — a malformed/incomplete first result is
    // retried once automatically rather than surfacing a broken brief;
    // only give up if the second attempt is also degraded.
    for (let attempt = 0; attempt < 2; attempt++) {
      const brief = await requestBrief(anthropic, discovery);
      if (brief && isWellFormed(brief)) return { brief };
      if (brief && attempt === 1) return { brief }; // last attempt: return what we have rather than nothing
    }
    return { error: "The brief generator couldn't produce a complete brief — try again." };
  } catch (error) {
    console.error("Failed to generate website brief:", error);
    return { error: "The brief generator is temporarily unavailable." };
  }
}
