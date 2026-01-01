import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ActionBlock } from '@/components/dashboard/ActionBlock';
import { TodayPlanCompact } from '@/components/dashboard/TodayPlanCompact';
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid';
import { DashboardActions } from '@/components/dashboard/DashboardActions';
import { PendingPerformancesCard } from '@/components/performance/PendingPerformancesCard';

function DashboardContent() {
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Header with date */}
        <SectionErrorBoundary section="Hlavička" compact>
          <DashboardHeader data={data} isLoading={isLoading} />
        </SectionErrorBoundary>
        
        {/* 🔴 Action Block - clients needing attention */}
        <SectionErrorBoundary section="Akční blok">
          <ActionBlock data={data} isLoading={isLoading} />
        </SectionErrorBoundary>

        {/* ⏳ Pending Performance Approvals */}
        <SectionErrorBoundary section="Čekající schválení" compact>
          <PendingPerformancesCard />
        </SectionErrorBoundary>
        
        {/* 📅 Today's Plan - compact timeline */}
        <SectionErrorBoundary section="Dnešní plán">
          <TodayPlanCompact data={data} isLoading={isLoading} />
        </SectionErrorBoundary>
        
        {/* ⚡ Quick Actions Grid */}
        <SectionErrorBoundary section="Rychlé akce" compact>
          <QuickActionsGrid />
        </SectionErrorBoundary>
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
