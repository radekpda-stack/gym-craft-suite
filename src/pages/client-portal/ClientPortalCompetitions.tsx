import { lazy, Suspense } from 'react';
import { Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';

// Lazy load the challenges content
const ChallengesContent = lazy(() => import('./ClientPortalChallenges'));

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function ClientPortalCompetitions() {
  useClientPortalPageTracking('client_portal_competitions');
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Výzvy</h1>
          <p className="text-sm text-muted-foreground">
            Plň výzvy a získávej body
          </p>
        </div>
      </div>
      
      <Suspense fallback={<TabSkeleton />}>
        <ChallengesContent />
      </Suspense>
    </div>
  );
}
