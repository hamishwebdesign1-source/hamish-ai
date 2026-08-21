import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  if (!line.includes("=") || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  const key = line.slice(0, i).trim();
  const value = line.slice(i + 1).trim();
  if (key && !(key in process.env)) process.env[key] = value;
}

const { generateBuildPhases } = await import("../src/lib/website-build-phases.ts");

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

const result = await generateBuildPhases(brief, "claude_code");
if ("error" in result) {
  console.log("ERROR:", result.error);
  process.exit(1);
}
console.log("Phase count:", result.phases.length);
for (const p of result.phases) {
  const isFallback = p.instructions.startsWith("Ask your AI coding agent to work on:");
  console.log(`- ${p.id}: instructions ${p.instructions.length} chars, checklist ${p.checklist.length} items${isFallback ? " [FALLBACK]" : ""}`);
}
console.log(JSON.stringify(result.phases[0], null, 2).slice(0, 800));
