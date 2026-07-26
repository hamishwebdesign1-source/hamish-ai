import Anthropic from "@anthropic-ai/sdk";

const SUBMIT_ENTRIES_TOOL: Anthropic.Tool = {
  name: "submit_knowledge_entries",
  description: "Submit the extracted knowledge base entries.",
  input_schema: {
    type: "object",
    properties: {
      entries: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short, specific — e.g. 'Opening hours' not 'Info'." },
            content: {
              type: "string",
              description: "A self-contained, plain-English answer a support agent could read on its own.",
            },
          },
          required: ["title", "content"],
        },
      },
    },
    required: ["entries"],
  },
};

const SYSTEM_PROMPT = `You turn a business document into a knowledge base for a customer-support AI. Read the document and split it into focused, self-contained entries — one topic per entry (e.g. "Opening hours", "Cancellation policy", "Delivery areas"). Each entry's content should make sense on its own, without needing the rest of the document for context. Skip anything that isn't a fact the AI would need to answer a customer's question — boilerplate, page numbers, and formatting artefacts aren't entries. Do not include any personal data about named individual customers (names, contact details, order history) — only general business facts and policies. If the document has no usable business facts, submit an empty entries array.`;

export async function extractKnowledgeEntries(
  rawText: string
): Promise<{ entries: { title: string; content: string }[] } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  // Documents are chunked at a conservative character count rather than a
  // token count — good enough to keep any one call well within context,
  // without pulling in a tokenizer just for this.
  const CHUNK_SIZE = 12000;
  const chunks: string[] = [];
  for (let i = 0; i < rawText.length; i += CHUNK_SIZE) chunks.push(rawText.slice(i, i + CHUNK_SIZE));

  const entries: { title: string; content: string }[] = [];

  for (const chunk of chunks) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools: [SUBMIT_ENTRIES_TOOL],
        tool_choice: { type: "tool", name: "submit_knowledge_entries" },
        messages: [{ role: "user", content: chunk }],
      });

      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      if (!toolUse) continue;

      const result = toolUse.input as { entries: { title: string; content: string }[] };
      entries.push(...(result.entries ?? []));
    } catch (error) {
      console.error("Knowledge extraction failed for a chunk:", error);
      return { error: "The extraction agent is temporarily unavailable." };
    }
  }

  return { entries };
}
