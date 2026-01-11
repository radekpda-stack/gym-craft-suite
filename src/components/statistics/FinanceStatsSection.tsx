import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import { useMonthlyIncomeGoal } from '@/hooks/useAppSettings';
import { InsightsBar, generateFinanceInsights } from './InsightsBar';
import { RevenueBreakdownCard } from './RevenueBreakdownCard';
import { RevenueByParticipantsCard } from './RevenueByParticipantsCard';
import { AverageTrainingPriceCard } from './AverageTrainingPriceCard';
import { CancellationStatsCard } from './CancellationStatsCard';
import { OperatingExpensesCard } from './OperatingExpensesCard';
import { FinanceModeToggle, FinanceMode } from './FinanceModeToggle';
import { FinanceHeroKPI } from './FinanceHeroKPI';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/charts';
import { 
  ShoppingBag,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TotalIncomeModal } from './modals/TotalIncomeModal';
import { MonthlyAverageModal } from './modals/MonthlyAverageModal';
import { TrainingIncomeModal } from './modals/TrainingIncomeModal';
import { ProductIncomeModal } from './modals/ProductIncomeModal';
import { PendingPaymentsModal } from './modals/PendingPaymentsModal';
import { CancellationDetailModal } from './modals/CancellationDetailModal';

type FinanceModal = 'income' | 'monthly' | 'training' | 'products' | 'pending' | 'cancellation' | null;

export function FinanceStatsSection() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useAnnualStats('year');
  const { data: analytics, isLoading: analyticsLoading } = useBusinessAnalytics();
  const monthlyGoal = useMonthlyIncomeGoal();
  const [activeModal, setActiveModal] = useState<FinanceModal>(null);
  const [financeMode, setFinanceMode] = useState<FinanceMode>('received');

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
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header with mode toggle and analytics link */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <FinanceModeToggle value={financeMode} onChange={setFinanceMode} />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/statistics/analytics')}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Pokročilá analytika
        </Button>
      </div>

      {/* Insight Bar */}
      {insights.length > 0 && (
        <InsightsBar insights={insights} />
      )}

      {/* Hero KPI Cards - changes based on mode */}
      <FinanceHeroKPI
        mode={financeMode}
        stats={stats}
        monthlyGoal={monthlyGoal}
        vsLastMonth={analytics?.vsLastMonth}
        onCardClick={handleCardClick}
      />

      {/* Show products card if pending payments shown in KPI (only in received mode) */}
      {financeMode === 'received' && hasPendingPayments && stats?.productIncome && stats.productIncome > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <MetricCard
            title="Produkty"
            value={formatCurrency(stats?.productIncome || 0)}
            subtitle={`${stats?.topProducts?.length || 0} produktů`}
            progress={stats?.totalIncome ? (stats.productIncome / stats.totalIncome) * 100 : 0}
            variant="warning"
            orientation="horizontal"
            icon={<ShoppingBag className="h-4 w-4" />}
            onClick={() => setActiveModal('products')}
          />
        </div>
      )}

      {/* Stats Grid - simplified */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <RevenueBreakdownCard />
        <AverageTrainingPriceCard />
        <OperatingExpensesCard />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <RevenueByParticipantsCard />
      </div>

      {/* Cancellation Stats - single row */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        <CancellationStatsCard onClick={() => setActiveModal('cancellation')} />
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
    </div>
  );
}
