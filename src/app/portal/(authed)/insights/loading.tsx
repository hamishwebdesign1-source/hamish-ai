// Shaped to match InsightsCentre's actual layout (dark panel, tab bar,
// health ring + stat row, two chart panels) rather than the generic
// portal skeleton — so the loading state doesn't visibly jump into a
// completely different shape once the real data lands.
export default function InsightsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-28 rounded-md bg-secondary" />
      <div className="mt-2 h-4 w-80 max-w-full rounded-md bg-secondary" />

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-primary/95">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="h-3 w-32 rounded bg-primary-foreground/10" />
          <div className="h-3 w-40 rounded bg-primary-foreground/10" />
        </div>
        <div className="flex gap-2 border-b border-white/10 px-3 py-2">
          <div className="h-8 w-24 rounded-lg bg-primary-foreground/10" />
          <div className="h-8 w-24 rounded-lg bg-primary-foreground/5" />
          <div className="h-8 w-24 rounded-lg bg-primary-foreground/5" />
          <div className="h-8 w-24 rounded-lg bg-primary-foreground/5" />
        </div>
        <div className="p-5 md:p-6">
          <div className="flex flex-col items-center gap-6 border-b border-white/10 pb-8 sm:flex-row">
            <div className="size-[140px] shrink-0 rounded-full bg-primary-foreground/10" />
            <div className="w-full space-y-2">
              <div className="h-3 w-40 rounded bg-primary-foreground/10" />
              <div className="h-5 w-full max-w-md rounded bg-primary-foreground/10" />
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-primary-foreground/5" />
            ))}
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="h-52 rounded-xl bg-primary-foreground/5" />
            <div className="h-52 rounded-xl bg-primary-foreground/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
