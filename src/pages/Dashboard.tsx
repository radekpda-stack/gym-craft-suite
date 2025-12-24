import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TodayTimelineCard } from '@/components/dashboard/TodayTimelineCard';
import { DashboardActions } from '@/components/dashboard/DashboardActions';

function DashboardContent() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <SectionErrorBoundary section="Hlavička" compact>
          <DashboardHeader data={data} isLoading={isLoading} />
        </SectionErrorBoundary>
        
        {/* Full-width today's plan card */}
        <div className="space-y-4">
          <SectionErrorBoundary section="Dnešní plán">
            <TodayTimelineCard data={data} isLoading={isLoading} />
          </SectionErrorBoundary>
        </div>
      </div>
      
      <SectionErrorBoundary section="Akce" compact>
        <DashboardActions />
      </SectionErrorBoundary>
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
