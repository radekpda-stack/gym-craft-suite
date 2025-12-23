import { useState } from 'react';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import { HeroKPIGrid, KPICard } from './HeroKPIGrid';
import { InsightsBar, generateFinanceInsights } from './InsightsBar';
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
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TotalIncomeModal } from './modals/TotalIncomeModal';
import { MonthlyAverageModal } from './modals/MonthlyAverageModal';
import { TrainingIncomeModal } from './modals/TrainingIncomeModal';
import { ProductIncomeModal } from './modals/ProductIncomeModal';

type FinanceModal = 'income' | 'monthly' | 'training' | 'products' | 'pending' | null;

export function FinanceStatsSection() {
  const { data: stats, isLoading: statsLoading } = useAnnualStats('year');
  const { data: analytics, isLoading: analyticsLoading } = useBusinessAnalytics();
  const [activeModal, setActiveModal] = useState<FinanceModal>(null);

  const isLoading = statsLoading || analyticsLoading;

  // Generate insights
  const insights = generateFinanceInsights(
    stats ? { ...stats, pendingPayments: stats.pendingPayments } : null,
    analytics?.vsLastMonth
  );

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

  const hasPendingPayments = (stats?.pendingPayments?.count || 0) > 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Insight Bar */}
      {insights.length > 0 && (
        <InsightsBar insights={insights} />
      )}

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
          infoDescription="Celkové příjmy od začátku roku. Zahrnuje tréninky i prodeje produktů."
          infoCalculation="Součet všech kladných transakcí (platby, nabití kreditu) za aktuální kalendářní rok."
        />
        <KPICard
          title="Průměr (dokončené měsíce)"
          value={formatCurrency(stats?.avgMonthlyIncomeCompleted || 0)}
          subtitle="bez aktuálního měsíce"
          icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="primary"
          onClick={() => setActiveModal('monthly')}
          clickable
          infoDescription="Průměrný měsíční příjem počítaný pouze z dokončených měsíců. Nezahrnuje aktuální nedokončený měsíc."
          infoCalculation="(Celkový příjem za dokončené měsíce) / (počet dokončených měsíců v roce)"
        />
        <KPICard
          title="Z tréninků"
          value={formatCurrency(stats?.trainingIncome || 0)}
          subtitle={`${stats?.completedTrainings || 0} tréninků`}
          icon={<Dumbbell className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="default"
          onClick={() => setActiveModal('training')}
          clickable
          infoDescription="Příjmy pouze z tréninků, bez produktů."
          infoCalculation="Součet odečtů kreditu za dokončené tréninky × cena tréninku."
        />
        {hasPendingPayments ? (
          <KPICard
            title="K zaplacení"
            value={formatCurrency(stats?.pendingPayments?.amount || 0)}
            subtitle={`${stats?.pendingPayments?.count || 0} klientů`}
            icon={<AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
            variant="destructive"
            onClick={() => setActiveModal('pending')}
            clickable
            infoDescription="Klienti se záporným kreditním zůstatkem - dlužné částky za tréninky."
            infoCalculation="Součet záporných zůstatků klientů = částky k zaplacení."
          />
        ) : (
          <KPICard
            title="Z produktů"
            value={formatCurrency(stats?.productIncome || 0)}
            subtitle={`${stats?.topProducts?.length || 0} produktů`}
            icon={<ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />}
            variant="warning"
            onClick={() => setActiveModal('products')}
            clickable
            infoDescription="Příjmy z prodeje produktů (doplňky stravy, vybavení apod.)."
            infoCalculation="Součet všech transakcí spojených s prodejem produktů."
          />
        )}
      </HeroKPIGrid>

      {/* Show products card if pending payments shown in KPI */}
      {hasPendingPayments && stats?.productIncome && stats.productIncome > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <KPICard
            title="Z produktů"
            value={formatCurrency(stats?.productIncome || 0)}
            subtitle={`${stats?.topProducts?.length || 0} produktů`}
            icon={<ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />}
            variant="warning"
            onClick={() => setActiveModal('products')}
            clickable
          />
        </div>
      )}

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
