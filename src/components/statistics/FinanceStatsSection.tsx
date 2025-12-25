import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import { InsightsBar, generateFinanceInsights } from './InsightsBar';
import { RevenueBreakdownCard } from './RevenueBreakdownCard';
import { MonthlyProgressCard } from './MonthlyProgressCard';
import { YearComparisonCard } from '@/components/dashboard/YearComparisonCard';
import { TopPayingClientsCard } from './TopPayingClientsCard';
import { AverageTrainingPriceCard } from './AverageTrainingPriceCard';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { GaugeCard, SparklineCard, MetricCard } from '@/components/charts';
import { 
  DollarSign, 
  TrendingUp, 
  Dumbbell, 
  ShoppingBag,
  AlertCircle,
  Loader2,
  BarChart3,
  Target
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TotalIncomeModal } from './modals/TotalIncomeModal';
import { MonthlyAverageModal } from './modals/MonthlyAverageModal';
import { TrainingIncomeModal } from './modals/TrainingIncomeModal';
import { ProductIncomeModal } from './modals/ProductIncomeModal';
import { PendingPaymentsModal } from './modals/PendingPaymentsModal';

type FinanceModal = 'income' | 'monthly' | 'training' | 'products' | 'pending' | null;

export function FinanceStatsSection() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useAnnualStats('year');
  const { data: analytics, isLoading: analyticsLoading } = useBusinessAnalytics();
  const [activeModal, setActiveModal] = useState<FinanceModal>(null);

  const isLoading = statsLoading || analyticsLoading;

  // Generate insights - must be before any conditional return
  const insights = generateFinanceInsights(
    stats ? { ...stats, pendingPayments: stats.pendingPayments } : null,
    analytics?.vsLastMonth
  );

  // Prepare sparkline data from monthly trend - must be before any conditional return
  const sparklineData = useMemo(() => {
    return (stats?.monthlyTrend || []).slice(-6).map(m => ({ value: m.income }));
  }, [stats?.monthlyTrend]);

  // Calculate monthly goal progress (example: 100k CZK target)
  const monthlyGoal = 100000;
  const currentMonthIncome = stats?.monthlyTrend?.slice(-1)[0]?.income || 0;
  const goalProgress = Math.min((currentMonthIncome / monthlyGoal) * 100, 100);
  
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Analytics Link */}
      <div className="flex justify-end">
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

      {/* WHOOP-style Gauge Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <GaugeCard
          title="Měsíční cíl"
          value={goalProgress}
          maxValue={100}
          displayValue={`${Math.round(goalProgress)}%`}
          sublabel="splněno"
          description={`${formatCurrency(currentMonthIncome)} z ${formatCurrency(monthlyGoal)}`}
          variant={goalProgress >= 100 ? 'success' : goalProgress >= 70 ? 'primary' : 'warning'}
          size="md"
          onClick={() => setActiveModal('monthly')}
        />
        
        <SparklineCard
          title="Celkový příjem"
          value={formatCurrency(stats?.totalIncome || 0)}
          subtitle="tento rok"
          data={sparklineData}
          trend={analytics?.vsLastMonth.revenue}
          variant="success"
          icon={<DollarSign className="h-4 w-4" />}
          onClick={() => setActiveModal('income')}
        />
        
        <MetricCard
          title="Z tréninků"
          value={formatCurrency(stats?.trainingIncome || 0)}
          subtitle={`${stats?.completedTrainings || 0} tréninků`}
          progress={stats?.totalIncome ? (stats.trainingIncome / stats.totalIncome) * 100 : 0}
          variant="blue"
          icon={<Dumbbell className="h-4 w-4" />}
          onClick={() => setActiveModal('training')}
          showProgressValue
        />

        {hasPendingPayments ? (
          <MetricCard
            title="K zaplacení"
            value={formatCurrency(stats?.pendingPayments?.amount || 0)}
            subtitle={`${stats?.pendingPayments?.count || 0} klientů`}
            progress={100}
            variant="destructive"
            icon={<AlertCircle className="h-4 w-4" />}
            onClick={() => setActiveModal('pending')}
          />
        ) : (
          <MetricCard
            title="Z produktů"
            value={formatCurrency(stats?.productIncome || 0)}
            subtitle={`${stats?.topProducts?.length || 0} produktů`}
            progress={stats?.totalIncome ? (stats.productIncome / stats.totalIncome) * 100 : 0}
            variant="warning"
            icon={<ShoppingBag className="h-4 w-4" />}
            onClick={() => setActiveModal('products')}
            showProgressValue
          />
        )}
      </div>

      {/* Show products card if pending payments shown in KPI */}
      {hasPendingPayments && stats?.productIncome && stats.productIncome > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <MetricCard
            title="Z produktů"
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
      <PendingPaymentsModal 
        open={activeModal === 'pending'} 
        onOpenChange={(open) => !open && setActiveModal(null)}
        stats={stats}
      />
    </div>
  );
}
