import { ArrowUp, ArrowDown } from "lucide-react";
import { HealthRing } from "@/components/analytics/health-ring";
import { HelpTip } from "@/components/platform/help-tip";
import type { ClientHealth } from "@/lib/client-health";
import type { HealthTrend } from "@/lib/studio-health-history";

// Studio UX pass (3 Sep 2026) — reported live (screenshot): Business
// Health, previously one of 5 cards in the stat row, was structurally
// different from its siblings (a ring plus two lines of text, vs. a
// plain icon plus one number and one label) — every attempt to
// reconcile their heights (first items-start, then a forced stretch)
// was really just fighting that shape mismatch, not fixing it. Moved
// out of the stat row entirely into the page's own header, beside the
// greeting, where it reads as what it actually is — an at-a-glance
// score for the whole agency, not a fifth stat next to four counts. No
// card chrome (background, padding, border) here on purpose, per the
// same "no unneeded whitespace" instruction — it sits directly in the
// header row, not in a box competing with it for space. The remaining
// 4 stat cards, now uniform in shape as well as content, no longer
// need any stretch logic to look consistent as a row.
export function CommandCentreHealthBadge({
  agencyHealth,
  healthTrend,
}: {
  agencyHealth: ClientHealth;
  healthTrend: HealthTrend | null;
}) {
  if (agencyHealth.healthScore === null) return null;

  return (
    <div className="flex shrink-0 items-center gap-3">
      <HealthRing score={agencyHealth.healthScore} size={44} strokeWidth={5} centerLabel={String(agencyHealth.healthScore)} tone="card" />
      <div className="min-w-0 text-right">
        <p className="flex items-center justify-end gap-1 text-xs font-medium text-foreground">
          Business Health
          <HelpTip explanation="An average of real, measured components across your whole client roster — site uptime, on-time payment, work completed, requests moving, and pipeline conversion. Full breakdown in the Overview tab below. Once there's at least three weeks of history, you'll also see how the score has moved." />
        </p>
        {healthTrend && (
          <p
            className={`flex items-center justify-end gap-0.5 text-xs font-medium ${
              healthTrend.deltaValue > 0
                ? "text-accent"
                : healthTrend.deltaValue < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {healthTrend.deltaValue > 0 && <ArrowUp className="size-3 shrink-0" />}
            {healthTrend.deltaValue < 0 && <ArrowDown className="size-3 shrink-0" />}
            {healthTrend.deltaValue === 0 ? "No change" : `${healthTrend.deltaValue > 0 ? "+" : ""}${healthTrend.deltaValue}`} vs{" "}
            {healthTrend.daysAgo}d ago
          </p>
        )}
      </div>
    </div>
  );
}
