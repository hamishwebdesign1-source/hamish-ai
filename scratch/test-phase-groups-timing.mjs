import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  if (!line.includes("=") || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  const key = line.slice(0, i).trim();
  const value = line.slice(i + 1).trim();
  if (key && !(key in process.env)) process.env[key] = value;
}

const { generateBuildPhaseGroup, PHASE_GROUPS, BUILD_PHASE_ORDER } = await import("../src/lib/website-build-phases.ts");

const brief = {
  businessOverview: "Leith Coastal Dental is a modern NHS and private dental practice in Edinburgh specialising in anxiety-free care.",
  targetAudience: "Local families and young professionals seeking a modern, low-anxiety dental practice.",
  objectives: ["Generate enquiries from local families", "Enable direct appointment booking", "Build credibility as a modern practice"],
  sitemap: [
    { page: "Home", purpose: "Establish trust and highlight same-day emergency slots" },
    { page: "About", purpose: "Introduce the team and calm-care philosophy" },
    { page: "Services", purpose: "Present general dentistry, whitening, Invisalign, emergency care" },
    { page: "Contact", purpose: "Multiple contact pathways and a booking form" },
    { page: "FAQs", purpose: "Address dental anxiety and NHS vs private questions" },
  ],
  contentRequirements: ["Real patient testimonials", "Before/after whitening photos", "Team bios", "Opening hours and location"],
  brandGuidelines: "Soft blues and whites, calm and modern, not clinical.",
  designDirection: "Warm, uncluttered, generous whitespace, real photography not stock.",
  ctaStrategy: "Book an Appointment as the primary CTA throughout.",
  seoRequirements: ["Local keywords for Leith/Edinburgh dentist", "LocalBusiness schema markup", "Service-specific H1s"],
  analyticsRequirements: ["Track contact form submissions", "Track booking CTA clicks"],
  technicalRequirements: ["Fully responsive", "Fast load times", "WCAG AA accessible"],
  acceptanceCriteria: ["All five pages live with real content", "Contact form functional", "Mobile layout works correctly"],
};

console.log("Groups:", JSON.stringify(PHASE_GROUPS));

const overallStart = Date.now();
const results = await Promise.all(
  PHASE_GROUPS.map(async (group, i) => {
    const start = Date.now();
    const result = await generateBuildPhaseGroup(brief, "claude_code", group);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if ("error" in result) {
      console.log(`Group ${i} (${group.join(",")}): ERROR after ${elapsed}s - ${result.error}`);
      return result;
    }
    console.log(`Group ${i} (${group.join(",")}): ${elapsed}s, ${result.phases.length} phases`);
    return result;
  })
);
const overallElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
console.log(`\nTotal wall-clock (parallel): ${overallElapsed}s`);

const failed = results.find((r) => "error" in r);
if (failed) {
  console.log("FAIL: a group errored");
  process.exit(1);
}
const combined = results.flatMap((r) => r.phases);
const ids = new Set(combined.map((p) => p.id));
const allCovered = BUILD_PHASE_ORDER.every((id) => ids.has(id));
console.log("All 10 phase ids covered:", allCovered, `(${combined.length} total)`);
console.log(allCovered ? "PASS" : "FAIL");
