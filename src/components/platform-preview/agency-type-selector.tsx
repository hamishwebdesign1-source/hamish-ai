"use client";

import { useState } from "react";
import { ChartColumn, Zap, Search, Check } from "lucide-react";

// /platform, second pass — replaces the static three-card "Choose what
// your agency sells" grid. Same three real agency types
// (platform-onboarding.ts's agencyType field), now one compact
// component instead of three large sections — clicking a type swaps
// what the client receives, communicating three business models without
// three walls of text.
const agencyTypes = [
  {
    id: "analytics",
    name: "AI Analytics",
    icon: ChartColumn,
    tagline: "Monthly performance reports, sold as a retainer.",
    receives: ["Live dashboards", "AI-written insights", "Monthly reports", "Recommendations"],
  },
  {
    id: "automation",
    name: "AI Automation",
    icon: Zap,
    tagline: "Booking, receptionist and workflow builds, sold as projects.",
    receives: ["AI workflows", "An AI assistant or receptionist", "Automated processes", "Ongoing optimisation"],
  },
  {
    id: "leadgen",
    name: "AI Lead Generation",
    icon: Search,
    tagline: "Qualified local prospects, sold directly to clients.",
    receives: ["Qualified opportunities", "Personalised outreach", "A live lead pipeline", "Lead reporting"],
  },
] as const;

type AgencyTypeId = (typeof agencyTypes)[number]["id"];

export function AgencyTypeSelector() {
  const [active, setActive] = useState<AgencyTypeId>("leadgen");
  const type = agencyTypes.find((t) => t.id === active) ?? agencyTypes[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-lg shadow-black/5">
      <div className="grid gap-1 border-b border-border bg-secondary/40 p-2 sm:grid-cols-3">
        {agencyTypes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              active === t.id ? "bg-background text-accent shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="size-4 shrink-0" />
            {t.name}
          </button>
        ))}
      </div>
      <div className="tab-panel-enter p-5 md:p-6" key={type.id}>
        <p className="text-sm text-muted-foreground">{type.tagline}</p>
        <p className="mt-4 font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground uppercase">Client receives</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {type.receives.map((r) => (
            <li key={r} className="flex items-center gap-2 text-sm">
              <Check className="size-3.5 shrink-0 text-accent" />
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
