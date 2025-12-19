import { usePageTracking } from '@/hooks/useFeatureTracking';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

import { DashboardStatusBar } from '@/components/dashboard/DashboardStatusBar';
import { PriorityTasksSection } from '@/components/dashboard/PriorityTasksSection';
import { DayTimelineSection } from '@/components/dashboard/DayTimelineSection';
import { ClientsQuickOverviewSection } from '@/components/dashboard/ClientsQuickOverviewSection';
import { WeekSummarySection } from '@/components/dashboard/WeekSummarySection';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';

function DashboardContent() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Status Bar - always visible */}
      <DashboardStatusBar data={data} isLoading={isLoading} />
      
      {/* Header with date */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          Řídicí panel
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: cs })}
        </p>
      </div>

      {/* Priority Tasks - "Co teď?" */}
      <PriorityTasksSection data={data} isLoading={isLoading} />

      {/* Grid for schedule and clients */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Day Timeline */}
        <DayTimelineSection data={data} isLoading={isLoading} />
        
        {/* Clients Quick Overview */}
        <ClientsQuickOverviewSection data={data} isLoading={isLoading} />
      </div>

      {/* Week Summary - collapsible */}
      <WeekSummarySection data={data} isLoading={isLoading} />
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
