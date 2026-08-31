// Route-specific — Prospects is filter-bar-plus-list-shaped (usage card,
// niche config card, then a search/filter bar above a list of prospect
// rows), not stat-card-shaped like the shared (authed)/loading.tsx this
// replaces for this one route. Same plain pulsing bg-secondary block
// technique as that shared skeleton and portal/(authed)/insights/loading.tsx
// — just shaped like this page's real layout instead.
export default function StudioProspectsLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-6">
      <div>
        <div className="h-9 w-32 rounded-md bg-secondary" />
        <div className="mt-2 h-4 w-96 max-w-full rounded-md bg-secondary" />
      </div>

      <div className="h-16 rounded-2xl bg-secondary" />

      <div className="h-14 rounded-2xl bg-secondary" />

      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-32 rounded bg-secondary" />
          <div className="flex gap-2">
            <div className="h-8 w-40 rounded-lg bg-secondary" />
            <div className="h-8 w-28 rounded-lg bg-secondary" />
            <div className="h-8 w-28 rounded-lg bg-secondary" />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-16 rounded-xl bg-secondary" />
          <div className="h-16 rounded-xl bg-secondary" />
          <div className="h-16 rounded-xl bg-secondary" />
        </div>
      </div>
    </div>
  );
}
