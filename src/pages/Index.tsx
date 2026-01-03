import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { useDashboardLayout } from '@/hooks/useAppSettings';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ActionBlock } from '@/components/dashboard/ActionBlock';
import { TodayPlanCompact } from '@/components/dashboard/TodayPlanCompact';
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid';
import { DashboardActions } from '@/components/dashboard/DashboardActions';
import { PendingPerformancesCard } from '@/components/performance/PendingPerformancesCard';
import { CareerMilestoneCard } from '@/components/dashboard/CareerMilestoneCard';
import { FinanceSummaryCard } from '@/components/dashboard/FinanceSummaryCard';
import { LastTrainingWidget } from '@/components/dashboard/LastTrainingWidget';
import { BusinessHealthScoreCard } from '@/components/dashboard/BusinessHealthScoreCard';
import { GoalTrackerCard } from '@/components/dashboard/GoalTrackerCard';
import { WinOfTheWeekCard } from '@/components/dashboard/WinOfTheWeekCard';
import { CashflowForecastCard } from '@/components/dashboard/CashflowForecastCard';
import { ClientProgressCard } from '@/components/dashboard/ClientProgressCard';
import { CapacityAlertsCard } from '@/components/dashboard/CapacityAlertsCard';
import { UnassignedSessionsCard } from '@/components/dashboard/UnassignedSessionsCard';

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
          <BusinessHealthScoreCard />
        </SectionErrorBoundary>

        {/* 🏆 Win of the Week - NEW */}
        <SectionErrorBoundary section="Úspěch týdne" compact>
          <WinOfTheWeekCard />
        </SectionErrorBoundary>

        {/* 🎯 Goal Tracker - NEW */}
        <SectionErrorBoundary section="Cíle" compact>
          <GoalTrackerCard />
        </SectionErrorBoundary>

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

        {/* 🏋️ Last Training Widget */}
        {data && (
          <SectionErrorBoundary section="Poslední trénink" compact>
            <LastTrainingWidget 
              todaySchedule={data.todaySchedule}
              weekSchedule={data.weekSchedule}
              isLoading={isLoading}
            />
          </SectionErrorBoundary>
        )}
        
        {/* 📅 Today's Plan - compact timeline */}
        {layout.showTodayPlan && (
          <SectionErrorBoundary section="Dnešní plán">
            <TodayPlanCompact data={data} isLoading={isLoading} />
          </SectionErrorBoundary>
        )}

        {/* 📈 Capacity Alerts - NEW */}
        <SectionErrorBoundary section="Kapacita" compact>
          <CapacityAlertsCard />
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
        
        {/* ⚡ Quick Actions Grid */}
        {layout.showQuickActions && (
          <SectionErrorBoundary section="Rychlé akce" compact>
            <QuickActionsGrid />
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
