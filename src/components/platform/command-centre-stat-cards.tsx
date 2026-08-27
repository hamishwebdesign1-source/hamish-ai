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
// UX/UI Director audit (2026-08) — these 5 stat cards used to share the
// same bg-primary/text-primary-foreground treatment as TodayStrip and
// every section card, flattening the whole Command Centre into one
// visual tier: "your most urgent action right now" and "a nice-to-know
// stat" rendered identically. bg-primary/text-primary-foreground is now
// reserved for exactly two surfaces (TodayStrip, the actions_required
// section card) — the two things genuinely meant to read as "look here
// first." These stat cards use plain bg-card/text-card-foreground
// instead, same as every other Studio card (clients-panel.tsx,
// campaigns-panel.tsx). HealthRing (analytics/health-ring.tsx) keeps
// its own hardcoded text-primary-foreground center label unchanged —
// still correct here since .studio-shell keeps both --card and
// --primary as similarly dark surfaces (see globals.css), and HealthRing
// is reused as-is on other genuinely-primary surfaces elsewhere (hero
// product panel, client detail pages).
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
      <Card className="h-full border-none bg-card text-card-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          {agencyHealth.healthScore === null ? (
            <>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Activity className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Not enough data yet</p>
                <p className="text-xs text-muted-foreground">Business Health</p>
              </div>
            </>
          ) : (
            <>
              <HealthRing score={agencyHealth.healthScore} size={44} strokeWidth={5} centerLabel={String(agencyHealth.healthScore)} />
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
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
                          : "text-muted-foreground"
                    }`}
                  >
                    {healthTrend.deltaValue > 0 && <ArrowUp className="size-3 shrink-0" />}
                    {healthTrend.deltaValue < 0 && <ArrowDown className="size-3 shrink-0" />}
                    {healthTrend.deltaValue === 0 ? "No change" : `${healthTrend.deltaValue > 0 ? "+" : ""}${healthTrend.deltaValue}`} vs{" "}
                    {healthTrend.daysAgo}d ago
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">See breakdown below</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    ),
    prospects: (
      <Card className="h-full border-none bg-card text-card-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Search className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              <CountUp value={prospectCount ?? 0} />
            </p>
            <p className="text-xs text-muted-foreground">Prospects found</p>
          </div>
        </CardContent>
      </Card>
    ),
    clients: (
      <Card className="h-full border-none bg-card text-card-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Users className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              <CountUp value={clientCount} />
            </p>
            <p className="text-xs text-muted-foreground">Clients</p>
          </div>
        </CardContent>
      </Card>
    ),
    conversion: (
      <Card className="h-full border-none bg-card text-card-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {prospectCount && prospectCount > 0 ? <CountUp value={Math.round((clientCount / prospectCount) * 100)} suffix="%" /> : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Conversion rate</p>
          </div>
        </CardContent>
      </Card>
    ),
    pipeline: (
      <Card className="h-full border-none bg-card text-card-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
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
            <p className="text-xs text-muted-foreground">Pipeline value</p>
          </div>
        </CardContent>
      </Card>
    ),
  };
}
