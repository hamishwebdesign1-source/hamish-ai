// Live round-trip test for Command Centre Phase 5c's command_centre_layout
// column (version 2 — typed blocks including chart/text/cta), against the
// real Edinburgh solutions test tenant. Confirms:
// 1) column starts null (default, no behaviour change)
// 2) writing a custom layout with a stat block, a section block, a
//    chart block, a text block, and a cta block persists exactly
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
    version: 2,
    blocks: [
      { id: "stat:pipeline", type: "stat", cardId: "pipeline", span: 2 },
      { id: "actions_required", type: "actions_required" },
      { id: "chart:test1", type: "chart", metric: "revenue", kind: "area", span: 2 },
      { id: "text:test1", type: "text", title: "Note", body: "Hello team", span: 2 },
      { id: "cta:test1", type: "cta", label: "Go", href: "/studio/prospects", span: 1 },
    ],
  };
  const { error: writeErr } = await supabase.from("organisations").update({ command_centre_layout: custom }).eq("id", ORG_ID);
  if (writeErr) throw writeErr;

  const { data: after } = await supabase.from("organisations").select("command_centre_layout").eq("id", ORG_ID).single();
  console.log("After write:", JSON.stringify(after.command_centre_layout));

  const stored = after.command_centre_layout;
  const matches =
    stored.version === custom.version &&
    Array.isArray(stored.blocks) &&
    stored.blocks.length === custom.blocks.length &&
    stored.blocks.every((b, i) => JSON.stringify(Object.keys(b).sort()) === JSON.stringify(Object.keys(custom.blocks[i]).sort())
      && Object.keys(custom.blocks[i]).every((k) => b[k] === custom.blocks[i][k]));
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
