import { usePageTracking } from '@/hooks/useFeatureTracking';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

import { ActionBar } from '@/components/dashboard/ActionBar';
import { TodayCards } from '@/components/dashboard/TodayCards';
import { AttentionSection } from '@/components/dashboard/AttentionSection';
import { ClientsSchedule } from '@/components/dashboard/ClientsSchedule';
import { CreditSignalBox } from '@/components/dashboard/CreditSignalBox';
import { QuickStats } from '@/components/dashboard/QuickStats';

import { useTodayAlerts } from '@/hooks/useTodayAlerts';

function DashboardContent() {
  usePageTracking('dashboard');
  
  const { data: todayAlerts, isLoading: alertsLoading } = useTodayAlerts();

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Sticky Action Bar - always visible */}
      <ActionBar />
      
      {/* Header with date */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          Řídicí panel
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: cs })}
        </p>
      </div>

      {/* Section 1: DNES - Status cards (most important) */}
      <TodayCards data={todayAlerts} isLoading={alertsLoading} />

      {/* Section 2: Vyžaduje pozornost - To-do list */}
      <AttentionSection data={todayAlerts} isLoading={alertsLoading} />

      {/* Grid for schedule and credits */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Section 3: Clients schedule - Today/Week toggle */}
        <ClientsSchedule />
        
        {/* Section 4: Credit signal box */}
        <CreditSignalBox />
      </div>

      {/* Section 5: Statistics - Collapsible, secondary importance */}
      <QuickStats />
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
