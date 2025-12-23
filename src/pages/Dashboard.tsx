import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { HeroAttentionCard } from '@/components/dashboard/HeroAttentionCard';
import { TodayTimelineCard } from '@/components/dashboard/TodayTimelineCard';
import { MetricsInstruments } from '@/components/dashboard/MetricsInstruments';
import { DashboardActions } from '@/components/dashboard/DashboardActions';

function DashboardContent() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Max width container - expanded for better desktop usage */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Header - minimalist date display */}
        <DashboardHeader data={data} isLoading={isLoading} />
        
        {/* Main 2-column grid on desktop */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Hero Attention Card - takes 2 columns */}
          <HeroAttentionCard data={data} isLoading={isLoading} />
          
          {/* Today's Timeline - 1 column */}
          <TodayTimelineCard data={data} isLoading={isLoading} />
        </div>
        
        {/* Metrics row - WHOOP style instruments */}
        <div className="mt-4">
          <MetricsInstruments data={data} isLoading={isLoading} />
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
