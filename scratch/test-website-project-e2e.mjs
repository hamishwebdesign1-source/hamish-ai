// Full end-to-end live test for WB1 against the real Edinburgh solutions
// test tenant — mirrors exactly what createWebsiteProject() does
// (insert with discovery, generate brief via the real lib function,
// update row), since the Server Action itself needs a real auth session
// to call directly. Cleans up the test row afterward.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  if (!line.includes("=") || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  const key = line.slice(0, i).trim();
  const value = line.slice(i + 1).trim();
  if (key && !(key in process.env)) process.env[key] = value;
}

const { generateWebsiteBrief } = await import("../src/lib/website-brief.ts");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ORG_ID = "af543a0c-6ae2-418a-9816-8b87a7b7e844";
const CLIENT_ID = "b64d73fe-83f8-4d19-925f-2a1c9d1ad7b8";

async function main() {
  const discovery = {
    businessName: "Demo Client — delete me when done exploring",
    industry: "Cafe",
    location: "Edinburgh",
    targetAudience: "Local coffee lovers and remote workers",
    servicesProducts: "Specialty coffee, light lunches, pastries",
    usps: "Locally roasted beans, cosy work-friendly space",
    objectives: ["Build credibility", "Provide information"],
    sitemapPages: ["Home", "About", "Contact"],
    designStyle: "Warm and cosy",
    designColours: "Browns and creams",
    designFonts: "",
    designExamples: "",
    existingWebsiteUrl: "",
    contentNotes: "",
  };

  // Insert (mirrors createWebsiteProject)
  const { data: project, error: insertError } = await supabase
    .from("website_projects")
    .insert({ org_id: ORG_ID, client_id: CLIENT_ID, discovery, stage: "discovery" })
    .select("id")
    .single();
  if (insertError) throw insertError;
  console.log("Inserted project:", project.id);

  // Generate brief (the real, already-verified lib function)
  const result = await generateWebsiteBrief(discovery);
  if ("error" in result) throw new Error("Brief generation failed: " + result.error);
  console.log("Brief generated, businessOverview:", result.brief.businessOverview.slice(0, 80) + "...");

  // Update (mirrors createWebsiteProject's second write)
  const generatedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("website_projects")
    .update({ brief: result.brief, brief_generated_at: generatedAt, stage: "brief" })
    .eq("id", project.id);
  if (updateError) throw updateError;

  // Read back and verify (mirrors the detail page's own query, including
  // the same clients(business_name) embedded relation)
  const { data: readBack, error: readError } = await supabase
    .from("website_projects")
    .select("id, stage, discovery, brief, brief_generated_at, client_id, clients(business_name)")
    .eq("id", project.id)
    .eq("org_id", ORG_ID)
    .single();
  if (readError) throw readError;

  const clientName = readBack.clients?.business_name;
  const stageCorrect = readBack.stage === "brief";
  const discoveryMatches = readBack.discovery.businessName === discovery.businessName;
  const briefPresent = Boolean(readBack.brief && readBack.brief.businessOverview);
  const relationWorks = Boolean(clientName);

  console.log("Stage is 'brief':", stageCorrect);
  console.log("Discovery round-trips:", discoveryMatches);
  console.log("Brief present after read-back:", briefPresent);
  console.log("clients(business_name) relation resolves:", relationWorks, "->", clientName);

  // Also verify RLS: an anon/session-scoped client (not admin) should
  // still be blocked without a real session — confirms RLS is actually
  // enforcing something, not just present but toothless.
  const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: anonRead, error: anonError } = await anonClient.from("website_projects").select("id").eq("id", project.id);
  const rlsBlocksAnon = (anonRead ?? []).length === 0;
  console.log("RLS blocks anonymous read:", rlsBlocksAnon, anonError ? `(error: ${anonError.message})` : "(empty result)");

  // Cleanup
  await supabase.from("website_projects").delete().eq("id", project.id);
  const { data: afterDelete } = await supabase.from("website_projects").select("id").eq("id", project.id);
  console.log("Cleaned up:", (afterDelete ?? []).length === 0);

  const pass = stageCorrect && discoveryMatches && briefPresent && relationWorks && rlsBlocksAnon;
  console.log(pass ? "PASS" : "FAIL");
  if (!pass) process.exit(1);
}

main();
