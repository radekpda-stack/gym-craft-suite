import { Skeleton } from '@/components/ui/skeleton';

export function TrainingListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="glass rounded-xl p-4"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              
              {/* Content */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            
            {/* Status badge */}
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
