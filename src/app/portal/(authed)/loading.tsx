export default function PortalLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-40 rounded-md bg-secondary" />
      <div className="h-4 w-64 rounded-md bg-secondary" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-xl bg-secondary" />
        <div className="h-28 rounded-xl bg-secondary" />
        <div className="h-28 rounded-xl bg-secondary" />
      </div>
      <div className="h-64 rounded-xl bg-secondary" />
    </div>
  );
}
