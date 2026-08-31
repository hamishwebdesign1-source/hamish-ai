// Route-specific — Settings is form/card-heavy (Integrations,
// Notifications, Command Centre, Branding, Data & Privacy, System), not
// stat-card-shaped like the shared (authed)/loading.tsx this replaces
// for this one route. Same plain pulsing bg-secondary block technique as
// that shared skeleton and portal/(authed)/insights/loading.tsx — just
// shaped like this page's real section-label + card layout instead.
export default function StudioSettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse space-y-6">
      <div>
        <div className="h-9 w-40 rounded-md bg-secondary" />
        <div className="mt-2 h-4 w-72 max-w-full rounded-md bg-secondary" />
      </div>

      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div className="h-3 w-28 rounded bg-secondary" />
          <div className="mt-3 space-y-4">
            <div className="h-24 rounded-2xl bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}
