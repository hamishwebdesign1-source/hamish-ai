"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Phone, Mail, ChevronDown, ChevronUp, Lightbulb, LayoutTemplate, ClipboardList, BellRing } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { assignProspect } from "@/app/studio/(authed)/prospects/actions";
import { getLeadCadenceAction, leadNeedsFollowUp } from "@/lib/lead-status";
import type { Prospect, ProposalToken, TeamMember } from "./types";
import { DealValueControl } from "./deal-value-control";
import { PipelineStageControl } from "./pipeline-stage-control";
import { ContactTrackingControl } from "./contact-tracking-control";
import { RemoveProspectControl } from "./remove-prospect-control";
import { ConvertToClientControl } from "./convert-to-client-control";
import { ResearchTrigger, ResearchSummary } from "./research-summary";
import { WebsiteMockupSection } from "./website-mockup-section";
import { SalesKitSection } from "./sales-kit-section";

// Same shared inline-<select> chrome as requests-panel.tsx/
// projects-panel.tsx's own selectClasses.
const selectClasses =
  "h-7 rounded-lg border border-input bg-transparent px-2 text-[11px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProspectCard({
  prospect,
  selected,
  onToggleSelect,
  bookingLink,
  proposalToken,
  teamMembers,
}: {
  prospect: Prospect;
  selected: boolean;
  onToggleSelect: () => void;
  bookingLink: string | null;
  proposalToken: ProposalToken | null;
  teamMembers: TeamMember[];
}) {
  const [open, setOpen] = useState(false);
  const hasContact = prospect.phone || prospect.email;
  const [assignee, setAssignee] = useState(prospect.assigned_to ?? "");
  const [assignPending, startAssign] = useTransition();
  const [assignError, setAssignError] = useState<string | null>(null);

  function setProspectAssignee(next: string) {
    const prev = assignee;
    setAssignError(null);
    setAssignee(next);
    startAssign(async () => {
      const r = await assignProspect(prospect.id, next || null);
      if (r && "error" in r) {
        setAssignee(prev);
        setAssignError(r.error ?? "Failed to update — try again.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          {/* Studio improvement — bulk actions. Sibling to the toggle
              button rather than nested inside it (a checkbox inside a
              clickable row would fire both the toggle and the expand/
              collapse on one click) — same reasoning as clients-panel.tsx's
              website link using onClick={(e) => e.stopPropagation()}
              inside its own row button, just solved by not nesting at all
              here since this needs its own independent click target. */}
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${prospect.business_name}`}
            className="size-4 shrink-0 rounded border-border accent-accent"
          />
          {/* Studio big-ticket ("team collaboration") — same sibling-of-
              the-toggle-button reasoning as the checkbox above, and same
              gate as requests-panel.tsx's own assignee select: only
              meaningful once there's more than one person to hand this
              to. */}
          {teamMembers.length > 1 && (
            <div className="flex shrink-0 flex-col gap-1">
              <select
                value={assignee}
                onChange={(e) => setProspectAssignee(e.target.value)}
                disabled={assignPending}
                aria-label={`Assign ${prospect.business_name}`}
                className={selectClasses}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.email} value={m.email}>
                    {m.email}
                  </option>
                ))}
              </select>
              {assignError && <p className="text-[11px] text-destructive">{assignError}</p>}
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{prospect.business_name}</p>
                {/* score_breakdown.overall is the same average shown in the
                    expanded fit/need/value/confidence bars below — showing
                    the old, unrelated single-formula score here instead
                    would show two different numbers for "the score" on the
                    same card, which is exactly what happened before this
                    fix. Falls back to the old score only for a prospect
                    researched before score_breakdown existed. */}
                {(prospect.score_breakdown?.overall ?? prospect.score) !== null && (
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    score {prospect.score_breakdown?.overall ?? prospect.score}/5
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {[prospect.category, prospect.neighbourhood].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {leadNeedsFollowUp(prospect) && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                  <BellRing className="size-3 shrink-0" />
                  {getLeadCadenceAction(prospect) === "call" ? "Call due" : "Follow-up due"}
                </span>
              )}
              {prospect.status !== "converted" && (
                <Badge
                  variant={prospect.status === "qualified" ? "accent" : "secondary"}
                  className={`capitalize ${prospect.status === "lost" ? "opacity-60" : ""}`}
                >
                  {prospect.status.replace(/_/g, " ")}
                </Badge>
              )}
              {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </div>
          </button>
        </div>

        {open && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {prospect.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                  <a href={`tel:${prospect.phone}`} className="hover:text-accent">
                    {prospect.phone}
                  </a>
                </span>
              )}
              {prospect.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${prospect.email}`} className="hover:text-accent">
                    {prospect.email}
                  </a>
                </span>
              )}
              {prospect.website && (
                <a
                  href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-accent"
                >
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                  Website
                </a>
              )}
              {!hasContact && !prospect.website && (
                <span className="text-xs text-muted-foreground">No contact details found for this business yet.</span>
              )}
            </div>

            {prospect.research ? (
              <Tabs defaultValue="research">
                <TabsList>
                  <TabsTab value="research">
                    <Lightbulb className="size-3.5" /> Research
                  </TabsTab>
                  <TabsTab value="mockup">
                    <LayoutTemplate className="size-3.5" /> Website mockup
                  </TabsTab>
                  <TabsTab value="kit">
                    <ClipboardList className="size-3.5" /> Outreach kit
                  </TabsTab>
                </TabsList>
                <TabsPanel value="research">
                  <ResearchSummary research={prospect.research} scoreBreakdown={prospect.score_breakdown} />
                </TabsPanel>
                <TabsPanel value="mockup">
                  <WebsiteMockupSection prospect={prospect} />
                </TabsPanel>
                <TabsPanel value="kit">
                  <SalesKitSection prospect={prospect} bookingLink={bookingLink} proposalToken={proposalToken} />
                </TabsPanel>
              </Tabs>
            ) : (
              <ResearchTrigger prospectId={prospect.id} />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <DealValueControl prospect={prospect} />
              <PipelineStageControl prospect={prospect} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <ContactTrackingControl prospect={prospect} />
              <div className="flex items-center gap-2">
                <RemoveProspectControl prospect={prospect} />
                <ConvertToClientControl prospect={prospect} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
