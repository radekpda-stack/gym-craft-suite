import { useState } from 'react';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import { HeroKPIGrid, KPICard } from './HeroKPIGrid';
import { RevenueBreakdownCard } from './RevenueBreakdownCard';
import { MonthlyProgressCard } from './MonthlyProgressCard';
import { YearComparisonCard } from '@/components/dashboard/YearComparisonCard';
import { TopPayingClientsCard } from './TopPayingClientsCard';
import { AverageTrainingPriceCard } from './AverageTrainingPriceCard';
import { formatCurrency } from '@/lib/formatters';
import { 
  DollarSign, 
  TrendingUp, 
  Dumbbell, 
  ShoppingBag,
  Loader2 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TotalIncomeModal } from './modals/TotalIncomeModal';
import { MonthlyAverageModal } from './modals/MonthlyAverageModal';
import { TrainingIncomeModal } from './modals/TrainingIncomeModal';
import { ProductIncomeModal } from './modals/ProductIncomeModal';

type FinanceModal = 'income' | 'monthly' | 'training' | 'products' | null;

export function FinanceStatsSection() {
  const { data: stats, isLoading: statsLoading } = useAnnualStats('year');
  const { data: analytics, isLoading: analyticsLoading } = useBusinessAnalytics();
  const [activeModal, setActiveModal] = useState<FinanceModal>(null);

  const isLoading = statsLoading || analyticsLoading;

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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Hero KPI Cards */}
      <HeroKPIGrid>
        <KPICard
          title="Celkový příjem"
          value={formatCurrency(stats?.totalIncome || 0)}
          subtitle="tento rok"
          icon={<DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />}
          trend={analytics?.vsLastMonth.revenue}
          trendLabel="vs minulý měsíc"
          variant="success"
          onClick={() => setActiveModal('income')}
          clickable
        />
        <KPICard
          title="Měsíční průměr"
          value={formatCurrency(stats?.avgMonthlyIncome || 0)}
          subtitle="průměr za rok"
          icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="primary"
          onClick={() => setActiveModal('monthly')}
          clickable
        />
        <KPICard
          title="Z tréninků"
          value={formatCurrency(stats?.trainingIncome || 0)}
          subtitle={`${stats?.completedTrainings || 0} tréninků`}
          icon={<Dumbbell className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="default"
          onClick={() => setActiveModal('training')}
          clickable
        />
        <KPICard
          title="Z produktů"
          value={formatCurrency(stats?.productIncome || 0)}
          subtitle={`${stats?.topProducts?.length || 0} produktů`}
          icon={<ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="warning"
          onClick={() => setActiveModal('products')}
          clickable
        />
      </HeroKPIGrid>

      {/* Monthly Progress Chart */}
      <MonthlyProgressCard />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <RevenueBreakdownCard />
        <AverageTrainingPriceCard />
        <TopPayingClientsCard />
      </div>

      {/* Year Comparison */}
      <YearComparisonCard />

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
    </div>
  );
}
