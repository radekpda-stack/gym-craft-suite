import { usePageTracking } from '@/hooks/useFeatureTracking';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2 } from 'lucide-react';

import { DashboardControlBar } from '@/components/dashboard/DashboardControlBar';
import { MobileDashboardHeader } from '@/components/dashboard/MobileDashboardHeader';
import { MobileBottomBar } from '@/components/dashboard/MobileBottomBar';
import { PriorityTasksSection } from '@/components/dashboard/PriorityTasksSection';
import { DayTimelineSection } from '@/components/dashboard/DayTimelineSection';
import { ClientsQuickOverviewSection } from '@/components/dashboard/ClientsQuickOverviewSection';

import { ClientAnalyticsCard } from '@/components/dashboard/ClientAnalyticsCard';
import { UpcomingAnniversariesCard } from '@/components/dashboard/UpcomingAnniversariesCard';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { useClientsAtRisk } from '@/hooks/useClientsAtRisk';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function DashboardContent() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();
  const { data: clientsAtRisk = [] } = useClientsAtRisk();
  const isMobile = useIsMobile();

  const totalTasksCount = data?.totalTasksCount || 0;
  const hasClientsAtRisk = clientsAtRisk.length > 0;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Mobile-only compact header with 4 metrics */}
      <MobileDashboardHeader data={data} isLoading={isLoading} />
      
      {/* Desktop Control Bar - merged StatusBar + QuickStats */}
      <div className="hidden sm:block">
        <DashboardControlBar data={data} isLoading={isLoading} />
      </div>
      
      {/* Header with date + success badge when no tasks */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Řídicí panel
            </h1>
            {/* Success badge when no priority tasks */}
            {!isLoading && totalTasksCount === 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Vše pod kontrolou
              </span>
            )}
          </div>
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

      {/* MOBILE ORDER: DayTimeline first */}
      <div className="sm:hidden">
        <DayTimelineSection data={data} isLoading={isLoading} />
      </div>

      {/* Priority Tasks - ONLY render if there are tasks */}
      {totalTasksCount > 0 && (
        <PriorityTasksSection data={data} isLoading={isLoading} />
      )}

      {/* DESKTOP: Grid for schedule and clients */}
      <div className="hidden sm:grid gap-4 md:gap-6 lg:grid-cols-2">
        <DayTimelineSection data={data} isLoading={isLoading} />
        <ClientsQuickOverviewSection data={data} isLoading={isLoading} />
      </div>

      {/* MOBILE: ClientsQuickOverview (after PriorityTasks) */}
      <div className="sm:hidden">
        <ClientsQuickOverviewSection data={data} isLoading={isLoading} />
      </div>

      {/* Client Analytics - ONLY render if there are at-risk clients */}
      {hasClientsAtRisk && (
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <ClientAnalyticsCard />
          <UpcomingAnniversariesCard />
        </div>
      )}

      {/* If no at-risk clients, still show anniversaries if they exist */}
      {!hasClientsAtRisk && (
        <UpcomingAnniversariesCard />
      )}

      {/* Mobile Bottom Bar - fixed action bar */}
      {isMobile && <MobileBottomBar />}
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
