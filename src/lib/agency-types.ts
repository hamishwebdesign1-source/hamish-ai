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
export const AGENCY_TYPES = [
  {
    slug: "analytics",
    name: "AI Analytics",
    description: "Monthly performance reports, sold as a retainer.",
    services: ["Monthly performance reports", "Custom KPI dashboards", "One-off data audits"],
  },
  {
    slug: "automation",
    name: "AI Automation",
    description: "Booking, receptionist and workflow builds, sold as projects.",
    services: ["AI receptionist setup", "Booking automation", "Workflow automation"],
  },
  {
    slug: "lead-generation",
    name: "AI Lead Generation",
    description: "Qualified local prospects, sold directly to clients.",
    services: ["Qualified prospect lists", "Outreach campaigns", "Lead qualification"],
  },
] as const;

export type AgencyType = (typeof AGENCY_TYPES)[number];

export function findAgencyType(name: string | null | undefined): AgencyType | null {
  if (!name) return null;
  return AGENCY_TYPES.find((t) => t.name === name) ?? null;
}
