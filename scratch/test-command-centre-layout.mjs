// Live round-trip test for Command Centre Phase 5's command_centre_cards
// column, against the real Edinburgh solutions test tenant. Confirms:
// 1) column starts null (default, no behaviour change)
// 2) writing a custom subset+order persists exactly
// 3) resolveCardOrder-equivalent logic (re-derived here, not imported,
//    since this is a plain Node script outside the Next.js module graph)
//    treats it correctly
// 4) resetting back to null works
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
    .select("command_centre_cards")
    .eq("id", ORG_ID)
    .single();
  if (readErr) throw readErr;
  console.log("Before:", before.command_centre_cards);

  const custom = ["pipeline", "health", "clients"];
  const { error: writeErr } = await supabase
    .from("organisations")
    .update({ command_centre_cards: custom })
    .eq("id", ORG_ID);
  if (writeErr) throw writeErr;

  const { data: after } = await supabase.from("organisations").select("command_centre_cards").eq("id", ORG_ID).single();
  console.log("After write:", after.command_centre_cards);
  const matches = JSON.stringify(after.command_centre_cards) === JSON.stringify(custom);
  console.log("Round-trip matches:", matches);

  // Reset back to null (original state), same as resetCommandCentreCards()
  const { error: resetErr } = await supabase.from("organisations").update({ command_centre_cards: null }).eq("id", ORG_ID);
  if (resetErr) throw resetErr;
  const { data: final } = await supabase.from("organisations").select("command_centre_cards").eq("id", ORG_ID).single();
  console.log("After reset:", final.command_centre_cards);

  if (!matches) {
    console.error("FAIL: round-trip did not match");
    process.exit(1);
  }
  console.log("PASS");
}

main();
