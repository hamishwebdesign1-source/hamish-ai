// Chat replies render in a plain-text bubble, not a markdown renderer. The
// system prompts instruct the model never to use markdown emphasis, but
// that's a probabilistic instruction, not a guarantee — this is the
// deterministic backstop so a stray **bold** or *italic* never reaches the
// UI as literal asterisks.
export function stripMarkdownEmphasis(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "$1");
}
