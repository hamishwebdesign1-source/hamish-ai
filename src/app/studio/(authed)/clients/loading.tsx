// Studio Design Audit, Tier 1 item #2 — route-specific, same pattern as
// prospects/billing/settings' own loading.tsx: plain pulsing bg-secondary
// blocks shaped like this page's real layout (header, count/risk summary
// line, the Clients Copilot box, a search bar, then a list of client
// cards) instead of the shared (authed)/loading.tsx fallback this route
// used to fall through to.
export default function StudioClientsLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse">
      <div>
        <div className="h-9 w-28 rounded-md bg-secondary" />
        <div className="mt-2 h-4 w-96 max-w-full rounded-md bg-secondary" />
      </div>

      <div className="mt-4 h-4 w-48 rounded bg-secondary" />

      <div className="mt-3 h-14 rounded-xl bg-secondary" />

      <div className="mt-3 h-9 rounded-lg bg-secondary" />

      <div className="mt-3 space-y-2">
        <div className="h-16 rounded-xl bg-secondary" />
        <div className="h-16 rounded-xl bg-secondary" />
        <div className="h-16 rounded-xl bg-secondary" />
      </div>
    </div>
  );
}
