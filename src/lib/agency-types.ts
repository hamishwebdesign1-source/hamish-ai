// Studio big-ticket ("agency-type templates correctness gap") — was
// defined only inside onboarding-wizard.tsx (a "use client" component),
// so nothing server-side could ever read it back structurally. Extracted
// here, unchanged, so draft-sales-kit.ts can use the *real* type a tenant
// picked at signup to shape their own outreach voice — the actual,
// previously-missing behavioural difference behind "agency type
// templates" (platform-plans.ts's own marketed feature). The onboarding
// wizard's own selector now imports this instead of defining its own copy.
//
// prospecting_config.agencyType (platform-onboarding.ts) stores the real
// `name` string here, not the slug — findAgencyType() below looks up by
// that same field for exactly that reason.
// Content enrichment pass — the three business models had a one-line
// `description` each and nothing else anywhere in the product explaining
// what they actually mean or how Studio supports delivering one. A
// tenant picked one at signup, in a wizard step that's never seen again
// (agencyType is otherwise only ever read by draft-sales-kit.ts, to
// shape AI-generated outreach voice — never displayed back to the
// tenant). New `howItWorks` below is deliberately honest about the
// boundary: what Studio actually does for each model (real features,
// real page names) versus what the tenant brings themselves (the actual
// service delivery, which this platform doesn't do for you) — same
// "real data or nothing" discipline as everywhere else in this app,
// applied to a claim about what the product itself does rather than a
// number.
export const AGENCY_TYPES = [
  {
    slug: "analytics",
    name: "AI Analytics",
    description: "Monthly performance reports, sold as a retainer.",
    services: ["Monthly performance reports", "Custom KPI dashboards", "One-off data audits"],
    howItWorks: [
      "You deliver the actual analytics work yourself — connecting to a client's real data and building the reports or dashboards they're paying for. Studio doesn't build that for you; it's built to run the retainer relationship around it.",
      "Convert a qualified prospect to a client, then set a recurring monthly rate in Clients — Studio starts a real Stripe subscription, so you're billed automatically every month instead of chasing one-off invoices.",
      "Monthly Reports generates a real snapshot of your own delivery every month automatically — health score, requests handled, tasks completed, uptime — a branded PDF you can send alongside your own analytics work as proof you're actively managing the relationship.",
      "Turn on Competitive intel (Settings) for a client and you get one genuinely current, real finding about their competitors each month — a natural, low-effort addition to a retainer report.",
    ],
  },
  {
    slug: "automation",
    name: "AI Automation",
    description: "Booking, receptionist and workflow builds, sold as projects.",
    services: ["AI receptionist setup", "Booking automation", "Workflow automation"],
    howItWorks: [
      "You're selling a finished thing — an AI receptionist, a booking flow, a workflow build — not an ongoing retainer, so most work here is billed as a one-off project invoice rather than a subscription.",
      "The embedded chatbot (turn it on from a client's own card in Clients) is a real, literal AI receptionist: it answers FAQs from their Knowledge Base, and takes a visitor's contact details as a real lead the moment it can't.",
      "Website Builder is where a lot of the actual delivery happens if the project includes their site — Discovery through Launch, a real AI coding tool doing the build, and a prompt library for every refinement ask along the way.",
      "Track the build itself in Projects, with a target date and real task-level progress — useful even for a one-off project, so nothing silently slips before handover.",
    ],
  },
  {
    slug: "lead-generation",
    name: "AI Lead Generation",
    description: "Qualified local prospects, sold directly to clients.",
    services: ["Qualified prospect lists", "Outreach campaigns", "Lead qualification"],
    howItWorks: [
      "This is the one agency type where Studio's own core engine genuinely is the product you're selling — Prospects finds and scores real local businesses matching whatever your client's own target market is, the same AI research every other agency type uses for their own pipeline.",
      "Group a push under a Campaign so you can show a client real contact and reply rates for exactly what you ran for them, not your whole pipeline blended together.",
      "Sales kits generate a full outreach package per lead in one AI call — email, follow-up, call script, LinkedIn message, meeting agenda — grounded in real research, ready to hand over or run yourself.",
      "Autonomous outreach (opt-in, Settings) automates one real step of the follow-up cadence — a follow-up email after a call with no reply — so a lead doesn't quietly go cold while you're focused elsewhere.",
    ],
  },
] as const;

export type AgencyType = (typeof AGENCY_TYPES)[number];

export function findAgencyType(name: string | null | undefined): AgencyType | null {
  if (!name) return null;
  return AGENCY_TYPES.find((t) => t.name === name) ?? null;
}
