// Studio Design Audit, Tier 1 item #2 — route-specific, same pattern as
// prospects/billing/settings' own loading.tsx: plain pulsing bg-secondary
// blocks shaped like this page's real layout (new-campaign form, then a
// list of campaign cards) instead of the shared (authed)/loading.tsx
// fallback this route used to fall through to.
export default function StudioCampaignsLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse">
      <div>
        <div className="h-9 w-40 rounded-md bg-secondary" />
        <div className="mt-2 h-4 w-96 max-w-full rounded-md bg-secondary" />
      </div>

      <div className="mt-6 h-32 rounded-2xl bg-secondary" />

      <div className="mt-6 space-y-2">
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-20 rounded-xl bg-secondary" />
      </div>
    </div>
  );
}
