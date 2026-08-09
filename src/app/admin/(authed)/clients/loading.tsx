import { SkeletonHeader, SkeletonBlock } from "@/components/admin/skeleton";

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <SkeletonBlock className="h-96 rounded-xl" />
        <div className="space-y-3">
          <SkeletonBlock className="h-16 rounded-xl" />
          <SkeletonBlock className="h-16 rounded-xl" />
          <SkeletonBlock className="h-16 rounded-xl" />
          <SkeletonBlock className="h-16 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
