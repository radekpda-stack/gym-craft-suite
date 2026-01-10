import { useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { useDashboardLayout } from '@/hooks/useAppSettings';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';
import { Button } from '@/components/ui/button';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardActions } from '@/components/dashboard/DashboardActions';
import { PendingPerformancesCard } from '@/components/performance/PendingPerformancesCard';
import { CareerMilestoneCard } from '@/components/dashboard/CareerMilestoneCard';
import { FinanceSummaryCard } from '@/components/dashboard/FinanceSummaryCard';
import { BusinessHealthScoreCard } from '@/components/dashboard/BusinessHealthScoreCard';
import { CashflowForecastCard } from '@/components/dashboard/CashflowForecastCard';
import { ClientProgressCard } from '@/components/dashboard/ClientProgressCard';
import { ClientsInDebtCard } from '@/components/dashboard/ClientsInDebtCard';

import { UnassignedSessionsCard } from '@/components/dashboard/UnassignedSessionsCard';
import { TrainingsCalendarCard } from '@/components/dashboard/TrainingsCalendarCard';

export default function Index() {
  const navigate = useNavigate();
  usePageTracking('dashboard');
  
  const { data, isLoading } = useDashboardViewModel();
  const layout = useDashboardLayout();

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Training Mode Button */}
        <Button
          onClick={() => navigate('/training-mode')}
          className="w-full h-14 gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-lg font-semibold shadow-lg"
        >
          <Dumbbell className="w-6 h-6" />
          Tréninkový režim
        </Button>

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
