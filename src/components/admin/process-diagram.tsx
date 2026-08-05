"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const DIAGRAM = `
flowchart TD
    subgraph LG["1 &middot; Lead Generation"]
        direction TB
        A1["Weekly scheduled research task<br/>Central Belt of Scotland"] --> A2[("prospects table")]
        A2 --> A3{"Verified &amp; scored?"}
        A3 -->|"not yet"| A2
        A3 -->|"ready"| A4["AI-drafted outreach email<br/>category-matched case study"]
        A4 --> A5["Hamish sends via Gmail"]
        A5 --> A6{"Replied within 5 days?"}
        A6 -->|"no"| A7["Flagged: needs follow-up"]
        A7 --> A4
        A6 -->|"yes, signs on"| B1
    end

    subgraph ON["2 &middot; Client Onboarding"]
        direction TB
        B1["Hamish adds client record"] --> B2["Portal access invited by email<br/>owner + team members, no public sign-up"]
        B1 --> B3["Maintenance set<br/>none / one-off invoicing / Stripe subscription"]
    end

    subgraph RQ["3 &middot; Request Handling &amp; Fulfillment"]
        direction TB
        C1["Client submits request<br/>via portal"] --> C3["AI triage<br/>category, complexity, priority"]
        C2["Client emails Hamish directly"] -->|"daily inbox cron"| C3
        C3 --> C4{"Confidence &amp; maintenance coverage?"}
        C4 -->|"high confidence + covered"| C5["Reply auto-sent to client"]
        C4 -->|"missing info"| C6["awaiting_info<br/>questions shown to client"]
        C6 -->|"client replies"| C1
        C4 -->|"needs real work"| C7["Task created"]
        C7 --> C8["Calendar event added<br/>due date set by priority"]
        C8 --> C9["Hamish completes the work"]
        C9 --> C10["Client emailed: done"]
    end

    subgraph SP["4 &middot; Client Support"]
        direction TB
        D1["Client asks a question in portal"] --> D2["Knowledge base lookup"]
        D2 --> D3["AI-drafted instant answer"]
    end

    subgraph SM["5 &middot; Site Monitoring"]
        direction TB
        E1["Daily site-check cron"] --> E2{"Issue found?"}
        E2 -->|"down / SSL / broken links"| E3["Alert emailed to Hamish"]
        E2 -->|"healthy"| E4["Summary shown in portal"]
    end

    subgraph BL["6 &middot; Billing"]
        direction TB
        F0["Recurring: Stripe subscription<br/>at the client's own custom rate"] --> F2
        F1["One-off: Hamish creates invoice"] --> F2["Stripe invoice created &amp; finalized"]
        F2 --> F3["Client emailed payment link"]
        F3 --> F4{"Paid before due date?"}
        F4 -->|"yes"| F5["Stripe webhook marks paid"]
        F4 -->|"overdue"| F6["Reminder email sent"]
        F6 --> F3
        F5 --> F7["Status visible in portal billing page"]
        F7 --> F8["Client manages cards &amp; history<br/>via Stripe Customer Portal"]
    end

    subgraph OV["7 &middot; Daily Overview &amp; Accountability"]
        direction TB
        G1["Overdue invoices"]
        G2["Requests stuck on awaiting_info"]
        G3["Leads needing follow-up"]
        G4["Site issues"]
        G1 --> G5["/admin Overview dashboard"]
        G2 --> G5
        G3 --> G5
        G4 --> G5
        G6["Every admin action logged<br/>/admin/activity-log"]
    end

    B2 --> C1
    B2 --> D1
    B3 --> F0
    C6 -.->|"flags"| G2
    F6 -.->|"flags"| G1
    A7 -.->|"flags"| G3
    E3 -.->|"flags"| G4
    B1 -.->|"logs"| G6
    B3 -.->|"logs"| G6
    F0 -.->|"logs"| G6
    F1 -.->|"logs"| G6
`;

export function ProcessDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mermaid = (await import("mermaid")).default;
      // mermaid's color parser needs concrete color values, not CSS custom
      // properties — it can't resolve var(--foo) itself. These are picked to
      // match the app's light-mode neutrals rather than wired to the theme.
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          fontFamily: "var(--font-sans)",
          primaryColor: "#ffffff",
          primaryTextColor: "#18181b",
          primaryBorderColor: "#d4d4d8",
          lineColor: "#71717a",
          secondaryColor: "#f4f4f5",
          tertiaryColor: "#f4f4f5",
          clusterBkg: "#f4f4f5",
          clusterBorder: "#d4d4d8",
          edgeLabelBackground: "#ffffff",
          fontSize: "14px",
        },
        flowchart: { curve: "basis", htmlLabels: true, padding: 16 },
      });

      try {
        const { svg } = await mermaid.render(`process-diagram-${id}`, DIAGRAM);
        if (!cancelled && containerRef.current) containerRef.current.innerHTML = svg;
      } catch (e) {
        console.error("Failed to render process diagram:", e);
        if (!cancelled) setError("Couldn't render the diagram.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <Button
          type="button"
          size="icon-xs"
          variant="outline"
          onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))}
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <Button type="button" size="icon-xs" variant="outline" onClick={() => setZoom(1)}>
          <RotateCcw className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="outline"
          onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}
        >
          <ZoomIn className="size-3.5" />
        </Button>
        <span className="ml-1 font-mono text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
      </div>
      <div className="overflow-auto rounded-xl border border-border bg-card p-6">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div
            ref={containerRef}
            style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.15s ease" }}
          />
        )}
      </div>
    </div>
  );
}
