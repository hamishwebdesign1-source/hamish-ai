// Real-improvement pass — Studio had zero loading.tsx/error.tsx anywhere
// in its route tree, so a slow page (the Command Centre alone runs 15+
// queries) showed a blank flash instead of a skeleton. Same pattern as
// the portal's own loading.tsx (portal/(authed)/loading.tsx) — plain
// pulsing bg-secondary blocks, no shared <Skeleton> component, for the
// same reason: this renders inside every Studio page (home, prospects,
// clients, settings, …), so it stays generic rather than trying to
// pixel-match any one of them. Renders as `children` inside the authed
// layout's own <main>, so no header/sidebar/padding of its own to add.
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
