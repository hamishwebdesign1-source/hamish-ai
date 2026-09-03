// Real-improvement pass — Studio had zero loading.tsx/error.tsx anywhere
// in its route tree, so a slow page (the Command Centre alone runs 15+
// queries) showed a blank flash instead of a skeleton. Same pattern as
// the portal's own loading.tsx (portal/(authed)/loading.tsx) — plain
// pulsing bg-secondary blocks, no shared <Skeleton> component.
//
// This is Command Centre's own shape (stat-card row + chart), and it
// remains the fallback for every route that doesn't have a more specific
// skeleton of its own. Settings, Billing, and Prospects had their own
// route-specific loading.tsx first; Studio Design Audit Tier 1 item #2
// backfilled the rest — Analytics, Campaigns, Clients, Knowledge,
// Projects, Requests, and Website Builder all now have one too (their
// real shapes diverge from this one — KPI/chart grid, filter bars,
// grouped-by-stage lists). Feedback's own loading.tsx was retired along
// with the rest of that route when it was merged into Help (Tier 5 item
// #13). Help & Feedback is the one remaining route still close enough in
// shape (header + card/list content) to this generic skeleton not to
// need its own. Renders as `children` inside the authed layout's own
// <main>, so no header/sidebar/padding of its own to add.
export default function StudioLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-32 rounded-md bg-secondary" />
      <div className="h-9 w-72 rounded-md bg-secondary" />
      <div className="h-4 w-56 rounded-md bg-secondary" />
      <div className="h-24 rounded-2xl bg-secondary" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-20 rounded-xl bg-secondary" />
      </div>
      <div className="h-72 rounded-xl bg-secondary" />
    </div>
  );
}
