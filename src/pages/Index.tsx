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
import { PendingPaymentsCard } from '@/components/dashboard/PendingPaymentsCard';
import { DashboardInsights } from '@/components/dashboard/DashboardInsights';

import { UnassignedSessionsCard } from '@/components/dashboard/UnassignedSessionsCard';
import { FollowupsDashboardWidget } from '@/components/dashboard/FollowupsDashboardWidget';

export default function Index() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();
  const layout = useDashboardLayout();

  // Calculate if there are alerts to show
  const hasUnpaidClients = (data?.finance?.unpaidTotal?.count ?? 0) > 0;
  const hasClientsInDebt = (data?.finance?.creditAtRisk?.count ?? 0) > 0;

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        
        {/* ═══════════════════════════════════════════════════════════════════
            HERO ZONE - Today's overview + Quick Actions
            Always visible, contains greeting, key metrics, action buttons
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <SectionErrorBoundary section="Hlavička" compact>
            <DashboardHeader data={data} isLoading={isLoading} />
          </SectionErrorBoundary>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            ALERT ZONE - Critical items requiring attention
            Only shown when there are issues (conditionally rendered)
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          {/* Unassigned Calendar Sessions - always check */}
          <SectionErrorBoundary section="Nepřiřazené tréninky" compact>
            <UnassignedSessionsCard />
          </SectionErrorBoundary>

          {/* Pending Payments - show only if there are unpaid items */}
          {hasUnpaidClients && (
            <SectionErrorBoundary section="Čeká na platbu" compact>
              <PendingPaymentsCard />
            </SectionErrorBoundary>
          )}

          {/* Clients in Debt - show only if there are clients at risk */}
          {hasClientsInDebt && (
            <SectionErrorBoundary section="Klienti s dluhem" compact>
              <ClientsInDebtCard />
            </SectionErrorBoundary>
          )}

          {/* Follow-ups - always show as they're action items */}
          <SectionErrorBoundary section="Připomenutí" compact>
            <FollowupsDashboardWidget />
          </SectionErrorBoundary>

          {/* Pending Performance Approvals */}
          {layout.showPendingApprovals && (
            <SectionErrorBoundary section="Čekající schválení" compact>
              <PendingPerformancesCard />
            </SectionErrorBoundary>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            INSIGHT ZONE - Analytics, trends, business health
            For understanding business performance at a glance
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          {/* Business Health Score */}
          <SectionErrorBoundary section="Business Health" compact>
            <BusinessYieldScoreCard />
          </SectionErrorBoundary>

          {/* Dashboard Insights */}
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

          {/* Career Milestone Card */}
          {layout.showCareerMilestone && (
            <SectionErrorBoundary section="Kariérní statistiky" compact>
              <CareerMilestoneCard />
            </SectionErrorBoundary>
          )}

          {/* Finance Summary Card */}
          {data && (
            <SectionErrorBoundary section="Finance" compact>
              <FinanceSummaryCard 
                finance={data.finance} 
                weeklySummary={data.weeklySummary}
                isLoading={isLoading}
              />
            </SectionErrorBoundary>
          )}

          {/* Cashflow Forecast */}
          <SectionErrorBoundary section="Cashflow" compact>
            <CashflowForecastCard />
          </SectionErrorBoundary>

          {/* Client Progress */}
          <SectionErrorBoundary section="Pokrok klientů" compact>
            <ClientProgressCard />
          </SectionErrorBoundary>
        </section>
        
      </div>
      
      {/* Desktop fixed bottom bar */}
      <SectionErrorBoundary section="Akce" compact>
        <DashboardActions />
      </SectionErrorBoundary>
    </div>
  );
}
