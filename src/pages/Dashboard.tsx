import { usePageTracking } from '@/hooks/useFeatureTracking';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

import { DashboardStatusBar } from '@/components/dashboard/DashboardStatusBar';
import { MobileDashboardHeader } from '@/components/dashboard/MobileDashboardHeader';
import { PriorityTasksSection } from '@/components/dashboard/PriorityTasksSection';
import { DayTimelineSection } from '@/components/dashboard/DayTimelineSection';
import { ClientsQuickOverviewSection } from '@/components/dashboard/ClientsQuickOverviewSection';
import { WeekSummarySection } from '@/components/dashboard/WeekSummarySection';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { TrendsPanelSection } from '@/components/dashboard/TrendsPanelSection';
import { StatsOverviewCard } from '@/components/dashboard/StatsOverviewCard';
import { UpcomingAnniversariesCard } from '@/components/dashboard/UpcomingAnniversariesCard';
import { MostActiveClientsCard } from '@/components/dashboard/MostActiveClientsCard';
import { ClientsAtRiskCard } from '@/components/dashboard/ClientsAtRiskCard';
import { YearComparisonCard } from '@/components/dashboard/YearComparisonCard';
import { CapacityHeatmapCard } from '@/components/dashboard/CapacityHeatmapCard';
import { PRTimelineCard } from '@/components/dashboard/PRTimelineCard';
import { BusinessAnalyticsCard } from '@/components/dashboard/BusinessAnalyticsCard';
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { useIsMobile } from '@/hooks/use-mobile';

function DashboardContent() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Mobile-only compact header */}
      <MobileDashboardHeader data={data} isLoading={isLoading} />
      
      {/* Desktop Status Bar - hidden on mobile */}
      <div className="hidden sm:block">
        <DashboardStatusBar data={data} isLoading={isLoading} />
      </div>
      
      {/* Header with date */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          Řídicí panel
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: cs })}
        </p>
      </div>

      {/* Priority Tasks - "Co teď?" - always visible */}
      <PriorityTasksSection data={data} isLoading={isLoading} />

      {/* Grid for schedule and clients - visible on desktop, collapsible on mobile */}
      {isMobile ? (
        <CollapsibleSection title="Dnes" defaultOpen={true}>
          <DayTimelineSection data={data} isLoading={isLoading} />
          <ClientsQuickOverviewSection data={data} isLoading={isLoading} />
        </CollapsibleSection>
      ) : (
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <DayTimelineSection data={data} isLoading={isLoading} />
          <ClientsQuickOverviewSection data={data} isLoading={isLoading} />
        </div>
      )}

      {/* Week Summary - collapsible on mobile */}
      {isMobile ? (
        <CollapsibleSection title="Tento týden">
          <WeekSummarySection data={data} isLoading={isLoading} />
        </CollapsibleSection>
      ) : (
        <WeekSummarySection data={data} isLoading={isLoading} />
      )}

      {/* Analytics - collapsible on mobile */}
      {isMobile ? (
        <CollapsibleSection title="Analytika">
          <BusinessAnalyticsCard />
          <div className="grid grid-cols-1 gap-4">
            <MostActiveClientsCard />
            <ClientsAtRiskCard />
          </div>
        </CollapsibleSection>
      ) : (
        <>
          <BusinessAnalyticsCard />
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <MostActiveClientsCard />
            <ClientsAtRiskCard />
          </div>
        </>
      )}

      {/* Year comparison and Heatmap - collapsible on mobile */}
      {isMobile ? (
        <CollapsibleSection title="Pokročilé statistiky">
          <YearComparisonCard />
          <CapacityHeatmapCard />
          <PRTimelineCard />
        </CollapsibleSection>
      ) : (
        <>
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <YearComparisonCard />
            <CapacityHeatmapCard />
          </div>
          <PRTimelineCard />
        </>
      )}

      {/* Additional stats - collapsible on mobile */}
      {isMobile ? (
        <CollapsibleSection title="Další přehledy">
          <UpcomingAnniversariesCard />
          <QuickStats />
          <TrendsPanelSection data={data} isLoading={isLoading} />
          <StatsOverviewCard />
        </CollapsibleSection>
      ) : (
        <>
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <UpcomingAnniversariesCard />
            <QuickStats />
          </div>
          
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <TrendsPanelSection data={data} isLoading={isLoading} />
            <StatsOverviewCard />
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
