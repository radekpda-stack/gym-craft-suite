import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TodayTimelineCard } from '@/components/dashboard/TodayTimelineCard';
import { DashboardActions } from '@/components/dashboard/DashboardActions';

function DashboardContent() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <DashboardHeader data={data} isLoading={isLoading} />
        
        {/* Full-width today's plan card */}
        <div className="space-y-4">
          <TodayTimelineCard data={data} isLoading={isLoading} />
        </div>
      </div>
      
      <DashboardActions />
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
