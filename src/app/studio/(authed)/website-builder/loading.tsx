// Studio Design Audit, Tier 1 item #2 — route-specific, same pattern as
// prospects/billing/settings' own loading.tsx: plain pulsing bg-secondary
// blocks shaped like this page's real layout (header, the create-project
// CTA, then project rows grouped by stage) instead of the shared
// (authed)/loading.tsx fallback this route used to fall through to.
export default function StudioWebsiteBuilderLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse">
      <div>
        <div className="h-5 w-32 rounded-md bg-secondary" />
        <div className="mt-3 h-9 w-96 max-w-full rounded-md bg-secondary" />
        <div className="mt-2 h-4 w-full max-w-2xl rounded-md bg-secondary" />
      </div>

      <div className="mt-8 h-9 w-56 rounded-lg bg-secondary" />

      <div className="mt-8 space-y-2">
        <div className="h-14 rounded-xl bg-secondary" />
        <div className="h-14 rounded-xl bg-secondary" />
        <div className="h-14 rounded-xl bg-secondary" />
      </div>
    </div>
  );
}
