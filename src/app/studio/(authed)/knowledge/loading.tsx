// Studio Design Audit, Tier 1 item #2 — route-specific, same pattern as
// prospects/billing/settings' own loading.tsx: plain pulsing bg-secondary
// blocks shaped like this page's real layout (header, the add-entry/
// import controls row, then a list of knowledge entries) instead of the
// shared (authed)/loading.tsx fallback this route used to fall through
// to.
export default function StudioKnowledgeLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse">
      <div>
        <div className="h-9 w-48 rounded-md bg-secondary" />
        <div className="mt-2 h-4 w-full max-w-2xl rounded-md bg-secondary" />
      </div>

      <div className="mt-6 flex gap-2">
        <div className="h-8 w-28 rounded-lg bg-secondary" />
        <div className="h-8 w-36 rounded-lg bg-secondary" />
      </div>

      <div className="mt-6 space-y-2">
        <div className="h-16 rounded-xl bg-secondary" />
        <div className="h-16 rounded-xl bg-secondary" />
        <div className="h-16 rounded-xl bg-secondary" />
      </div>
    </div>
  );
}
