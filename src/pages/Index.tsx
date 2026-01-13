import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { useDashboardLayout } from '@/hooks/useAppSettings';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardActions } from '@/components/dashboard/DashboardActions';
import { PendingPerformancesCard } from '@/components/performance/PendingPerformancesCard';
import { CareerMilestoneCard } from '@/components/dashboard/CareerMilestoneCard';
import { FinanceSummaryCard } from '@/components/dashboard/FinanceSummaryCard';
import { BusinessYieldScoreCard } from '@/components/dashboard/BusinessYieldScoreCard';
import { CashflowForecastCard } from '@/components/dashboard/CashflowForecastCard';
import { ClientProgressCard } from '@/components/dashboard/ClientProgressCard';
import { ClientsInDebtCard } from '@/components/dashboard/ClientsInDebtCard';
import { DashboardInsights } from '@/components/dashboard/DashboardInsights';

import { UnassignedSessionsCard } from '@/components/dashboard/UnassignedSessionsCard';
import { TrainingsCalendarCard } from '@/components/dashboard/TrainingsCalendarCard';

export default function Index() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();
  const layout = useDashboardLayout();

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Header with date */}
        <SectionErrorBoundary section="Hlavička" compact>
          <DashboardHeader data={data} isLoading={isLoading} />
        </SectionErrorBoundary>

        {/* ⚠️ Unassigned Calendar Sessions */}
        <SectionErrorBoundary section="Nepřiřazené tréninky" compact>
          <UnassignedSessionsCard />
        </SectionErrorBoundary>

        {/* 📊 Business Health Score - NEW */}
        <SectionErrorBoundary section="Business Health" compact>
          <BusinessYieldScoreCard />
        </SectionErrorBoundary>

        {/* 💡 Dashboard Insights */}
        {data && (
          <SectionErrorBoundary section="Postřehy" compact>
            <DashboardInsights
              trends={data.trends}
              finance={data.finance}
              weeklySummary={data.weeklySummary}
              capacity={data.capacity}
              todaySchedule={data.todaySchedule}
              todayEstimatedIncome={data.todayEstimatedIncome}
              isLoading={isLoading}
            />
          </SectionErrorBoundary>
        )}

        {/* 🏆 Career Milestone Card */}
        {layout.showCareerMilestone && (
          <SectionErrorBoundary section="Kariérní statistiky" compact>
            <CareerMilestoneCard />
          </SectionErrorBoundary>
        )}

        {/* 💰 Finance Summary Card */}
        {data && (
          <SectionErrorBoundary section="Finance" compact>
            <FinanceSummaryCard 
              finance={data.finance} 
              weeklySummary={data.weeklySummary}
              isLoading={isLoading}
            />
          </SectionErrorBoundary>
        )}

        {/* 💵 Cashflow Forecast - NEW */}
        <SectionErrorBoundary section="Cashflow" compact>
          <CashflowForecastCard />
        </SectionErrorBoundary>

        {/* 💸 Clients in Debt Widget */}
        <SectionErrorBoundary section="Klienti s dluhem" compact>
          <ClientsInDebtCard />
        </SectionErrorBoundary>

        {/* 📅 Trainings & Calendar - Combined Card */}
        <SectionErrorBoundary section="Tréninky" compact>
          <TrainingsCalendarCard data={data} isLoading={isLoading} />
        </SectionErrorBoundary>


        {/* 👥 Client Progress - NEW */}
        <SectionErrorBoundary section="Pokrok klientů" compact>
          <ClientProgressCard />
        </SectionErrorBoundary>

        {/* ⏳ Pending Performance Approvals */}
        {layout.showPendingApprovals && (
          <SectionErrorBoundary section="Čekající schválení" compact>
            <PendingPerformancesCard />
          </SectionErrorBoundary>
        )}
        
      </div>
      
      {/* Desktop fixed bottom bar */}
      <SectionErrorBoundary section="Akce" compact>
        <DashboardActions />
      </SectionErrorBoundary>
    </div>
  );
}
