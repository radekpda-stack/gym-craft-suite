import { useMemo } from 'react';
import { formatCurrency } from '@/lib/formatters';
import { GaugeCard, SparklineCard, MetricCard } from '@/components/charts';
import { 
  Clock, 
  Dumbbell, 
  Target,
  AlertCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  XCircle,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { AnnualStatsData } from '@/hooks/useAnnualStats';
import { FinanceMode } from './FinanceModeToggle';
import { getDaysInMonth, getDate } from 'date-fns';

interface FinanceHeroKPIProps {
  mode: FinanceMode;
  stats: AnnualStatsData | null;
  monthlyGoal: number;
  vsLastMonth?: {
    revenue?: number;
    trainings?: number;
  };
  onCardClick?: (card: string) => void;
}

export function FinanceHeroKPI({ 
  mode, 
  stats, 
  monthlyGoal, 
  vsLastMonth,
  onCardClick 
}: FinanceHeroKPIProps) {
  const currentMonthIncome = stats?.monthlyTrend?.slice(-1)[0]?.income || 0;
  const currentMonthTrainings = stats?.monthlyTrend?.slice(-1)[0]?.trainings || 0;
  
  // Calculate goal progress based on mode
  const goalProgress = mode === 'performed'
    ? Math.min((currentMonthTrainings / (monthlyGoal / 1000)) * 100, 100)
    : Math.min((currentMonthIncome / monthlyGoal) * 100, 100);

  // Calculate pacing for monthly goal
  const today = new Date();
  const dayOfMonth = getDate(today);
  const daysInMonth = getDaysInMonth(today);
  const expectedProgress = (dayOfMonth / daysInMonth) * 100;
  const isOnTrack = goalProgress >= expectedProgress;

  const sparklineData = useMemo(() => {
    return (stats?.monthlyTrend || []).slice(-6).map(m => ({ 
      value: mode === 'performed' ? m.trainings : m.income 
    }));
  }, [stats?.monthlyTrend, mode]);

  const hasPendingPayments = (stats?.pendingPayments?.count || 0) > 0;
  const lateCancellations = stats?.lateCancellations || 0;

  // Calculate credit trend (this month vs last month)
  const creditTrend = stats?.receivedCreditLastMonth && stats.receivedCreditLastMonth > 0
    ? ((stats.receivedCreditThisMonth - stats.receivedCreditLastMonth) / stats.receivedCreditLastMonth) * 100
    : 0;

  if (mode === 'performed') {
    // "Odtrénováno" mode - focus on trainings done
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Main metric: Trainings this month */}
        <GaugeCard
          title="Tento měsíc"
          value={goalProgress}
          maxValue={100}
          displayValue={`${currentMonthTrainings}`}
          sublabel="tréninků"
          description={isOnTrack ? 'Na dobré cestě' : 'Pod plánem'}
          variant={goalProgress >= 100 ? 'success' : isOnTrack ? 'primary' : 'warning'}
          size="md"
          onClick={() => onCardClick?.('monthly')}
        />
        
        {/* Total trainings */}
        <SparklineCard
          title="Celkem odtrénováno"
          value={`${stats?.completedTrainings || 0}`}
          subtitle="tréninků za období"
          data={sparklineData}
          trend={vsLastMonth?.trainings}
          variant="primary"
          icon={<Dumbbell className="h-4 w-4" />}
          onClick={() => onCardClick?.('trainings')}
        />
        
        {/* KEY: Average training price (actual) */}
        <MetricCard
          title="Průměr za trénink"
          value={formatCurrency(stats?.avgTrainingPriceActual || 0)}
          subtitle={
            stats?.avgTrainingPriceTrend !== 0 
              ? `${stats?.avgTrainingPriceTrend > 0 ? '+' : ''}${stats?.avgTrainingPriceTrend}% oproti min. měsíci`
              : 'skutečná cena'
          }
          progress={Math.min((stats?.avgTrainingPriceActual || 0) / 1000 * 100, 100)}
          variant={stats?.avgTrainingPriceTrend && stats.avgTrainingPriceTrend > 0 ? 'success' : 'blue'}
          icon={stats?.avgTrainingPriceTrend && stats.avgTrainingPriceTrend > 0 
            ? <TrendingUp className="h-4 w-4" /> 
            : stats?.avgTrainingPriceTrend && stats.avgTrainingPriceTrend < 0 
              ? <TrendingDown className="h-4 w-4" />
              : <Banknote className="h-4 w-4" />
          }
          onClick={() => onCardClick?.('training')}
        />

        {/* Late cancellations warning or active days */}
        {lateCancellations > 0 ? (
          <MetricCard
            title="Pozdní zrušení"
            value={`${lateCancellations}`}
            subtitle="<24h před tréninkem"
            progress={100}
            variant="destructive"
            icon={<XCircle className="h-4 w-4" />}
            onClick={() => onCardClick?.('cancellations')}
          />
        ) : (
          <MetricCard
            title="Aktivní dny"
            value={`${stats?.activeDays || 0}`}
            subtitle={`z ${stats?.totalDays || 0} dní`}
            progress={stats?.totalDays ? (stats.activeDays / stats.totalDays) * 100 : 0}
            variant="success"
            icon={<Target className="h-4 w-4" />}
            onClick={() => onCardClick?.('activity')}
            showProgressValue
          />
        )}
      </div>
    );
  }

  // "Přijaté" mode - focus on received payments & money flow
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* KEY METRIC 1: Received credit from clients */}
      <SparklineCard
        title="Přijatý kredit"
        value={formatCurrency(stats?.receivedCredit || 0)}
        subtitle="celkem od klientů"
        data={sparklineData}
        trend={creditTrend !== 0 ? creditTrend : undefined}
        variant="success"
        icon={<CreditCard className="h-4 w-4" />}
        onClick={() => onCardClick?.('income')}
      />
      
      {/* KEY METRIC 2: Total earned (trainings + products) */}
      <SparklineCard
        title="Odtrénováno"
        value={formatCurrency(stats?.totalIncome || 0)}
        subtitle="vydělané služby"
        data={sparklineData}
        trend={vsLastMonth?.revenue}
        variant="primary"
        icon={<Dumbbell className="h-4 w-4" />}
        onClick={() => onCardClick?.('training')}
      />
      
      {/* Average training price with trend */}
      <MetricCard
        title="Průměr za trénink"
        value={formatCurrency(stats?.avgTrainingPriceActual || 0)}
        subtitle={
          stats?.avgTrainingPriceTrend !== 0 
            ? `${stats?.avgTrainingPriceTrend > 0 ? '+' : ''}${stats?.avgTrainingPriceTrend}% vs min. měsíc`
            : 'skutečná cena'
        }
        progress={Math.min((stats?.avgTrainingPriceActual || 0) / 1000 * 100, 100)}
        variant={stats?.avgTrainingPriceTrend && stats.avgTrainingPriceTrend > 0 ? 'success' : 'blue'}
        icon={stats?.avgTrainingPriceTrend && stats.avgTrainingPriceTrend > 0 
          ? <TrendingUp className="h-4 w-4" /> 
          : stats?.avgTrainingPriceTrend && stats.avgTrainingPriceTrend < 0 
            ? <TrendingDown className="h-4 w-4" />
            : <Banknote className="h-4 w-4" />
        }
        onClick={() => onCardClick?.('training')}
      />

      {/* Pending payments or products */}
      {hasPendingPayments ? (
        <MetricCard
          title="Nezaplaceno"
          value={formatCurrency(stats?.pendingPayments?.amount || 0)}
          subtitle={`${stats?.pendingPayments?.count || 0} klientů`}
          progress={100}
          variant="destructive"
          icon={<AlertCircle className="h-4 w-4" />}
          onClick={() => onCardClick?.('pending')}
        />
      ) : (
        <MetricCard
          title="Produkty"
          value={formatCurrency(stats?.productIncome || 0)}
          subtitle={`${stats?.topProducts?.length || 0} produktů`}
          progress={stats?.totalIncome ? (stats.productIncome / stats.totalIncome) * 100 : 0}
          variant="warning"
          icon={<Wallet className="h-4 w-4" />}
          onClick={() => onCardClick?.('products')}
          showProgressValue
        />
      )}
    </div>
  );
}
