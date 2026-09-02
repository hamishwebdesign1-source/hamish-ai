"use client";

import { useState } from "react";
import Image from "next/image";
import { ChartColumn, Zap, Search, ArrowRight } from "lucide-react";

// /platform, third pass — shows the workflow itself changing per agency
// type (Find -> ... -> Invoice) rather than a "client receives" feature
// list, per the brief's own explicit example. Same three real agency
// types as before (platform-onboarding.ts's agencyType field).
//
// Real screenshots added 2 Sep 2026, same discipline as the homepage's
// own StudioTour: direct feedback asked for this section to be
// "improved with images," and the user picked "real product screenshot
// per agency type" over icon-only pills when asked. Each image is the
// real Studio screen that type's own flow actually runs on, captured
// live from the signed-in production account — not a mockup, not
// stock imagery:
// - Lead Generation reuses the same Prospects screenshot already
//   shown in StudioTour's own "Find" step (same file, not a duplicate
//   asset) — the flow's own first two steps (Find, Analyse) are
//   literally that screen.
// - Analytics shows the real Analytics dashboard — genuine KPI cards
//   and a populated "Prospects found over time" chart, not
//   illustrative data (the page's own subtitle says so).
// - Automation shows the embeddable chatbot section on a real client
//   card, already enabled and in real use ("1 message · last 30
//   days") — the most literal real "automation" in the product.
const agencyTypes = [
  {
    id: "analytics",
    name: "AI Analytics",
    icon: ChartColumn,
    flow: ["Find", "Analyse data", "Dashboard", "AI insights", "Report", "Invoice"],
    image: "/images/platform/agency-types/analytics.png",
    alt: "Studio's Analytics dashboard: real KPI cards — £0 revenue, 14 new prospects (+100%), 3 new clients (+100%), 0 requests handled — and a populated 'Prospects found over time' bar chart.",
  },
  {
    id: "automation",
    name: "AI Automation",
    icon: Zap,
    flow: ["Find", "Identify process", "Build automation", "Monitor", "Report", "Invoice"],
    image: "/images/platform/agency-types/automation.png",
    alt: "Studio's 'Chatbot for their website' section on a real client card: a live embeddable chatbot already enabled, showing '1 message · last 30 days' and the real embed script snippet.",
  },
  {
    id: "leadgen",
    name: "AI Lead Generation",
    icon: Search,
    flow: ["Find", "Analyse", "Outreach", "Qualify", "Deliver leads", "Report", "Invoice"],
    image: "/images/platform/studio-tour/01-find-prospects.png",
    alt: "Studio's Prospects screen: a location and category search form above a scored list of real leads — W Fitness (5/5), La Salle de Sport Paris Madeleine (4/5), Mufti Hairdressing (4/5) and Argus Fish Bar (4/5) — each marked Needs Verification.",
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
      <div className="tab-panel-enter" key={type.id}>
        <div className="relative aspect-[1568/745] border-b border-border bg-secondary/60">
          <Image src={type.image} alt={type.alt} fill sizes="(min-width: 1024px) 700px, 100vw" className="object-cover object-top" />
          <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 font-mono text-[9px] tracking-[0.15em] text-muted-foreground uppercase shadow-sm backdrop-blur">
            Real Studio screenshot
          </span>
        </div>
        <div className="p-5 md:p-6">
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
    </div>
  );
}
