import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "../.env.local") });

async function main() {
  const { listViewMaxModels } = await import("../src/lib/viewmax");
  const models = await listViewMaxModels("video");
  if (!models) throw new Error("could not fetch catalog");

  for (const model of models) {
    if (model.coming_soon) continue;
    const mode = model.modes?.["text-to-video"];
    if (!mode || !mode.aspect_ratios?.includes("9:16")) continue;
    console.log(`\n${model.id}${model.label ? ` (${model.label})` : ""}`);
    console.log("  durations:", mode.durations?.length ? mode.durations : "(fixed, no duration param)");
    console.log("  resolutions:", mode.resolutions);
    if (mode.credits) console.log("  credits table:", JSON.stringify(mode.credits));
    if (mode.credits_per_second) console.log("  credits/sec:", JSON.stringify(mode.credits_per_second));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
