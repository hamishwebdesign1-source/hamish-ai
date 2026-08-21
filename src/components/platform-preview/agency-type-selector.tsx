"use client";

import { useState } from "react";
import { ChartColumn, Zap, Search, ArrowRight } from "lucide-react";

// /platform, third pass — shows the workflow itself changing per agency
// type (Find -> ... -> Invoice) rather than a "client receives" feature
// list, per the brief's own explicit example. Same three real agency
// types as before (platform-onboarding.ts's agencyType field).
const agencyTypes = [
  {
    id: "analytics",
    name: "AI Analytics",
    icon: ChartColumn,
    flow: ["Find", "Analyse data", "Dashboard", "AI insights", "Report", "Invoice"],
  },
  {
    id: "automation",
    name: "AI Automation",
    icon: Zap,
    flow: ["Find", "Identify process", "Build automation", "Monitor", "Report", "Invoice"],
  },
  {
    id: "leadgen",
    name: "AI Lead Generation",
    icon: Search,
    flow: ["Find", "Analyse", "Outreach", "Qualify", "Deliver leads", "Report", "Invoice"],
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
        <div className="flex flex-wrap items-center gap-2">
          {type.flow.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium">{step}</span>
              {i < type.flow.length - 1 && <ArrowRight className="size-3.5 shrink-0 text-border" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
