import { aiSolutions } from "@/lib/ai-solutions-data";

const KEYWORD_MAP: { keywords: string[]; slug: string }[] = [
  { keywords: ["restaurant", "cafe", "café", "menu", "food"], slug: "customer-assistant" },
  { keywords: ["hotel", "salon", "clinic", "gym", "appointment", "booking"], slug: "receptionist" },
  { keywords: ["trade", "plumber", "electrician", "joiner", "estate agent", "quote"], slug: "sales-assistant" },
  { keywords: ["staff", "policy", "handbook", "onboarding"], slug: "knowledge-assistant" },
  { keywords: ["social media", "content", "blog", "marketing", "email campaign"], slug: "content-automation" },
  { keywords: ["sales data", "analytics", "report", "which products", "dashboard"], slug: "analytics-assistant" },
];

export function getFallbackReply(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  const match = KEYWORD_MAP.find((m) => m.keywords.some((k) => lower.includes(k)));
  const solution = match ? aiSolutions.find((s) => s.slug === match.slug) : undefined;

  const intro =
    "🤖 Demo mode — this is a scripted preview, not live AI yet (an ANTHROPIC_API_KEY needs to be added for real conversation).";

  if (solution) {
    return `${intro}\n\nBased on what you mentioned, here's a relevant example — ${solution.name}: ${solution.description}\n\nWant to see this properly working? Book a free AI consultation and we'll show you.`;
  }

  return `${intro}\n\nTell me what type of business you run — restaurant, hotel, trades, salon, gym, professional service, or retail — and I'll show you a relevant AI example.`;
}
