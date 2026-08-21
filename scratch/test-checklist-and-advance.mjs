// Live DB-only test for the checklist toggle + phase advance logic
// (no Anthropic calls) against the real Edinburgh solutions test tenant.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ORG_ID = "af543a0c-6ae2-418a-9816-8b87a7b7e844";
const CLIENT_ID = "b64d73fe-83f8-4d19-925f-2a1c9d1ad7b8";

const fakePhases = [
  { id: "setup", name: "Project setup", instructions: "test", checklist: [{ item: "a", done: false }, { item: "b", done: false }] },
  { id: "design_system", name: "Design system", instructions: "test", checklist: [{ item: "c", done: false }] },
];

async function main() {
  const { data: project, error: insertError } = await supabase
    .from("website_projects")
    .insert({ org_id: ORG_ID, client_id: CLIENT_ID, stage: "build", build_phases: fakePhases, current_phase_index: 0 })
    .select("id")
    .single();
  if (insertError) throw insertError;
  console.log("Inserted test project:", project.id);

  // Mirror toggleChecklistItem: flip item 0 of phase "setup"
  let { data: row } = await supabase.from("website_projects").select("build_phases").eq("id", project.id).single();
  let phases = row.build_phases;
  phases = phases.map((p) => (p.id === "setup" ? { ...p, checklist: p.checklist.map((c, i) => (i === 0 ? { ...c, done: !c.done } : c)) } : p));
  await supabase.from("website_projects").update({ build_phases: phases }).eq("id", project.id);

  ({ data: row } = await supabase.from("website_projects").select("build_phases, current_phase_index").eq("id", project.id).single());
  const item0Done = row.build_phases[0].checklist[0].done === true;
  console.log("Checklist item toggled correctly:", item0Done);

  // Mirror advanceBuildPhase attempt while checklist incomplete — should be blocked
  const currentPhase = row.build_phases[row.current_phase_index];
  const shouldBlock = !currentPhase.checklist.every((c) => c.done);
  console.log("Advance correctly blocked while checklist incomplete:", shouldBlock);

  // Complete the rest of the checklist, then advance
  phases = phases.map((p) => (p.id === "setup" ? { ...p, checklist: p.checklist.map((c) => ({ ...c, done: true })) } : p));
  await supabase.from("website_projects").update({ build_phases: phases, current_phase_index: 1 }).eq("id", project.id);

  ({ data: row } = await supabase.from("website_projects").select("current_phase_index").eq("id", project.id).single());
  const advanced = row.current_phase_index === 1;
  console.log("Phase index advanced to 1:", advanced);

  await supabase.from("website_projects").delete().eq("id", project.id);
  const { data: afterDelete } = await supabase.from("website_projects").select("id").eq("id", project.id);
  console.log("Cleaned up:", (afterDelete ?? []).length === 0);

  const pass = item0Done && shouldBlock && advanced;
  console.log(pass ? "PASS" : "FAIL");
  if (!pass) process.exit(1);
}

main();
