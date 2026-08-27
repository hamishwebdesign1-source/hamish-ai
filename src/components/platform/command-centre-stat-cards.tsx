import type { ReactNode } from "react";
import { Search, Users, TrendingUp, PoundSterling, Activity, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HelpTip } from "@/components/platform/help-tip";
import { HealthRing } from "@/components/analytics/health-ring";
import { CountUp } from "@/components/platform/count-up";
import type { StatCardId } from "@/lib/command-centre-layout";
import type { ClientHealth } from "@/lib/client-health";
import type { HealthTrend } from "@/lib/studio-health-history";

// Real-improvement pass — extracted out of page.tsx (flagged at 1,197+
// lines, item #7 of the studio review's first batch, done partially
// there). This is the piece that batch left for later: statContent
// closes over exactly 5 real inputs, all plain data, nothing from the
// rest of the page's own closure — safe to turn into one real,
// parameterised function rather than an inline object literal.
//
// The one dark surface on an otherwise light page — reserved for this
// specifically, the same "one considered contrast moment, not a whole
// dark UI" call the marketing/signup redesigns already made (signup-
// brand-panel.tsx). HealthRing (analytics/health-ring.tsx) already
// exists and is already built for exactly this dark-card context (its
// center label uses text-primary-foreground) — reused here rather than
// a second ring implementation, same component the hero product panel
// and client detail pages already use. Every stat card uses this same
// dark language, not just Business Health — direct instruction to
// replicate that card's style across the whole page rather than keep
// it as the one dark exception.
//
// Business Health uses the same horizontal icon+number+label shape as
// every sibling here — a real, visible fix, not a stylistic preference:
// a previous vertical layout (header row, ring, then a driver breakdown
// stacked underneath) made this card visibly ~40% taller than its
// plain siblings in production, which read as broken. The driver
// breakdown itself wasn't dropped, just moved to where it has room to
// be useful — its own full-width health_breakdown section block, in
// the Overview tab (command-centre-section-cards.tsx).
export function buildStatContent(params: {
  agencyHealth: ClientHealth;
  healthTrend: HealthTrend | null;
  prospectCount: number | null;
  clientCount: number;
  pipelineValuePence: number;
}): Record<StatCardId, ReactNode> {
  const { agencyHealth, healthTrend, prospectCount, clientCount, pipelineValuePence } = params;

  return {
    health: (
      <Card className="h-full border-none bg-primary text-primary-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          {agencyHealth.healthScore === null ? (
            <>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Activity className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary-foreground/70">Not enough data yet</p>
                <p className="text-xs text-primary-foreground/50">Business Health</p>
              </div>
            </>
          ) : (
            <>
              <HealthRing score={agencyHealth.healthScore} size={44} strokeWidth={5} centerLabel={String(agencyHealth.healthScore)} />
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-xs text-primary-foreground/60">
                  Business Health
                  <HelpTip explanation="An average of real, measured components across your whole client roster — site uptime, on-time payment, work completed, requests moving, and pipeline conversion. Full breakdown in the Overview tab below. Once there's at least three weeks of history, you'll also see how the score has moved." />
                </p>
                {healthTrend ? (
                  <p
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      healthTrend.deltaValue > 0
                        ? "text-accent"
                        : healthTrend.deltaValue < 0
                          ? "text-destructive"
                          : "text-primary-foreground/50"
                    }`}
                  >
                    {healthTrend.deltaValue > 0 && <ArrowUp className="size-3 shrink-0" />}
                    {healthTrend.deltaValue < 0 && <ArrowDown className="size-3 shrink-0" />}
                    {healthTrend.deltaValue === 0 ? "No change" : `${healthTrend.deltaValue > 0 ? "+" : ""}${healthTrend.deltaValue}`} vs{" "}
                    {healthTrend.daysAgo}d ago
                  </p>
                ) : (
                  <p className="text-xs text-primary-foreground/40">See breakdown below</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    ),
    prospects: (
      <Card className="h-full border-none bg-primary text-primary-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Search className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              <CountUp value={prospectCount ?? 0} />
            </p>
            <p className="text-xs text-primary-foreground/60">Prospects found</p>
          </div>
        </CardContent>
      </Card>
    ),
    clients: (
      <Card className="h-full border-none bg-primary text-primary-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Users className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              <CountUp value={clientCount} />
            </p>
            <p className="text-xs text-primary-foreground/60">Clients</p>
          </div>
        </CardContent>
      </Card>
    ),
    conversion: (
      <Card className="h-full border-none bg-primary text-primary-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {prospectCount && prospectCount > 0 ? <CountUp value={Math.round((clientCount / prospectCount) * 100)} suffix="%" /> : "—"}
            </p>
            <p className="text-xs text-primary-foreground/60">Conversion rate</p>
          </div>
        </CardContent>
      </Card>
    ),
    pipeline: (
      <Card className="h-full border-none bg-primary text-primary-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <PoundSterling className="size-5" />
          </span>
          <div>
            {/* £0 is a real number (no active deals have a value estimate
                yet), not missing data — shown plainly rather than as a
                bare "—", which reads as an error next to real figures on
                the same row. Conversion rate's own "—" a few cards over
                is a different, genuine case: a rate is undefined with
                zero prospects to divide by, not just currently zero. */}
            <p className="font-heading text-2xl font-semibold tabular-nums">
              <CountUp value={Math.round(pipelineValuePence / 100)} prefix="£" />
            </p>
            <p className="text-xs text-primary-foreground/60">Pipeline value</p>
          </div>
        </CardContent>
      </Card>
    ),
  };
}
