import { useState } from 'react';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import { useMonthlyIncomeGoal } from '@/hooks/useAppSettings';
import { InsightsBar, generateFinanceInsights } from './InsightsBar';
import { CancellationStatsCard } from './CancellationStatsCard';
import { FinanceHeroKPI } from './FinanceHeroKPI';
import { MonthlyIncomeCard } from './MonthlyIncomeCard';
import { FinanceChartsSection } from './FinanceChartsSection';
import { RevenueByTrainingTypeCard } from './RevenueByTrainingTypeCard';
import { OperatingExpensesCard } from './OperatingExpensesCard';
import { Loader2 } from 'lucide-react';
import { QuickFinancialReportButton } from '@/components/finance/QuickFinancialReportButton';
import { Skeleton } from '@/components/ui/skeleton';
import { TotalIncomeModal } from './modals/TotalIncomeModal';
import { MonthlyAverageModal } from './modals/MonthlyAverageModal';
import { TrainingIncomeModal } from './modals/TrainingIncomeModal';
import { ProductIncomeModal } from './modals/ProductIncomeModal';
import { PendingPaymentsModal } from './modals/PendingPaymentsModal';
import { CancellationDetailModal } from './modals/CancellationDetailModal';
import { MonthlyIncomeDetailModal } from './modals/MonthlyIncomeDetailModal';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { StatsPeriodRange } from './StatsPeriodSelector';

type FinanceModal = 'income' | 'monthly' | 'training' | 'products' | 'pending' | 'cancellation' | 'monthly-history' | null;

interface FinanceStatsSectionProps {
  periodRange?: StatsPeriodRange;
}

export function FinanceStatsSection({ periodRange }: FinanceStatsSectionProps) {
  // Use custom period if provided, otherwise default to 'year'
  const { data: stats, isLoading: statsLoading } = useAnnualStats(
    periodRange?.type === 'all' ? 'all' : periodRange?.type === 'custom' || periodRange ? 'custom' : 'year',
    periodRange?.start,
    periodRange?.end
  );
  const { data: analytics, isLoading: analyticsLoading } = useBusinessAnalytics();
  const monthlyGoal = useMonthlyIncomeGoal();
  const [activeModal, setActiveModal] = useState<FinanceModal>(null);

  const isLoading = statsLoading || analyticsLoading;

  // Generate insights - must be before any conditional return
  const insights = generateFinanceInsights(
    stats ? { ...stats, pendingPayments: stats.pendingPayments } : null,
    analytics?.vsLastMonth
  );

  const hasPendingPayments = (stats?.pendingPayments?.count || 0) > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const handleCardClick = (card: string) => {
    switch (card) {
      case 'income':
        setActiveModal('income');
        break;
      case 'monthly':
        setActiveModal('monthly');
        break;
      case 'training':
      case 'trainings':
        setActiveModal('training');
        break;
      case 'products':
        setActiveModal('products');
        break;
      case 'pending':
        setActiveModal('pending');
        break;
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-end">
          <QuickFinancialReportButton variant="outline" />
        </div>

        {/* Insight Bar */}
        {insights.length > 0 && (
          <InsightsBar insights={insights} />
        )}

        {/* Hero KPI Cards - always use 'received' mode */}
        <FinanceHeroKPI
          mode="received"
          stats={stats}
          monthlyGoal={monthlyGoal}
          vsLastMonth={analytics?.vsLastMonth}
          onCardClick={handleCardClick}
        />

        {/* Revenue by Training Type - KEY NEW CHART */}
        <RevenueByTrainingTypeCard periodRange={periodRange} />

        {/* Trend and Distribution Charts - now uses global periodRange */}
        <FinanceChartsSection periodRange={periodRange} />

        {/* Monthly Income History, Cancellations, and Expenses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <MonthlyIncomeCard onClick={() => setActiveModal('monthly-history')} />
          <CancellationStatsCard periodRange={periodRange} onClick={() => setActiveModal('cancellation')} />
          <OperatingExpensesCard />
        </div>

        {/* Modals */}
        <TotalIncomeModal 
          open={activeModal === 'income'} 
          onOpenChange={(open) => !open && setActiveModal(null)}
          stats={stats}
        />
        <MonthlyAverageModal 
          open={activeModal === 'monthly'} 
          onOpenChange={(open) => !open && setActiveModal(null)}
          stats={stats}
        />
        <TrainingIncomeModal 
          open={activeModal === 'training'} 
          onOpenChange={(open) => !open && setActiveModal(null)}
          stats={stats}
        />
        <ProductIncomeModal 
          open={activeModal === 'products'} 
          onOpenChange={(open) => !open && setActiveModal(null)}
          stats={stats}
        />
        <PendingPaymentsModal 
          open={activeModal === 'pending'} 
          onOpenChange={(open) => !open && setActiveModal(null)}
          stats={stats}
        />
        <CancellationDetailModal 
          open={activeModal === 'cancellation'} 
          onOpenChange={(open) => !open && setActiveModal(null)}
        />
        <MonthlyIncomeDetailModal 
          open={activeModal === 'monthly-history'} 
          onOpenChange={(open) => !open && setActiveModal(null)}
        />
      </div>
    </TooltipProvider>
  );
}
