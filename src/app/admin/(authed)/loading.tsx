import { SkeletonHeader, SkeletonStatRow, SkeletonBlock } from "@/components/admin/skeleton";

// Command Centre's shape specifically — 5 stat cards, then a two-column
// worklist/activity layout. Every other route segment under (authed) that
// doesn't define its own loading.tsx still falls back to this one, so it
// stays close to the most-visited page rather than a generic placeholder.
export default function AdminLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonStatRow count={5} />
      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-24 rounded-xl" />
          <SkeletonBlock className="h-24 rounded-xl" />
          <SkeletonBlock className="h-24 rounded-xl" />
        </div>
        <div className="space-y-3">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
