import { SkeletonHeader, SkeletonBlock } from "@/components/admin/skeleton";

export default function LeadDetailLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <SkeletonBlock className="h-40 rounded-xl" />
          <SkeletonBlock className="h-56 rounded-xl" />
          <SkeletonBlock className="h-40 rounded-xl" />
          <SkeletonBlock className="h-32 rounded-xl" />
        </div>
        <SkeletonBlock className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
