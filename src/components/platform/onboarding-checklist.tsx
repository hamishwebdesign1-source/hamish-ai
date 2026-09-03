"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

type ChecklistItem = { label: string; done: boolean; href: string };

// Studio UX pass (3 Sep 2026) — reported live (screenshot): the "Getting
// set up" card stayed fully expanded on every Command Centre visit for a
// still-onboarding org, pushing everything below it (Actions required,
// the tabbed sections) down by a fixed ~180px regardless of how much was
// already done. Collapsed by default behind a real progress summary
// ("n of 4 done") instead, using the same Accordion primitive
// help-faq-list.tsx already established for this pattern — same real
// items, hrefs and done-state as before, just not forced open every
// time. A genuinely new org (0 of 4) still opens it in one click; an org
// down to its last item sees exactly how close it is without scrolling
// past three struck-through rows to find it.
export function OnboardingChecklist({ items }: { items: ChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length;

  return (
    <Card className="mt-6 border-none bg-card text-card-foreground">
      <CardContent className="p-5">
        <Accordion>
          <AccordionItem value="checklist" className="border-none">
            <AccordionTrigger className="text-xs font-semibold text-muted-foreground">
              Getting set up · {doneCount} of {items.length} done
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2.5 pt-1.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 text-sm ${item.done ? "text-muted-foreground" : "hover:text-accent"}`}
                    >
                      {item.done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-accent" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                      )}
                      <span className={item.done ? "line-through" : ""}>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
