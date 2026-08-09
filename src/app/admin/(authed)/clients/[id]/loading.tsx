import { SkeletonHeader, SkeletonBlock } from "@/components/admin/skeleton";

export default function ClientDetailLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <div className="flex gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-5 w-20 rounded-full" />
        ))}
      </div>
      <SkeletonBlock className="h-40 rounded-xl" />
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonBlock className="h-32 rounded-xl" />
        <SkeletonBlock className="h-32 rounded-xl" />
      </div>
      <SkeletonBlock className="h-48 rounded-xl" />
    </div>
  );
}
