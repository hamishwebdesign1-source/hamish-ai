"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Website Builder launch handoff (BACKLOG.md, 2026-09-11, "Design, part B")
// — the real "what's next" moment the moment a build reaches `launched`.
// LaunchPanel's job is "record where it's live"; this component's job is
// "now that it is, here's what to do" — kept as a separate component
// rather than folded into LaunchPanel, same reasoning DECISIONS.md
// records for that split.
//
// Every status below is real data read by WebsiteProjectDetailPage
// (website-builder/[id]/page.tsx) — no decorative "here's 4 things you
// could do" list. Each row deep-links into the Clients page's own
// already-real controls (?client=<id>, ClientsPanel's own auto-expand +
// scroll) rather than duplicating chatbot/portal-invite/report controls
// here — see DESIGN-SYSTEM.md's "route to the Clients page, don't
// reinvent it."
type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  status: string;
  href: string;
  cta: string;
};

export function PostLaunchChecklist({
  clientId,
  chatbotEnabled,
  portalMemberCount,
  stripeConnected,
  reportSentThisMonth,
}: {
  clientId: string;
  chatbotEnabled: boolean;
  portalMemberCount: number;
  stripeConnected: boolean;
  reportSentThisMonth: boolean;
}) {
  const clientsLink = `/studio/clients?client=${clientId}`;

  const items: ChecklistItem[] = [
    {
      id: "chatbot",
      label: "Set up their AI chatbot",
      done: chatbotEnabled,
      status: chatbotEnabled ? "Enabled and live on their site." : "Not set up yet.",
      href: clientsLink,
      cta: "Set up",
    },
    {
      id: "portal",
      label: "Invite their team to the portal",
      done: portalMemberCount > 0,
      status:
        portalMemberCount > 0
          ? `${portalMemberCount} team member${portalMemberCount === 1 ? "" : "s"} invited.`
          : "No one invited yet.",
      href: clientsLink,
      cta: "Invite",
    },
    {
      id: "stripe",
      label: "Connect Stripe billing",
      done: stripeConnected,
      // Org-level, not client-level — flagged directly (DECISIONS.md,
      // 2026-09-11) rather than left implicit: this row reads
      // organisations.stripe_connect_charges_enabled, so it shows "not
      // done" on every client's checklist until the org connects Stripe
      // once, not just clients who specifically need billing.
      //
      // UX/UI Director visual re-review (2026-09-11): the original copy
      // ("this is org-wide, not just this client") read as a defensive
      // caveat trailing the real status, easy to skim past or misread as
      // an apology for something broken. Leads with the same plain "not
      // done" fact, then frames the org-wide part as the reason it's a
      // one-time thing rather than a disclaimer.
      status: stripeConnected ? "Connected — you can invoice clients." : "Not connected yet — a one-time, org-wide setup, not specific to this client.",
      href: "/studio/settings",
      cta: "Connect",
    },
    {
      id: "report",
      label: "Send their first report",
      done: reportSentThisMonth,
      status: reportSentThisMonth ? "Sent this month." : "Not sent yet this month.",
      href: clientsLink,
      cta: "Generate",
    },
  ];

  const allDone = items.every((item) => item.done);
  const remaining = items.filter((item) => !item.done).length;
  // Collapsible panel pattern (DESIGN-SYSTEM.md) — expanded by default
  // while there's real work left, collapses to a compact summary once
  // everything's genuinely done (still reopenable on a later revisit),
  // never permanent clutter on a page an agency keeps reopening.
  const [open, setOpen] = useState(!allDone);

  return (
    <Card className="border-accent/40">
      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2 font-heading text-sm font-semibold">
            <ListChecks className="size-4 shrink-0 text-accent" /> What&apos;s next
          </span>
          {open ? <ChevronUp className="size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
        </button>

        {!open && (
          <p className="text-xs text-muted-foreground">
            {allDone ? "All done — chatbot, portal, billing, and reporting are all set up." : `${remaining} of ${items.length} still to do.`}
          </p>
        )}

        {open && (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {item.done ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.status}</p>
                  </div>
                </div>
                {/* UX/UI Director visual re-review (2026-09-11): `size="xs"`
                    (h-6) is DESIGN-SYSTEM.md's own "compact, dense-row"
                    tier, not a page's primary action — but this card's
                    entire job is being the one genuinely helpful guided
                    moment after a real launch, and each of these 4 buttons
                    *is* the primary action for its row, not an incidental
                    inline control. `sm` reads as a real next step rather
                    than a minor aside, at a small, real, self-contained
                    cost (one size step, no layout change). */}
                <Button size="sm" variant="outline" className="shrink-0" render={<Link href={item.href} />}>
                  {item.cta}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
