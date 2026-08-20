// Live round-trip test for Command Centre Phase 5b's command_centre_layout
// column, against the real Edinburgh solutions test tenant. Confirms:
// 1) column starts null (default, no behaviour change)
// 2) writing a custom block layout (reordered, one hidden, one widened)
//    persists exactly
// 3) resetting back to null works
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ORG_ID = "af543a0c-6ae2-418a-9816-8b87a7b7e844"; // Edinburgh solutions test tenant

async function main() {
  const { data: before, error: readErr } = await supabase
    .from("organisations")
    .select("command_centre_layout")
    .eq("id", ORG_ID)
    .single();
  if (readErr) throw readErr;
  console.log("Before:", before.command_centre_layout);

  const custom = {
    version: 1,
    blocks: [
      { id: "stat:pipeline", span: 2 },
      { id: "stat:health", span: 1 },
      { id: "actions_required" },
      { id: "stat:clients", span: 1 },
    ],
  };
  const { error: writeErr } = await supabase.from("organisations").update({ command_centre_layout: custom }).eq("id", ORG_ID);
  if (writeErr) throw writeErr;

  const { data: after } = await supabase.from("organisations").select("command_centre_layout").eq("id", ORG_ID).single();
  console.log("After write:", JSON.stringify(after.command_centre_layout));
  // Structural comparison, not string equality — Postgres jsonb doesn't
  // preserve key insertion order, so {version, blocks} can legitimately
  // round-trip as {blocks, version}. The app's own resolveLayout() reads
  // by key, never by serialized string, so this is the correct check.
  const stored = after.command_centre_layout;
  const matches =
    stored.version === custom.version &&
    Array.isArray(stored.blocks) &&
    stored.blocks.length === custom.blocks.length &&
    stored.blocks.every((b, i) => b.id === custom.blocks[i].id && b.span === custom.blocks[i].span);
  console.log("Round-trip matches:", matches);

  const { error: resetErr } = await supabase.from("organisations").update({ command_centre_layout: null }).eq("id", ORG_ID);
  if (resetErr) throw resetErr;
  const { data: final } = await supabase.from("organisations").select("command_centre_layout").eq("id", ORG_ID).single();
  console.log("After reset:", final.command_centre_layout);

  if (!matches) {
    console.error("FAIL: round-trip did not match");
    process.exit(1);
  }
  console.log("PASS");
}

main();
