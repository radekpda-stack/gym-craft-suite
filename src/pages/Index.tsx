import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { useDashboardLayout } from '@/hooks/useAppSettings';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardActions } from '@/components/dashboard/DashboardActions';
import { SmartDailyPlanCard } from '@/components/dashboard/SmartDailyPlanCard';
import { TodayTimelineCompact } from '@/components/dashboard/TodayTimelineCompact';
import { ActionCenterCard } from '@/components/dashboard/ActionCenterCard';
import { FollowupsSection } from '@/components/dashboard/FollowupsSection';
import { PendingPerformancesCard } from '@/components/performance/PendingPerformancesCard';
import { WeekOverviewCard } from '@/components/dashboard/WeekOverviewCard';
import { DashboardInsightsRefactored } from '@/components/dashboard/DashboardInsightsRefactored';
import { useUnassignedSessions } from '@/hooks/useUnassignedSessions';
import { useAllUnresolvedFollowups } from '@/hooks/useTrainingFollowups';

export default function Index() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();
  const layout = useDashboardLayout();
  
  // Fetch additional counts for ActionCenter
  const { data: unassignedSessions } = useUnassignedSessions();
  const { data: followups } = useAllUnresolvedFollowups();

  // Calculate alert counts
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
        
        {/* ═══ HERO - Morning Briefing ═══ */}
        <section>
          <SectionErrorBoundary section="Hlavička" compact>
            <DashboardHeader data={data} isLoading={isLoading} />
          </SectionErrorBoundary>
        </section>

        {/* ═══ SMART DAILY PLAN - Proactive coaching assistant ═══ */}
        <section>
          <SectionErrorBoundary section="Denní plán" compact>
            <SmartDailyPlanCard />
          </SectionErrorBoundary>
        </section>

        {/* ═══ TODAY TIMELINE ═══ */}
        <section>
          <SectionErrorBoundary section="Dnešní tréninky" compact>
            <TodayTimelineCompact 
              trainings={data?.todaySchedule ?? []}
              isLoading={isLoading}
            />
          </SectionErrorBoundary>
        </section>

        {/* ═══ ACTION CENTER ═══ */}
        {hasAnyActions && (
          <section>
            <SectionErrorBoundary section="Vyžaduje akci" compact>
              <ActionCenterCard
                unpaidCount={unpaidCount}
                unpaidAmount={unpaidAmount}
                debtCount={debtCount}
                debtAmount={debtAmount}
                unassignedCount={unassignedCount}
                followupCount={followupCount}
                isLoading={isLoading}
              />
            </SectionErrorBoundary>
          </section>
        )}

        {/* ═══ FOLLOWUPS ═══ */}
        {followupCount > 0 && (
          <section>
            <SectionErrorBoundary section="Připomenutí" compact>
              <FollowupsSection defaultExpanded={followupCount <= 5} />
            </SectionErrorBoundary>
          </section>
        )}

        {/* Pending Performance Approvals */}
        {layout.showPendingApprovals && (
          <section>
            <SectionErrorBoundary section="Čekající schválení" compact>
              <PendingPerformancesCard />
            </SectionErrorBoundary>
          </section>
        )}

        {/* ═══ CONSOLIDATED OVERVIEW - Stats + Finance + Cashflow ═══ */}
        <section className="space-y-3">
          {data && (
            <SectionErrorBoundary section="Přehled" compact>
              <WeekOverviewCard
                finance={data.finance}
                weeklySummary={data.weeklySummary}
                isLoading={isLoading}
              />
            </SectionErrorBoundary>
          )}

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
        </section>
        
      </div>
      
      {/* Desktop fixed bottom bar */}
      <SectionErrorBoundary section="Akce" compact>
        <DashboardActions />
      </SectionErrorBoundary>
    </div>
  );
}
