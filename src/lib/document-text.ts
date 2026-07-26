import mammoth from "mammoth";

// Import the lib file directly, not the package root — pdf-parse's index.js
// runs a debug self-test at module load time whenever `module.parent` is
// falsy (common under bundlers), which throws trying to read its own test
// fixture. The lib file has the same parse function without that top-level
// side effect.
async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  const result = await pdfParse(buffer);
  return result.text;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractTextFromFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop() || "";

  if (ext === "pdf") return extractPdfText(buffer);
  if (ext === "docx") return extractDocxText(buffer);
  // .txt, .md, and anything else plain-text — read as-is rather than
  // rejecting it, since a client's "document" is often just a pasted note.
  return buffer.toString("utf-8");
}
