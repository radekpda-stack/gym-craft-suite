import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { useDashboardLayout } from '@/hooks/useAppSettings';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardActions } from '@/components/dashboard/DashboardActions';
import { TodayTimelineCompact } from '@/components/dashboard/TodayTimelineCompact';
import { AlertsSummaryCard } from '@/components/dashboard/AlertsSummaryCard';
import { PendingPerformancesCard } from '@/components/performance/PendingPerformancesCard';
import { CareerMilestoneCard } from '@/components/dashboard/CareerMilestoneCard';
import { FinanceSummaryCard } from '@/components/dashboard/FinanceSummaryCard';
import { BusinessYieldScoreCard } from '@/components/dashboard/BusinessYieldScoreCard';
import { CashflowForecastCard } from '@/components/dashboard/CashflowForecastCard';
import { DashboardInsightsRefactored } from '@/components/dashboard/DashboardInsightsRefactored';
import { UnassignedSessionsCard } from '@/components/dashboard/UnassignedSessionsCard';
import { FollowupsDashboardWidget } from '@/components/dashboard/FollowupsDashboardWidget';

export default function Index() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();
  const layout = useDashboardLayout();

  // Calculate if there are alerts to show
  const unpaidCount = data?.finance?.unpaidTotal?.count ?? 0;
  const unpaidAmount = data?.finance?.unpaidTotal?.amount ?? 0;
  const debtCount = data?.finance?.creditAtRisk?.count ?? 0;
  const debtAmount = data?.finance?.creditAtRisk?.amount ?? 0;
  const hasAlerts = unpaidCount > 0 || debtCount > 0;

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        
        {/* ═══════════════════════════════════════════════════════════════════
            HERO ZONE - Today's overview + Quick Actions
            Always visible, contains greeting, key metrics, action buttons
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionErrorBoundary section="Hlavička" compact>
            <DashboardHeader data={data} isLoading={isLoading} />
          </SectionErrorBoundary>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            TODAY TIMELINE - Visual overview of today's trainings
            Shows schedule with quick actions for completing and feedback
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionErrorBoundary section="Dnešní tréninky" compact>
            <TodayTimelineCompact 
              trainings={data?.todaySchedule ?? []}
              isLoading={isLoading}
            />
          </SectionErrorBoundary>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            ALERT ZONE - Critical items requiring attention
            Consolidated alerts card + individual action items
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          {/* Consolidated Alerts */}
          {hasAlerts && (
            <SectionErrorBoundary section="Upozornění" compact>
              <AlertsSummaryCard
                unpaidCount={unpaidCount}
                unpaidAmount={unpaidAmount}
                debtCount={debtCount}
                debtAmount={debtAmount}
                isLoading={isLoading}
              />
            </SectionErrorBoundary>
          )}

          {/* Unassigned Calendar Sessions */}
          <SectionErrorBoundary section="Nepřiřazené tréninky" compact>
            <UnassignedSessionsCard />
          </SectionErrorBoundary>

          {/* Follow-ups */}
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
              <DashboardInsightsRefactored
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

          {/* Career Milestone Card */}
          {layout.showCareerMilestone && (
            <SectionErrorBoundary section="Kariérní statistiky" compact>
              <CareerMilestoneCard />
            </SectionErrorBoundary>
          )}

          {/* Cashflow Forecast */}
          <SectionErrorBoundary section="Cashflow" compact>
            <CashflowForecastCard />
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
