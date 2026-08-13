import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../.env.local") });

async function main() {
  const { listViewMaxModels, pickCheapestVideoOption } = await import("../src/lib/viewmax");
  const models = await listViewMaxModels("video");
  if (!models) throw new Error("Could not fetch live model catalog");

  for (const target of [8, 20, 36, 58]) {
    const option = pickCheapestVideoOption(models, target, "9:16");
    console.log(`target ${target}s ->`, option);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
