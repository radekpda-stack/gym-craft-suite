import { usePageTracking } from '@/hooks/useFeatureTracking';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

import { DashboardStatusBar } from '@/components/dashboard/DashboardStatusBar';
import { MobileDashboardHeader } from '@/components/dashboard/MobileDashboardHeader';
import { PriorityTasksSection } from '@/components/dashboard/PriorityTasksSection';
import { DayTimelineSection } from '@/components/dashboard/DayTimelineSection';
import { ClientsQuickOverviewSection } from '@/components/dashboard/ClientsQuickOverviewSection';
import { UnifiedQuickStats } from '@/components/dashboard/UnifiedQuickStats';
import { BusinessAnalyticsCard } from '@/components/dashboard/BusinessAnalyticsCard';
import { ClientAnalyticsCard } from '@/components/dashboard/ClientAnalyticsCard';
import { UpcomingAnniversariesCard } from '@/components/dashboard/UpcomingAnniversariesCard';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Řídicí panel
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: cs })}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="hidden sm:flex">
          <Link to="/statistics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Statistiky
          </Link>
        </Button>
      </div>

      {/* Priority Tasks - "Co teď?" - always visible */}
      <PriorityTasksSection data={data} isLoading={isLoading} />

      {/* Grid for schedule and clients */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <DayTimelineSection data={data} isLoading={isLoading} />
        <ClientsQuickOverviewSection data={data} isLoading={isLoading} />
      </div>

      {/* Unified Quick Stats - merged from WeekSummary, QuickStats, TrendsPanelSection */}
      <UnifiedQuickStats data={data} isLoading={isLoading} />

      {/* Business Analytics - simplified */}
      <BusinessAnalyticsCard />

      {/* Client Analytics - merged from MostActiveClients and ClientsAtRisk */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <ClientAnalyticsCard />
        <UpcomingAnniversariesCard />
      </div>

      {/* Link to advanced statistics on mobile */}
      {isMobile && (
        <Button variant="outline" asChild className="w-full">
          <Link to="/statistics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Pokročilé statistiky
          </Link>
        </Button>
      )}
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
