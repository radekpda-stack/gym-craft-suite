import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { useDashboardLayout } from '@/hooks/useAppSettings';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardActions } from '@/components/dashboard/DashboardActions';
import { TodayTimelineCompact } from '@/components/dashboard/TodayTimelineCompact';
import { ActionCenterCard } from '@/components/dashboard/ActionCenterCard';
import { PendingPerformancesCard } from '@/components/performance/PendingPerformancesCard';
import { WeekOverviewCard } from '@/components/dashboard/WeekOverviewCard';
import { DashboardInsightsRefactored } from '@/components/dashboard/DashboardInsightsRefactored';
import { NextMonthForecastCard } from '@/components/dashboard/NextMonthForecastCard';
import { DashboardLifetimeStats } from '@/components/dashboard/DashboardLifetimeStats';
import { useUnassignedSessions } from '@/hooks/useUnassignedSessions';
import { useAllUnresolvedFollowups } from '@/hooks/useTrainingFollowups';

export default function Index() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();
  const layout = useDashboardLayout();
  
  const { data: unassignedSessions } = useUnassignedSessions();
  const { data: followups } = useAllUnresolvedFollowups();

  const unpaidCount = data?.finance?.unpaidTotal?.count ?? 0;
  const unpaidAmount = data?.finance?.unpaidTotal?.amount ?? 0;
  const debtCount = data?.finance?.creditAtRisk?.count ?? 0;
  const debtAmount = data?.finance?.creditAtRisk?.amount ?? 0;
  const unassignedCount = unassignedSessions?.length ?? 0;
  const followupCount = followups?.length ?? 0;
  
  const hasAnyActions = unpaidCount > 0 || debtCount > 0 || unassignedCount > 0 || followupCount > 0;

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        
        {/* ═══ HERO + TIMELINE ═══ */}
        <SectionErrorBoundary section="Hlavička a timeline" compact>
          <section>
            <DashboardHeader data={data} isLoading={isLoading} />
          </section>
          <section className="mt-4">
            <TodayTimelineCompact 
              trainings={data?.todaySchedule ?? []}
              isLoading={isLoading}
            />
          </section>
        </SectionErrorBoundary>

        {/* ═══ ACTION CENTER + APPROVALS ═══ */}
        <SectionErrorBoundary section="Akce" compact>
          {hasAnyActions && (
            <ActionCenterCard
              unpaidCount={unpaidCount}
              unpaidAmount={unpaidAmount}
              debtCount={debtCount}
              debtAmount={debtAmount}
              unassignedCount={unassignedCount}
              followupCount={followupCount}
              isLoading={isLoading}
            />
          )}
          {layout.showPendingApprovals && <PendingPerformancesCard />}
        </SectionErrorBoundary>

        {/* ═══ FORECAST + OVERVIEW + STATS + INSIGHTS ═══ */}
        <SectionErrorBoundary section="Přehled" compact>
          <section className="space-y-3">
            <NextMonthForecastCard />

            {data && (
              <WeekOverviewCard
                finance={data.finance}
                weeklySummary={data.weeklySummary}
                isLoading={isLoading}
              />
            )}

            <DashboardLifetimeStats />

            {data && (
              <DashboardInsightsRefactored
                trends={data.trends}
                finance={data.finance}
                weeklySummary={data.weeklySummary}
                capacity={data.capacity}
                todaySchedule={data.todaySchedule}
                todayEstimatedIncome={data.todayEstimatedIncome}
                isLoading={isLoading}
              />
            )}
          </section>
        </SectionErrorBoundary>
        
      </div>
      
      <DashboardActions />
    </div>
  );
}
