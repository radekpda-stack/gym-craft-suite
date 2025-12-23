import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insight {
  type: 'positive' | 'negative' | 'warning' | 'neutral';
  message: string;
}

interface InsightsBarProps {
  insights: Insight[];
  className?: string;
}

export function InsightsBar({ insights, className }: InsightsBarProps) {
  if (insights.length === 0) return null;

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-success flex-shrink-0" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-destructive flex-shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
    }
  };

  const getStyles = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-success/10 border-success/20 text-success';
      case 'negative':
        return 'bg-destructive/10 border-destructive/20 text-destructive';
      case 'warning':
        return 'bg-warning/10 border-warning/20 text-warning';
      default:
        return 'bg-muted/50 border-border text-muted-foreground';
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {insights.map((insight, idx) => (
        <div
          key={idx}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium',
            getStyles(insight.type)
          )}
        >
          {getIcon(insight.type)}
          <span>{insight.message}</span>
        </div>
      ))}
    </div>
  );
}

// Generate insights based on stats data
export function generateFinanceInsights(
  stats: {
    totalIncome: number;
    trainingIncome: number;
    productIncome: number;
    completedTrainings: number;
    pendingPayments?: { count: number; amount: number };
  } | null | undefined,
  vsLastMonth?: { revenue?: number; trainings?: number }
): Insight[] {
  if (!stats) return [];

  const insights: Insight[] = [];

  // Revenue trend
  if (vsLastMonth?.revenue !== undefined) {
    if (vsLastMonth.revenue > 10) {
      insights.push({
        type: 'positive',
        message: `Příjem +${vsLastMonth.revenue}% vs minulý měsíc`,
      });
    } else if (vsLastMonth.revenue < -10) {
      insights.push({
        type: 'negative',
        message: `Příjem ${vsLastMonth.revenue}% vs minulý měsíc`,
      });
    }
  }

  // Training trend vs revenue
  if (vsLastMonth?.revenue !== undefined && vsLastMonth?.trainings !== undefined) {
    if (vsLastMonth.revenue > 5 && vsLastMonth.trainings < -5) {
      insights.push({
        type: 'warning',
        message: 'Příjem roste, ale počet tréninků klesá',
      });
    } else if (vsLastMonth.revenue < -5 && vsLastMonth.trainings > 5) {
      insights.push({
        type: 'warning',
        message: 'Více tréninků, ale nižší příjem',
      });
    }
  }

  // Pending payments
  if (stats.pendingPayments && stats.pendingPayments.count > 0) {
    insights.push({
      type: 'warning',
      message: `${stats.pendingPayments.count} klientů má nezaplacenou lekci`,
    });
  }

  // Product vs training income balance
  const productShare = stats.totalIncome > 0 
    ? (stats.productIncome / stats.totalIncome) * 100 
    : 0;
  if (productShare > 30) {
    insights.push({
      type: 'positive',
      message: `${Math.round(productShare)}% příjmu z produktů`,
    });
  }

  return insights;
}

export function generateExerciseInsights(
  stats: {
    totalPRs: number;
    totalExerciseEntries: number;
    uniqueExercises: number;
  } | null | undefined
): Insight[] {
  if (!stats) return [];

  const insights: Insight[] = [];

  // PR rate
  const prRate = stats.totalExerciseEntries > 0 
    ? (stats.totalPRs / stats.totalExerciseEntries) * 100 
    : 0;

  if (prRate > 5) {
    insights.push({
      type: 'positive',
      message: `${prRate.toFixed(1)}% záznamů jsou PR`,
    });
  } else if (stats.totalExerciseEntries > 100 && prRate < 1) {
    insights.push({
      type: 'neutral',
      message: 'Málo nových rekordů - klienti stagnují?',
    });
  }

  // Exercise variety
  if (stats.uniqueExercises > 50) {
    insights.push({
      type: 'positive',
      message: `Vysoká variabilita: ${stats.uniqueExercises} různých cviků`,
    });
  }

  return insights;
}

export function generateClientInsights(
  stats: {
    activeClients30Days?: number;
    churnedClients?: number;
    newClients?: number;
  } | null | undefined,
  retentionRate?: number
): Insight[] {
  if (!stats) return [];

  const insights: Insight[] = [];

  // Retention
  if (retentionRate !== undefined) {
    if (retentionRate >= 85) {
      insights.push({
        type: 'positive',
        message: `Výborná retence: ${retentionRate}%`,
      });
    } else if (retentionRate < 60) {
      insights.push({
        type: 'negative',
        message: `Nízká retence: ${retentionRate}%`,
      });
    }
  }

  // Churn warning
  if (stats.churnedClients && stats.churnedClients > 3) {
    insights.push({
      type: 'warning',
      message: `${stats.churnedClients} klientů odešlo (60+ dní neaktivní)`,
    });
  }

  // New clients
  if (stats.newClients && stats.newClients > 0) {
    insights.push({
      type: 'positive',
      message: `${stats.newClients} nových klientů (≤30 dní)`,
    });
  }

  return insights;
}
