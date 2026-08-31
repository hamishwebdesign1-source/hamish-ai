// Route-specific — Feedback is a single textarea and one submit button,
// nothing like the shared (authed)/loading.tsx's stat-card-shaped skeleton
// this replaces for this one route. Same plain pulsing bg-secondary block
// technique as that shared skeleton and portal/(authed)/insights/loading.tsx
// — just shaped like this page's real (deliberately minimal) layout instead.
export default function StudioFeedbackLoading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse">
      <div className="flex items-center gap-3">
        <div className="size-10 shrink-0 rounded-xl bg-secondary" />
        <div>
          <div className="h-9 w-36 rounded-md bg-secondary" />
          <div className="mt-2 h-4 w-72 max-w-full rounded-md bg-secondary" />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="h-32 rounded-lg bg-secondary" />
        <div className="h-9 w-32 rounded-md bg-secondary" />
      </div>
    </div>
  );
}
