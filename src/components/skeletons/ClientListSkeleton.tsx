import { Skeleton } from '@/components/ui/skeleton';

export function ClientListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="glass rounded-xl p-4 flex items-center gap-4"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Avatar */}
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          
          {/* Content */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          
          {/* Credit badge */}
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
