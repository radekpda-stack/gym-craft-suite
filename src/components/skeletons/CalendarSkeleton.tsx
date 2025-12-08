import { Skeleton } from '@/components/ui/skeleton';

export function CalendarWeekSkeleton() {
  return (
    <div className="glass rounded-xl sm:rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-border/50">
        <div className="p-4">
          <Skeleton className="h-5 w-10 mx-auto" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="p-4 text-center border-l border-border/30">
            <Skeleton className="h-4 w-8 mx-auto mb-2" />
            <Skeleton className="h-8 w-8 mx-auto rounded-full" />
          </div>
        ))}
      </div>
      
      {/* Time slots */}
      <div className="max-h-[calc(100vh-320px)] overflow-hidden">
        {Array.from({ length: 8 }).map((_, hourIndex) => (
          <div key={hourIndex} className="grid grid-cols-8 border-b border-border/30">
            <div className="p-2 border-r border-border/30">
              <Skeleton className="h-4 w-10 mx-auto" />
            </div>
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div key={dayIndex} className="min-h-[60px] p-1 border-l border-border/30">
                {hourIndex % 3 === 0 && dayIndex % 2 === 0 && (
                  <Skeleton className="h-12 w-full rounded-lg" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarMonthSkeleton() {
  return (
    <div className="glass rounded-xl sm:rounded-2xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border/50">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="p-3 text-center">
            <Skeleton className="h-4 w-6 mx-auto" />
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-[100px] p-2 border-b border-r border-border/30">
            <Skeleton className="h-5 w-5 mb-2" />
            {i % 5 === 0 && (
              <div className="space-y-1">
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-3/4 rounded" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
