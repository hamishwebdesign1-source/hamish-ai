import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { logAuditEvent } from "@/lib/audit-log";
import { recordContentUsage } from "@/lib/content-ai-usage";
import { AMAZON_DISCLOSURE_TEXT } from "@/lib/generate-content-scripts";

// Content Factory MVP Phase C (docs/content-factory-plan.md) — caption/
// title/hashtag generation, run automatically once a video finishes
// generating (see content-video-pipeline.ts). One forced-tool Haiku call,
// same shape as draft-sales-kit.ts. The brief asks for platform-specific
// packaging (YouTube Shorts vs. TikTok); the MVP keeps it to one shared
// {title, caption, hashtags} set rather than two full metadata blocks —
// real per-platform divergence (YouTube tags, TikTok privacy settings)
// only matters once actual publishing exists, which is phase 2.

export type ContentCopy = {
  title: string;
  caption: string;
  hashtags: string[];
};

const COPY_TOOL: Anthropic.Tool = {
  name: "submit_content_copy",
  description: "Submit the title, caption, and hashtags for this finished video.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "A punchy YouTube Shorts title, under 100 characters. Genuinely intriguing, not clickbait." },
      caption: { type: "string", description: "A short caption (under 150 characters) — can restate the hook as a question or teaser." },
      hashtags: {
        type: "array",
        items: { type: "string" },
        description: "5-8 relevant hashtags, no # symbol, lowercase, no spaces. Never generic-only (#fyp, #viral) — always include specific topical ones too.",
      },
    },
    required: ["title", "caption", "hashtags"],
  },
};

function buildSystemPrompt(idea: { title: string; concept: string; content_domain?: string }, hook: string): string {
  const isAffiliate = idea.content_domain === "amazon_affiliate";
  const affiliateNote = isAffiliate
    ? `\n\nThis is an Amazon affiliate product video. Do NOT write a disclosure line or a purchase link — both are appended automatically after this step. Do not invent a personal-testing claim in the caption either, same rule as the script itself.`
    : "";
  return `Write short-form video metadata for Hamish AI's content channel.

Idea: ${idea.title}
Concept: ${idea.concept}
Video hook (spoken): ${hook}
${affiliateNote}

Write a punchy title, a short caption, and 5-8 relevant hashtags. No emojis unless they genuinely add clarity, never a wall of them. Ground everything in the actual hook/concept — no generic filler.`;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (typeof value === "string" && value.length > 0) return [value]; // same collapse-to-string tolerance found necessary in research-content-idea.ts
  return [];
}

export async function generateContentCopy(videoId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: video, error: videoError } = await supabase
    .from("content_videos")
    .select("idea_id, script_id")
    .eq("id", videoId)
    .single();
  if (videoError || !video) return { error: "Video not found." as const };

  const [{ data: idea }, { data: script }] = await Promise.all([
    supabase.from("content_ideas").select("title, concept, content_domain").eq("id", video.idea_id).single(),
    supabase.from("content_scripts").select("hook").eq("id", video.script_id).single(),
  ]);
  if (!idea) return { error: "Idea not found." as const };
  const isAffiliate = idea.content_domain === "amazon_affiliate";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 500,
      system: buildSystemPrompt(idea, script?.hook ?? idea.concept),
      tools: [COPY_TOOL],
      tool_choice: { type: "tool", name: "submit_content_copy" },
      messages: [{ role: "user", content: "Write the title, caption, and hashtags." }],
    });

    await recordContentUsage({
      ideaId: video.idea_id,
      videoId,
      stage: "caption_generation",
      provider: "anthropic",
      units: response.usage.input_tokens + response.usage.output_tokens,
      unitType: "tokens",
    });

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) return { error: "The AI did not return copy." as const };

    const raw = toolUse.input as ContentCopy;
    let caption = stripMarkdownEmphasis(String(raw.caption ?? ""));

    // The disclosure's one reliable channel — see AMAZON_DISCLOSURE_TEXT's
    // comment in generate-content-scripts.ts for why it no longer touches
    // the script/video prompt at all. Appended deterministically, never
    // AI-generated, same reasoning as duration being computed rather than
    // guessed. The tracked link lives here too — affiliate links belong
    // in a video's description, not baked into the pixels.
    if (isAffiliate) {
      const { data: link } = await supabase.from("affiliate_links").select("slug").eq("idea_id", video.idea_id).eq("active", true).maybeSingle();
      const linkLine = link ? `\n\nShop it: https://www.hamishai.org/go/${link.slug}` : "";
      caption = `${caption}${linkLine}\n\n${AMAZON_DISCLOSURE_TEXT}`;
    }

    const copy: ContentCopy = {
      title: stripMarkdownEmphasis(String(raw.title ?? "")),
      caption,
      hashtags: toStringArray(raw.hashtags),
    };
    const generatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("content_videos")
      .update({ platform_copy: copy, platform_copy_generated_at: generatedAt })
      .eq("id", videoId);
    if (updateError) {
      console.error("Failed to save content copy:", updateError);
      return { error: "Copy generated but failed to save." as const };
    }

    await logAuditEvent({
      actor: "system",
      actorType: "system",
      action: "content.copy_generated",
      targetType: "content_idea",
      targetId: video.idea_id,
      metadata: { video_id: videoId, title: copy.title },
    });

    return { copy, generatedAt };
  } catch (error) {
    console.error(`Failed to generate content copy for video ${videoId}:`, error);
    return { error: "The copy agent is temporarily unavailable." as const };
  }
}
