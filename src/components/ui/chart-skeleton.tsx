import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ChartSkeletonProps {
  className?: string;
  showHeader?: boolean;
  showSummary?: boolean;
  headerWidth?: string;
}

export function ChartSkeleton({
  className,
  showHeader = true,
  showSummary = true,
  headerWidth = 'w-40',
}: ChartSkeletonProps) {
  return (
    <div className={cn('glass rounded-2xl p-4 sm:p-6 space-y-4', className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className={cn('h-6', headerWidth)} />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      )}
      <Skeleton className="h-48 sm:h-56 w-full rounded-xl" />
      {showSummary && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-3 w-16 mx-auto" />
              <Skeleton className="h-5 w-12 mx-auto" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function KPIGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}
