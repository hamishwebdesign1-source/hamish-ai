"use client";

import { PROJECT_STAGES } from "@/lib/project-stages";

// Projects Kanban Command Centre, Phase A — the one "change stage"
// control, reused in three places per the design spec: the mobile
// per-stage accordion's cards (no drag attempted on mobile), the detail
// page's header quick-change control, and (via the same underlying
// markup) the bulk "Move N to…" bar. Deliberately dumb/controlled — the
// caller owns the actual state + Server Action call, since each of those
// three contexts needs a different state-management shape around it
// (the shared board-level useOptimistic on mobile, a small hand-rolled
// optimistic control on the detail page, a Promise.all bulk loop here).
export function ProjectStageSelect({
  stage,
  onChange,
  disabled,
  error,
  label = "Change project stage",
  className = "",
}: {
  stage: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  error?: string | null;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <select
        value={stage}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {PROJECT_STAGES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
