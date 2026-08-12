// Content Factory MVP Phase C (docs/content-factory-plan.md) — automated
// quality check after a video finishes generating. Deliberately a pure
// heuristic function, no AI call — same "deterministic phase, no LLM
// cost" idea as runSiteCheck() in research-lead.ts. An AI-based frame/hook
// -quality pass is a real phase-2 upgrade, not built here.

export type QualityFlags = {
  size_flag?: "suspiciously_small" | "ok";
  duration_flag?: "mismatch" | "ok";
  notes: string[];
};

// A real several-second vertical video should clear this easily —
// anything smaller is almost certainly a broken or empty generation, not
// a genuinely short clip.
const MIN_REASONABLE_BYTES = 50_000;
const DURATION_TOLERANCE_S = 5;

export function computeQualityFlags(params: {
  fileSizeBytes: number | null;
  expectedDurationS: number;
  actualDurationS?: number | null;
}): QualityFlags {
  const notes: string[] = [];
  const flags: QualityFlags = { notes };

  if (params.fileSizeBytes != null) {
    flags.size_flag = params.fileSizeBytes < MIN_REASONABLE_BYTES ? "suspiciously_small" : "ok";
    if (flags.size_flag === "suspiciously_small") {
      notes.push(`File is only ${params.fileSizeBytes} bytes — likely a broken or empty generation.`);
    }
  }

  if (params.actualDurationS != null) {
    const diff = Math.abs(params.actualDurationS - params.expectedDurationS);
    flags.duration_flag = diff > DURATION_TOLERANCE_S ? "mismatch" : "ok";
    if (flags.duration_flag === "mismatch") {
      notes.push(`Requested ${params.expectedDurationS}s but got ${params.actualDurationS}s.`);
    }
  }

  if (notes.length === 0) notes.push("No issues detected by automated checks.");
  return flags;
}
