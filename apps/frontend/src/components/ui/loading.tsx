import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

/**
 * Loading skeleton for content placeholders.
 */
export function LoadingSkeleton({ className, lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className={cn("loading-skeleton-container", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="loading-skeleton"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

/**
 * Full-page loading state with spinner.
 */
export function PageLoading() {
  return (
    <div className="page-loading">
      <div className="page-loading-spinner" />
    </div>
  );
}
