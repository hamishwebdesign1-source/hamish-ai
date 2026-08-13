import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../.env.local") });

async function main() {
  const { getSupabaseAdmin } = await import("../src/lib/supabase");
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const IDEA_ID = "0fbf346b-b051-4d8d-b04f-12c80315548f";
  const { data: idea, error } = await supabase.from("content_ideas").select("id, title, concept, status").eq("id", IDEA_ID).single();
  if (error || !idea) {
    console.log("Idea not found by that id, listing recent ideas instead:");
    const { data: recent } = await supabase.from("content_ideas").select("id, title, status").order("created_at", { ascending: false }).limit(10);
    console.log(JSON.stringify(recent, null, 2));
    return;
  }
  console.log("Testing against idea:", idea.title, "(status:", idea.status + ")");

  const { generateContentScripts } = await import("../src/lib/generate-content-scripts");
  const result = await generateContentScripts(IDEA_ID);
  if ("error" in result) {
    console.error("generateContentScripts failed:", result.error);
    return;
  }

  const winner = result.variants.find((v) => v.id === result.selectedId)!;
  console.log("\n=== SELECTED VARIANT ===");
  console.log("Style:", winner.style, "| Score:", winner.score, "-", winner.score_rationale);
  console.log("Word count:", winner.word_count, "| Target duration (from words):", winner.target_duration_s, "s");
  console.log("\nFull narration:\n" + winner.full_script);
  console.log("\nScene breakdown:");
  for (const s of winner.scene_breakdown) {
    console.log(`  [${s.order}] ${s.beat} (${s.duration_s}s): "${s.narration_segment}"`);
    console.log(`      visual: ${s.visual_description}`);
    console.log(`      on-screen: "${s.on_screen_text}"`);
  }
  console.log("\nCharacter consistency:", winner.character_consistency || "(none)");

  const { data: scriptRow } = await supabase.from("content_scripts").select("id, video_prompt, prompt_generated_at").eq("id", result.selectedId).single();
  console.log("\n=== VIEWMAX VIDEO PROMPT ===");
  if (scriptRow?.video_prompt) {
    const vp = scriptRow.video_prompt as { prompt: string; style_notes: string; duration_s: number; aspect_ratio: string; resolution: string };
    console.log("duration_s:", vp.duration_s, "| aspect_ratio:", vp.aspect_ratio, "| resolution:", vp.resolution);
    console.log("style_notes:", vp.style_notes);
    console.log("prompt length (chars):", vp.prompt.length, "/ 2000 budget");
    console.log("\n--- PROMPT TEXT ---\n");
    console.log(vp.prompt);
  } else {
    console.log("No video prompt was generated (check logs above for an error).");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
