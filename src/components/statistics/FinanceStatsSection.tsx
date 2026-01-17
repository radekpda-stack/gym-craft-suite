import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import { useMonthlyIncomeGoal } from '@/hooks/useAppSettings';
import { InsightsBar, generateFinanceInsights } from './InsightsBar';
import { RevenueBreakdownCard } from './RevenueBreakdownCard';
import { CancellationStatsCard } from './CancellationStatsCard';
import { OperatingExpensesCard } from './OperatingExpensesCard';
import { FinanceModeToggle, FinanceMode } from './FinanceModeToggle';
import { FinanceHeroKPI } from './FinanceHeroKPI';
import { RevenueWaterfallCard } from './RevenueWaterfallCard';
import { MonthlyIncomeCard } from './MonthlyIncomeCard';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/charts';
import { 
  ShoppingBag,
  Loader2,
  BarChart3,
  Info,
} from 'lucide-react';
import { QuickFinancialReportButton } from '@/components/finance/QuickFinancialReportButton';
import { Skeleton } from '@/components/ui/skeleton';
import { TotalIncomeModal } from './modals/TotalIncomeModal';
import { MonthlyAverageModal } from './modals/MonthlyAverageModal';
import { TrainingIncomeModal } from './modals/TrainingIncomeModal';
import { ProductIncomeModal } from './modals/ProductIncomeModal';
import { PendingPaymentsModal } from './modals/PendingPaymentsModal';
import { CancellationDetailModal } from './modals/CancellationDetailModal';
import { MonthlyIncomeDetailModal } from './modals/MonthlyIncomeDetailModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { StatsPeriodRange } from './StatsPeriodSelector';

type FinanceModal = 'income' | 'monthly' | 'training' | 'products' | 'pending' | 'cancellation' | 'monthly-history' | null;

interface FinanceStatsSectionProps {
  periodRange?: StatsPeriodRange;
}

export function FinanceStatsSection({ periodRange }: FinanceStatsSectionProps) {
  const navigate = useNavigate();
  
  // Use custom period if provided, otherwise default to 'year'
  const { data: stats, isLoading: statsLoading } = useAnnualStats(
    periodRange?.type === 'all' ? 'all' : periodRange?.type === 'custom' || periodRange ? 'custom' : 'year',
    periodRange?.start,
    periodRange?.end
  );
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
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header with mode toggle and analytics link */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FinanceModeToggle value={financeMode} onChange={setFinanceMode} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="font-medium mb-1">Dva klíčové údaje</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Přijatý kredit:</strong> Kolik peněz klienti vložili (dobití kreditu).
                  <br />
                  <strong>Odtrénováno:</strong> Kolik jste vydělali za služby (tréninky + produkty).
                  <br /><br />
                  <strong>Průměr za trénink:</strong> Skutečná průměrná cena z credit_transactions.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/statistics/analytics')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Pokročilá analytika
            </Button>
            <QuickFinancialReportButton variant="outline" />
          </div>
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

        {/* Stats Grid - streamlined to most important cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <RevenueBreakdownCard periodRange={periodRange} />
          <OperatingExpensesCard />
        </div>

        {/* Revenue Waterfall - key insight card */}
        <RevenueWaterfallCard />

        {/* Monthly Income History and Cancellations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <MonthlyIncomeCard onClick={() => setActiveModal('monthly-history')} />
          <CancellationStatsCard periodRange={periodRange} onClick={() => setActiveModal('cancellation')} />
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
