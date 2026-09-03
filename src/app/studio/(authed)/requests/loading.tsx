// Studio Design Audit, Tier 1 item #2 — route-specific, same pattern as
// prospects/billing/settings' own loading.tsx: plain pulsing bg-secondary
// blocks shaped like this page's real layout (header, the
// open/all/responded filter row + search, then a list of request rows)
// instead of the shared (authed)/loading.tsx fallback this route used to
// fall through to.
export default function StudioRequestsLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-6">
      <div>
        <div className="h-9 w-36 rounded-md bg-secondary" />
        <div className="mt-2 h-4 w-full max-w-2xl rounded-md bg-secondary" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="h-8 w-24 rounded-lg bg-secondary" />
        <div className="h-8 w-24 rounded-lg bg-secondary" />
        <div className="h-8 w-20 rounded-lg bg-secondary" />
        <div className="ml-auto h-8 w-56 rounded-lg bg-secondary" />
      </div>

      <div className="space-y-2">
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-20 rounded-xl bg-secondary" />
      </div>
    </div>
  );
}
