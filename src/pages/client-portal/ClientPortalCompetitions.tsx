import { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trophy, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';

// Lazy load the tab contents
const ChallengesContent = lazy(() => import('./ClientPortalChallenges'));
const LeaderboardContent = lazy(() => import('./ClientPortalLeaderboard'));

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
  
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'leaderboard' ? 'leaderboard' : 'challenges';
  const [activeTab, setActiveTab] = useState<'challenges' | 'leaderboard'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'leaderboard') {
      setActiveTab('leaderboard');
    } else if (tabParam === 'challenges') {
      setActiveTab('challenges');
    }
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'challenges' | 'leaderboard')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span>Výzvy</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span>Žebříček</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <ChallengesContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <LeaderboardContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
