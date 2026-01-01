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

function DashboardContent() {
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

        {/* 🏆 Career Milestone Card */}
        {layout.showCareerMilestone && (
          <SectionErrorBoundary section="Kariérní statistiky" compact>
            <CareerMilestoneCard />
          </SectionErrorBoundary>
        )}
        
        {/* 📅 Today's Plan - compact timeline */}
        {layout.showTodayPlan && (
          <SectionErrorBoundary section="Dnešní plán">
            <TodayPlanCompact data={data} isLoading={isLoading} />
          </SectionErrorBoundary>
        )}

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
        
        {/* 🔴 Action Block - clients needing attention (lower priority) */}
        {layout.showActionBlock && (
          <SectionErrorBoundary section="Akční blok">
            <ActionBlock data={data} isLoading={isLoading} />
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

export default function Dashboard() {
  return <DashboardContent />;
}
