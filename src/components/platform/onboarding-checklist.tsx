import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type ChecklistItem = { label: string; done: boolean; href: string };

// Studio UX pass (3 Sep 2026) — reported live (screenshot): the "Getting
// set up" card, stacked above "Your next best actions", pushed the
// tabbed sections below the fold on a still-onboarding org. First tried
// collapsing it behind an accordion; reported live again that wasn't
// the right fix — the ask was to stop it from sitting *above* Actions
// required at all, not to hide its contents. Reverted the accordion;
// see studio/(authed)/page.tsx's own comment for the actual fix (the
// two cards now sit side by side in a 2-column row instead of stacked).
export function OnboardingChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <Card className="border-none bg-card text-card-foreground">
      <CardContent className="p-5">
        <p className="text-xs font-semibold text-muted-foreground">Getting set up</p>
        <ul className="mt-4 space-y-2.5">
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
      </CardContent>
    </Card>
  );
}
