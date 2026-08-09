import { SkeletonHeader, SkeletonCardGrid } from "@/components/admin/skeleton";

export default function AutomationLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={6} height="h-44" />
    </div>
  );
}
