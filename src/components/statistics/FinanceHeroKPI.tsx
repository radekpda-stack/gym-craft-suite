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
  XCircle
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
  // Calculate total hours from completed trainings
  // Assuming average training duration is 60 minutes if not tracked
  const totalHours = useMemo(() => {
    if (!stats) return 0;
    // Use completedTrainings count * average duration (assume 60 min if not available)
    return stats.completedTrainings;
  }, [stats]);

  const currentMonthIncome = stats?.monthlyTrend?.slice(-1)[0]?.income || 0;
  const currentMonthTrainings = stats?.monthlyTrend?.slice(-1)[0]?.trainings || 0;
  
  // Calculate goal progress based on mode
  const goalProgress = mode === 'performed'
    ? Math.min((currentMonthTrainings / (monthlyGoal / 1000)) * 100, 100) // Rough conversion
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
          subtitle="tréninků tento rok"
          data={sparklineData}
          trend={vsLastMonth?.trainings}
          variant="primary"
          icon={<Dumbbell className="h-4 w-4" />}
          onClick={() => onCardClick?.('trainings')}
        />
        
        {/* Average per week */}
        <MetricCard
          title="Průměr za týden"
          value={`${stats?.avgTrainingsPerWeek || 0}`}
          subtitle="tréninků týdně"
          progress={(stats?.avgTrainingsPerWeek || 0) / 5 * 100} // 5 trainings/week = 100%
          variant="blue"
          icon={<Clock className="h-4 w-4" />}
          onClick={() => onCardClick?.('weekly')}
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

  // "Přijaté" mode - focus on received payments
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Main metric: Monthly goal */}
      <GaugeCard
        title="Měsíční cíl"
        value={goalProgress}
        maxValue={100}
        displayValue={`${Math.round(goalProgress)}%`}
        sublabel="splněno"
        description={`${formatCurrency(currentMonthIncome)} z ${formatCurrency(monthlyGoal)}`}
        variant={goalProgress >= 100 ? 'success' : goalProgress >= 70 ? 'primary' : 'warning'}
        size="md"
        onClick={() => onCardClick?.('monthly')}
      />
      
      {/* Total received */}
      <SparklineCard
        title="Celkem přijato"
        value={formatCurrency(stats?.totalIncome || 0)}
        subtitle="tento rok"
        data={sparklineData}
        trend={vsLastMonth?.revenue}
        variant="success"
        icon={<Wallet className="h-4 w-4" />}
        onClick={() => onCardClick?.('income')}
      />
      
      {/* Trainings count this year */}
      <MetricCard
        title="Tréninků celkem"
        value={`${stats?.completedTrainings || 0}`}
        subtitle="tento rok"
        progress={Math.min((stats?.completedTrainings || 0) / 200 * 100, 100)} // 200 trainings = 100%
        variant="blue"
        icon={<Dumbbell className="h-4 w-4" />}
        onClick={() => onCardClick?.('trainings')}
      />

      {/* Pending payments or product income */}
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
          icon={<Dumbbell className="h-4 w-4" />}
          onClick={() => onCardClick?.('products')}
          showProgressValue
        />
      )}
    </div>
  );
}
