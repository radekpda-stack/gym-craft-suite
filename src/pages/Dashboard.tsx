import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { useIsMobile } from '@/hooks/use-mobile';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TodayPlanCard } from '@/components/dashboard/TodayPlanCard';
import { ClientStatusCard } from '@/components/dashboard/ClientStatusCard';
import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { DashboardActions } from '@/components/dashboard/DashboardActions';

function DashboardContent() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Max width container for consistency */}
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header - date, status, key metrics */}
        <DashboardHeader data={data} isLoading={isLoading} />
        
        {/* Main 3-card grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Today's Plan - always first */}
          <TodayPlanCard data={data} isLoading={isLoading} />
          
          {/* Client Status */}
          <ClientStatusCard data={data} isLoading={isLoading} />
          
          {/* Attention Required */}
          <AttentionCard data={data} isLoading={isLoading} />
        </div>
      </div>
      
      {/* Fixed bottom actions */}
      <DashboardActions />
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
