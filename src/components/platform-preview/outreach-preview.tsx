"use client";

import { useState } from "react";
import { Mail, Phone, Network } from "lucide-react";

// /platform hero rebuild, section 04 from the brief ("turn insight into
// outreach"). Same fictional prospect as the hero's AI Business Analysis
// panel (Edinburgh Dental) — deliberately the same business flowing
// through both panels so the page tells one continuous story instead of
// two disconnected illustrations of unrelated ideas.

const channels = [
  {
    id: "email",
    label: "Email",
    icon: Mail,
    subject: "A few things about Edinburgh Dental's website",
    body: "Hi Sarah — came across Edinburgh Dental researching local practices, and like what you're doing with the range of treatments. Noticed your booking journey has a couple of extra steps that might be costing you enquiries, and there's no way for anyone browsing out of hours to get a quick answer. Worth a 15-minute call to show you what we found?",
  },
  {
    id: "call",
    label: "Call script",
    icon: Phone,
    subject: "Opening line",
    body: "Hi, is this Sarah? I'm calling because I was looking at dental practices around Edinburgh and yours came up — I noticed a couple of things on your website that might be costing you new-patient enquiries specifically outside office hours. Have you got two minutes?",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Network,
    subject: "Connection message",
    body: "Hi Sarah — spotted Edinburgh Dental's site while researching local practices. A couple of quick wins I noticed for capturing more enquiries outside office hours — happy to share if useful, no pitch attached.",
  },
];

export function OutreachPreview() {
  const [active, setActive] = useState(channels[0].id);
  const channel = channels.find((c) => c.id === active) ?? channels[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-black/5">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/40 px-4 py-3">
        <p className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground uppercase">Generated from the analysis above</p>
        <span className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">Illustrative example</span>
      </div>

      <div className="flex gap-1 border-b border-border px-3 py-2">
        {channels.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              active === c.id ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <c.icon className="size-3.5" />
            {c.label}
          </button>
        ))}
      </div>

      <div className="tab-panel-enter p-4 md:p-5" key={channel.id}>
        <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">{channel.id === "email" ? "Subject" : channel.subject}</p>
        {channel.id === "email" && <p className="mt-1 text-sm font-medium">{channel.subject}</p>}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{channel.body}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          Personalised for <span className="font-medium text-foreground">Edinburgh Dental</span>, ready to send under your own name — not a
          template with the blanks filled in.
        </p>
      </div>
    </div>
  );
}
