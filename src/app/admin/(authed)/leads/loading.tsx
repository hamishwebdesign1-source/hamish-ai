import { SkeletonHeader, SkeletonStatRow, SkeletonBlock } from "@/components/admin/skeleton";

export default function LeadsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonBlock className="h-9 rounded-lg" />
      <SkeletonStatRow count={6} />
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <SkeletonBlock className="h-96 rounded-xl" />
        <div className="space-y-3">
          <SkeletonBlock className="h-24 rounded-xl" />
          <SkeletonBlock className="h-24 rounded-xl" />
          <SkeletonBlock className="h-24 rounded-xl" />
          <SkeletonBlock className="h-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
