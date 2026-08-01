import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

/**
 * Generic table/list loading skeleton.
 * Renders animated placeholder rows while data is loading.
 */
export function LoadingSkeleton({ rows = 5, className }: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-md px-4 py-3">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

/**
 * Card grid loading skeleton.
 */
export function CardGridSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-border rounded-lg border p-4">
          <div className="mb-3 flex items-start justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="mb-4 h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="mt-4 flex items-center gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
