"use client";

import { useState, useTransition } from "react";

// BACKLOG.md "Consolidate the 4 duplicated assignee-select components
// into one shared control" — Prospects (prospect-card.tsx), Requests
// (requests-panel.tsx), Projects (project-assignee-control.tsx), and
// Website Builder (website-project-assignee-control.tsx) each
// independently reimplemented the same optimistic-set/rollback/error
// shape around their own assignEntityX() Server Action. Same gate
// every site already used (only meaningful once there's more than one
// person to hand this to), same rollback-on-error behaviour, same
// "Unassigned" option.
//
// Two real, deliberately-kept visual shapes, not a bug to force into
// one: `label` renders a visible "Assigned to" wrapper (the two
// dedicated-page controls, ProjectAssigneeControl/
// WebsiteProjectAssigneeControl, room to spare in a sidebar/detail
// page); omitted, it renders a bare select — the two in-card controls
// (ProspectCard/RequestCard), where space is tight and the aria-label
// alone already carries accessibility. Error text is normalised to
// text-xs everywhere — the two in-card sites previously used
// text-[11px], a 1px difference not worth a prop.
const selectClasses =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type AssigneeSelectTeamMember = { email: string; role: "owner" | "member" };

export function AssigneeSelect({
  value,
  onAssign,
  teamMembers,
  ariaLabel,
  label,
  className,
}: {
  value: string | null;
  onAssign: (assigneeEmail: string | null) => Promise<{ error?: string } | Record<string, unknown> | undefined | void>;
  teamMembers: AssigneeSelectTeamMember[];
  ariaLabel: string;
  // Visible label text (e.g. "Assigned to") — renders a bare select
  // with only the aria-label when omitted.
  label?: string;
  className?: string;
}) {
  const [assignee, setAssignee] = useState(value ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Only meaningful once there's more than one person to hand this to —
  // same gate every site already used.
  if (teamMembers.length <= 1) return null;

  function setAssigneeValue(next: string) {
    const prev = assignee;
    setError(null);
    setAssignee(next);
    startTransition(async () => {
      const r = await onAssign(next || null);
      if (r && "error" in r) {
        setAssignee(prev);
        setError((r.error as string | undefined) ?? "Failed to update — try again.");
      }
    });
  }

  const select = (
    <select
      value={assignee}
      onChange={(e) => setAssigneeValue(e.target.value)}
      disabled={pending}
      aria-label={ariaLabel}
      className={className ?? selectClasses}
    >
      <option value="">Unassigned</option>
      {teamMembers.map((m) => (
        <option key={m.email} value={m.email}>
          {m.email}
        </option>
      ))}
    </select>
  );

  if (label) {
    return (
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {label}
          {select}
        </label>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col gap-1">
      {select}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
