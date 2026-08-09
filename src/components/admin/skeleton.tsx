import { cn } from "@/lib/utils";

// Portal redesign Stage 7 — small composable pieces so each route's
// loading.tsx can roughly match that page's actual shape (stat row, list,
// two-column form+list, card grid) instead of every route falling back to
// the one generic 3-card skeleton that used to cover all of them. Pure
// CSS (animate-pulse), no client JS — these render on the server exactly
// like the loading.tsx files that use them.
export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-secondary", className)} />;
}

export function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-7 w-48" />
      <SkeletonBlock className="h-4 w-80" />
    </div>
  );
}

export function SkeletonStatRow({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

export function SkeletonListRows({ count = 5, height = "h-20" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} className={cn(height, "rounded-xl")} />
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6, height = "h-48" }: { count?: number; height?: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} className={cn(height, "rounded-xl")} />
      ))}
    </div>
  );
}
