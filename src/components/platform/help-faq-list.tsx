"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

type Faq = { q: string; a: string };

// Content enrichment pass — this page grew from 10 to 22+ FAQ entries in
// the same pass that added this search bar; scanning a flat list that
// size started to work against the page's own point (finding an answer
// fast). Same client-side-over-already-loaded-rows search pattern as
// every other list page in Studio (prospecting-panel.tsx, knowledge-
// panel.tsx, requests-panel.tsx) — no new query, just narrowing what's
// already on the page.
export function HelpFaqList({ faqs }: { faqs: Faq[] }) {
  const [search, setSearch] = useState("");
  const searchLower = search.trim().toLowerCase();
  const visible = searchLower ? faqs.filter((f) => f.q.toLowerCase().includes(searchLower) || f.a.toLowerCase().includes(searchLower)) : faqs;

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search help articles…" className="h-9 pl-8 text-sm" />
      </div>

      <div className="mt-4">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No help articles match that search — try a different term, or email us below.
          </div>
        ) : (
          <Accordion>
            {visible.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-sm font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
