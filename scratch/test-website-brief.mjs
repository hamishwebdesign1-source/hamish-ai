import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  if (!line.includes("=") || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  const key = line.slice(0, i).trim();
  const value = line.slice(i + 1).trim();
  if (key && !(key in process.env)) process.env[key] = value;
}

const { generateWebsiteBrief } = await import("../src/lib/website-brief.ts");

const discovery = {
  businessName: "Leith Coastal Dental",
  industry: "Dental practice",
  location: "Leith, Edinburgh",
  targetAudience: "Local families and young professionals looking for a modern, low-anxiety dental practice",
  servicesProducts: "General dentistry, teeth whitening, Invisalign, emergency appointments",
  usps: "Same-day emergency slots, a genuinely calm environment for anxious patients, NHS and private both available",
  objectives: ["Generate enquiries", "Take bookings", "Build credibility"],
  sitemapPages: ["Home", "About", "Services", "Contact", "FAQs"],
  designStyle: "Clean, calming, modern — not clinical or cold",
  designColours: "Soft blues and whites",
  designFonts: "",
  designExamples: "https://www.example-dental-competitor.com",
  existingWebsiteUrl: "",
  contentNotes: "We have real patient testimonials and before/after whitening photos.",
};

const result = await generateWebsiteBrief(discovery);
console.log(JSON.stringify(result, null, 2));
