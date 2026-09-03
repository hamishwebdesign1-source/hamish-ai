// Studio Design Audit, Tier 1 item #2 — route-specific, same pattern as
// prospects/billing/settings' own loading.tsx: plain pulsing bg-secondary
// blocks shaped like this page's real layout (KPI card row, two charts
// side by side, then a data-sources list) instead of the shared
// (authed)/loading.tsx fallback this route used to fall through to.
export default function StudioAnalyticsLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="h-9 w-32 rounded-md bg-secondary" />
          <div className="mt-2 h-4 w-72 max-w-full rounded-md bg-secondary" />
        </div>
        <div className="h-8 w-56 rounded-lg bg-secondary" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-20 rounded-xl bg-secondary" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-2xl bg-secondary" />
        <div className="h-64 rounded-2xl bg-secondary" />
      </div>

      <div className="mt-6">
        <div className="h-3 w-28 rounded bg-secondary" />
        <div className="mt-3 space-y-2">
          <div className="h-12 rounded-xl bg-secondary" />
          <div className="h-12 rounded-xl bg-secondary" />
          <div className="h-12 rounded-xl bg-secondary" />
          <div className="h-12 rounded-xl bg-secondary" />
        </div>
      </div>
    </div>
  );
}
