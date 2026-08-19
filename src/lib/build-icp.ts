import Anthropic from "@anthropic-ai/sdk";

// The natural-language ICP builder — one call, free text in, structured
// targeting out. Deliberately thin: it produces exactly what
// discover-leads.ts can actually use (categories, areas) plus two fields
// stored for context but not enforced as hard filters (size_band,
// exclusions), because nothing in this codebase can verify employee count
// or revenue from a web search alone — see the Opportunity Discovery
// Engine assessment's "constraint that actually matters." Overclaiming a
// filter that doesn't really filter would be worse than being honest that
// it's guidance, not enforcement.

export type ICP = {
  categories: string[];
  areas: string[];
  size_band: string | null;
  exclusions: string[];
  notes: string;
};

const ICP_TOOL: Anthropic.Tool = {
  name: "submit_icp",
  description: "Submit the structured ideal-customer-profile extracted from the description.",
  input_schema: {
    type: "object",
    properties: {
      categories: {
        type: "array",
        items: { type: "string" },
        description: "2-5 specific business categories/niches, in the same plain vocabulary a directory listing would use (e.g. 'Accountants', 'Independent Gyms', not broad sectors like 'Professional Services').",
      },
      areas: {
        type: "array",
        items: { type: "string" },
        description: "1-6 specific towns/cities/named areas. Never a whole county or region on its own — if the description names a broad region, pick 2-4 real towns within it instead.",
      },
      size_band: {
        type: "string",
        description: "A rough employee-count or revenue band if the description implies one (e.g. '10-100 employees'), otherwise an empty string. Stored as context only — not used to filter search results.",
      },
      exclusions: {
        type: "array",
        items: { type: "string" },
        description: "Anything the description explicitly rules out (e.g. 'not chains', 'not businesses with an agency already'). Empty array if none stated.",
      },
      notes: {
        type: "string",
        description: "One plain sentence summarising your interpretation, so the user can sanity-check it before saving — e.g. 'Independent gyms and fitness studios across Kent's main towns, no chains.'",
      },
    },
    required: ["categories", "areas", "size_band", "exclusions", "notes"],
  },
};

export async function buildIcp(description: string): Promise<{ icp: ICP } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." };
  if (!description.trim()) return { error: "Describe your ideal customer first." };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const system = `You turn a plain-English description of an ideal customer into structured search targeting for a business-prospecting tool. Never invent a location or category the description doesn't support or clearly imply. If the description names a broad region (a county, "the UK", "Scotland"), replace it with 2-4 specific towns or cities within it — broad region names produce poor search results, specific places produce good ones.`;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 600,
      system,
      tools: [ICP_TOOL],
      tool_choice: { type: "tool", name: "submit_icp" },
      messages: [{ role: "user", content: `Description: "${description.trim()}"\n\nExtract the ICP and submit it.` }],
    });

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) return { error: "Could not interpret that description — try being more specific about who you sell to and where." };

    const raw = toolUse.input as Partial<ICP>;
    const icp: ICP = {
      categories: Array.isArray(raw.categories) ? raw.categories.filter((c): c is string => typeof c === "string" && c.length > 0) : [],
      areas: Array.isArray(raw.areas) ? raw.areas.filter((a): a is string => typeof a === "string" && a.length > 0) : [],
      size_band: typeof raw.size_band === "string" && raw.size_band.length > 0 ? raw.size_band : null,
      exclusions: Array.isArray(raw.exclusions) ? raw.exclusions.filter((e): e is string => typeof e === "string" && e.length > 0) : [],
      notes: typeof raw.notes === "string" ? raw.notes : "",
    };

    if (icp.categories.length === 0 || icp.areas.length === 0) {
      return { error: "Couldn't identify both a category and an area from that description — try naming a specific business type and place." };
    }

    return { icp };
  } catch (error) {
    console.error("Failed to build ICP:", error);
    return { error: "The ICP builder is temporarily unavailable." };
  }
}
