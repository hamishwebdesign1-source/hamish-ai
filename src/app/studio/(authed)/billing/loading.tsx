// Route-specific — Billing is usage-card-shaped (plan summary, usage
// bars, credit pack, 3-column plan grid), not stat-card-shaped like the
// shared (authed)/loading.tsx this replaces for this one route. Same
// plain pulsing bg-secondary block technique as that shared skeleton and
// portal/(authed)/insights/loading.tsx — just shaped like this page's
// real layout instead.
export default function StudioBillingLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-6">
      <div>
        <div className="h-9 w-32 rounded-md bg-secondary" />
        <div className="mt-2 h-4 w-80 max-w-full rounded-md bg-secondary" />
      </div>

      <div className="h-20 rounded-2xl bg-secondary" />

      <div className="rounded-2xl bg-secondary p-5">
        <div className="h-4 w-40 rounded bg-background/40" />
        <div className="mt-4 h-2 w-full rounded-full bg-background/40" />
        <div className="mt-6 grid gap-4 border-t border-background/40 pt-4 sm:grid-cols-2">
          <div className="h-8 rounded bg-background/40" />
          <div className="h-8 rounded bg-background/40" />
        </div>
      </div>

      <div className="h-20 rounded-2xl bg-secondary" />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-64 rounded-2xl bg-secondary" />
        <div className="h-64 rounded-2xl bg-secondary" />
        <div className="h-64 rounded-2xl bg-secondary" />
      </div>
    </div>
  );
}
