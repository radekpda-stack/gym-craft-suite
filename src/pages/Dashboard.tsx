import { usePageTracking } from '@/hooks/useFeatureTracking';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

import { DashboardControlBar } from '@/components/dashboard/DashboardControlBar';
import { MobileDashboardHeader } from '@/components/dashboard/MobileDashboardHeader';
import { MobileBottomBar } from '@/components/dashboard/MobileBottomBar';
import { PriorityTasksSection } from '@/components/dashboard/PriorityTasksSection';
import { DayTimelineSection } from '@/components/dashboard/DayTimelineSection';
import { ClientsQuickOverviewSection } from '@/components/dashboard/ClientsQuickOverviewSection';

import { ClientAnalyticsCard } from '@/components/dashboard/ClientAnalyticsCard';
import { UpcomingAnniversariesCard } from '@/components/dashboard/UpcomingAnniversariesCard';
import { useDashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import { useClientsAtRisk } from '@/hooks/useClientsAtRisk';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Ambient status tint for the entire dashboard
const statusTintClasses: Record<DayStatus, string> = {
  ok: '',
  warning: 'status-tint-warning',
  critical: 'status-tint-critical',
};

function DashboardContent() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();
  const { data: clientsAtRisk = [] } = useClientsAtRisk();
  const isMobile = useIsMobile();

  const totalTasksCount = data?.totalTasksCount || 0;
  const hasClientsAtRisk = clientsAtRisk.length > 0;
  const dayStatus = data?.dayStatus || 'ok';

  return (
    <div className={cn(
      'min-h-screen space-y-5 md:space-y-6 animate-fade-in pb-4',
      statusTintClasses[dayStatus]
    )}>
      {/* Mobile header - Watch/CarPlay style */}
      <MobileDashboardHeader data={data} isLoading={isLoading} />
      
      {/* Desktop Control Bar */}
      <div className="hidden sm:block">
        <DashboardControlBar data={data} isLoading={isLoading} />
      </div>
      
      {/* Header - minimal, calm typography */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">
            Dashboard
          </h1>
          <p className="text-xs text-muted-foreground/60">
            {format(new Date(), 'EEEE, d. MMMM', { locale: cs })}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          asChild 
          className="hidden sm:flex text-muted-foreground hover:text-foreground gap-1.5 h-8 px-3 rounded-full"
        >
          <Link to="/statistics">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs">Statistiky</span>
          </Link>
        </Button>
      </div>

      {/* MOBILE: DayTimeline first - main focus */}
      <div className="sm:hidden">
        <DayTimelineSection data={data} isLoading={isLoading} />
      </div>

      {/* Priority Tasks - ONLY render if there are tasks */}
      {totalTasksCount > 0 && (
        <PriorityTasksSection data={data} isLoading={isLoading} />
      )}

      {/* DESKTOP: Grid for schedule and clients */}
      <div className="hidden sm:grid gap-5 lg:grid-cols-2">
        <DayTimelineSection data={data} isLoading={isLoading} />
        <ClientsQuickOverviewSection data={data} isLoading={isLoading} />
      </div>

      {/* MOBILE: ClientsQuickOverview */}
      <div className="sm:hidden">
        <ClientsQuickOverviewSection data={data} isLoading={isLoading} />
      </div>

      {/* Analytics cards - conditional */}
      {hasClientsAtRisk && (
        <div className="grid gap-5 lg:grid-cols-2">
          <ClientAnalyticsCard />
          <UpcomingAnniversariesCard />
        </div>
      )}

      {!hasClientsAtRisk && (
        <UpcomingAnniversariesCard />
      )}

      {/* Mobile Bottom Bar */}
      {isMobile && <MobileBottomBar />}
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
