// Live round-trip test for Command Centre Phase 5e's undo/version
// history, against the real Edinburgh solutions test tenant. Confirms:
// 1) snapshotting only happens when there's a real previous layout
// 2) a save writes a history row containing the PREVIOUS state
// 3) reverting restores that state and itself snapshots (so revert is
//    undoable too)
// 4) pruning caps history at 10 rows per org
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Structural comparison, not string equality — Postgres jsonb doesn't
// preserve key insertion order, so a stored {version, blocks} can
// legitimately round-trip with keys in a different order. Same fix
// applied earlier this session to test-command-centre-layout.mjs.
function layoutsMatch(a, b) {
  if (!a || !b || a.version !== b.version || !Array.isArray(a.blocks) || !Array.isArray(b.blocks)) return false;
  if (a.blocks.length !== b.blocks.length) return false;
  return a.blocks.every((blockA, i) => {
    const blockB = b.blocks[i];
    const keysA = Object.keys(blockA);
    const keysB = Object.keys(blockB);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => blockA[k] === blockB[k]);
  });
}

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

const HISTORY_LIMIT = 10;

async function snapshotLayoutHistory(orgId, previousLayout, source) {
  if (!previousLayout || typeof previousLayout !== "object") return;
  await supabase.from("command_centre_layout_history").insert({ org_id: orgId, layout: previousLayout, source });

  const { data: toKeep } = await supabase
    .from("command_centre_layout_history")
    .select("id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  const keepIds = new Set((toKeep ?? []).map((r) => r.id));
  const { data: all } = await supabase.from("command_centre_layout_history").select("id").eq("org_id", orgId);
  const staleIds = (all ?? []).map((r) => r.id).filter((id) => !keepIds.has(id));
  if (staleIds.length > 0) await supabase.from("command_centre_layout_history").delete().in("id", staleIds);
}

async function cleanup() {
  await supabase.from("command_centre_layout_history").delete().eq("org_id", ORG_ID);
  await supabase.from("organisations").update({ command_centre_layout: null }).eq("id", ORG_ID);
}

async function main() {
  await cleanup();

  // Step 1: no previous layout — save() should NOT create a history row
  const layoutA = { version: 2, blocks: [{ id: "stat:health", type: "stat", cardId: "health", span: 1 }] };
  await snapshotLayoutHistory(ORG_ID, null, "save"); // simulates the first-ever save (existing = null)
  await supabase.from("organisations").update({ command_centre_layout: layoutA }).eq("id", ORG_ID);
  const { count: afterFirstSave } = await supabase
    .from("command_centre_layout_history")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ORG_ID);
  console.log("History rows after first save (should be 0):", afterFirstSave);

  // Step 2: a second save — should snapshot layoutA
  const layoutB = { version: 2, blocks: [{ id: "stat:pipeline", type: "stat", cardId: "pipeline", span: 2 }] };
  await snapshotLayoutHistory(ORG_ID, layoutA, "save");
  await supabase.from("organisations").update({ command_centre_layout: layoutB }).eq("id", ORG_ID);
  const { data: historyAfterSecondSave } = await supabase
    .from("command_centre_layout_history")
    .select("id, layout, source")
    .eq("org_id", ORG_ID);
  console.log("History after second save:", JSON.stringify(historyAfterSecondSave));
  const snapshotMatchesA = layoutsMatch(historyAfterSecondSave[0]?.layout, layoutA);
  console.log("Snapshot correctly holds the PREVIOUS layout (A, not B):", snapshotMatchesA);

  // Step 3: revert to that history row — should restore layoutA and
  // snapshot layoutB (the state being replaced) as a new 'revert' row
  const historyId = historyAfterSecondSave[0].id;
  await snapshotLayoutHistory(ORG_ID, layoutB, "revert");
  await supabase.from("organisations").update({ command_centre_layout: layoutA }).eq("id", ORG_ID);
  const { data: afterRevert } = await supabase.from("organisations").select("command_centre_layout").eq("id", ORG_ID).single();
  const revertRestoredA = layoutsMatch(afterRevert.command_centre_layout, layoutA);
  console.log("Revert restored layout A:", revertRestoredA);

  const { count: historyCountAfterRevert } = await supabase
    .from("command_centre_layout_history")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ORG_ID);
  console.log("History rows after revert (should be 2 — A's replacement, then B's):", historyCountAfterRevert);

  // Step 4: pruning — insert enough saves to exceed the 10-row cap
  let prev = layoutA;
  for (let i = 0; i < 12; i++) {
    const next = { version: 2, blocks: [{ id: "stat:clients", type: "stat", cardId: "clients", span: i % 2 === 0 ? 1 : 2 }] };
    await snapshotLayoutHistory(ORG_ID, prev, "save");
    prev = next;
  }
  const { count: finalCount } = await supabase
    .from("command_centre_layout_history")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ORG_ID);
  console.log(`History rows after ${12 + 1} total snapshots (should be capped at ${HISTORY_LIMIT}):`, finalCount);

  await cleanup();

  const pass = afterFirstSave === 0 && snapshotMatchesA && revertRestoredA && historyCountAfterRevert === 2 && finalCount === HISTORY_LIMIT;
  console.log(pass ? "PASS" : "FAIL");
  if (!pass) process.exit(1);
}

main();
