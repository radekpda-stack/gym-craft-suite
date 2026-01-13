import { useMemo } from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown,
  Trophy, 
  AlertTriangle, 
  Calendar,
  Users,
  Clock,
  Target,
  Percent,
  CreditCard,
  UserPlus
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import type { TrendData, FinanceMetrics, WeeklySummary, CapacityInfo } from '@/hooks/dashboard/types';
import type { ScheduleItem } from '@/types/training';

interface Insight {
  id: string;
  icon: React.ReactNode;
  text: string;
  type: 'success' | 'warning' | 'info';
  priority: number; // lower = higher priority
}

interface DashboardInsightsProps {
  trends: TrendData;
  finance: FinanceMetrics;
  weeklySummary: WeeklySummary;
  capacity: CapacityInfo;
  todaySchedule: ScheduleItem[];
  todayEstimatedIncome: number;
  isLoading?: boolean;
}

export function DashboardInsights({
  trends,
  finance,
  weeklySummary,
  capacity,
  todaySchedule,
  todayEstimatedIncome,
  isLoading
}: DashboardInsightsProps) {
  const { language } = useLanguage();

  const insights = useMemo(() => {
    const result: Insight[] = [];

    // === WARNING INSIGHTS (priority 1-10) ===

    // High cancellation rate
    if (trends.cancellationRate > 10) {
      result.push({
        id: 'high-cancellation',
        icon: <AlertTriangle className="w-4 h-4" />,
        text: language === 'cs' 
          ? `Míra zrušení: ${Math.round(trends.cancellationRate)}% (${trends.cancelledCount} tréninků)`
          : `Cancellation rate: ${Math.round(trends.cancellationRate)}% (${trends.cancelledCount} trainings)`,
        type: 'warning',
        priority: 1
      });
    }

    // Clients with low credit
    if (finance.creditAtRisk.count > 0) {
      result.push({
        id: 'low-credit',
        icon: <CreditCard className="w-4 h-4" />,
        text: language === 'cs'
          ? `${finance.creditAtRisk.count} klientů má kredit pod hranicí`
          : `${finance.creditAtRisk.count} clients have low credit`,
        type: 'warning',
        priority: 2
      });
    }

    // Unpaid trainings
    if (finance.unpaidTotal.count > 0) {
      result.push({
        id: 'unpaid',
        icon: <AlertTriangle className="w-4 h-4" />,
        text: language === 'cs'
          ? `${finance.unpaidTotal.count} tréninků čeká na platbu`
          : `${finance.unpaidTotal.count} trainings awaiting payment`,
        type: 'warning',
        priority: 3
      });
    }

    // === POSITIVE INSIGHTS (priority 11-30) ===

    // Income growing
    if (finance.incomeChange > 10) {
      result.push({
        id: 'income-growth',
        icon: <TrendingUp className="w-4 h-4" />,
        text: language === 'cs'
          ? `Příjmy rostou o ${Math.round(finance.incomeChange)}% oproti minulému měsíci`
          : `Income up ${Math.round(finance.incomeChange)}% vs last month`,
        type: 'success',
        priority: 11
      });
    } else if (finance.incomeChange < -10) {
      result.push({
        id: 'income-decline',
        icon: <TrendingDown className="w-4 h-4" />,
        text: language === 'cs'
          ? `Příjmy klesly o ${Math.abs(Math.round(finance.incomeChange))}% oproti minulému měsíci`
          : `Income down ${Math.abs(Math.round(finance.incomeChange))}% vs last month`,
        type: 'warning',
        priority: 4
      });
    }

    // Great retention rate
    if (trends.retentionRate >= 80) {
      result.push({
        id: 'retention',
        icon: <Target className="w-4 h-4" />,
        text: language === 'cs'
          ? `Retence klientů: ${Math.round(trends.retentionRate)}% – skvělé!`
          : `Client retention: ${Math.round(trends.retentionRate)}% – great!`,
        type: 'success',
        priority: 12
      });
    } else if (trends.retentionRate > 0 && trends.retentionRate < 60) {
      result.push({
        id: 'low-retention',
        icon: <Percent className="w-4 h-4" />,
        text: language === 'cs'
          ? `Retence klientů: ${Math.round(trends.retentionRate)}% – je co zlepšovat`
          : `Client retention: ${Math.round(trends.retentionRate)}% – room to improve`,
        type: 'warning',
        priority: 5
      });
    }

    // New clients this month
    if (trends.newClientsThisMonth > 0) {
      result.push({
        id: 'new-clients',
        icon: <UserPlus className="w-4 h-4" />,
        text: language === 'cs'
          ? `Tento měsíc ${trends.newClientsThisMonth} ${trends.newClientsThisMonth === 1 ? 'nový klient' : trends.newClientsThisMonth < 5 ? 'noví klienti' : 'nových klientů'}`
          : `${trends.newClientsThisMonth} new client${trends.newClientsThisMonth > 1 ? 's' : ''} this month`,
        type: 'success',
        priority: 13
      });
    }

    // Week trend
    if (weeklySummary.weekTrend === 'up') {
      const diff = weeklySummary.trainingsThisWeek - weeklySummary.trainingsLastWeek;
      result.push({
        id: 'week-up',
        icon: <TrendingUp className="w-4 h-4" />,
        text: language === 'cs'
          ? `Tento týden +${diff} tréninků oproti minulému`
          : `This week +${diff} trainings vs last week`,
        type: 'success',
        priority: 14
      });
    } else if (weeklySummary.weekTrend === 'down') {
      const diff = weeklySummary.trainingsLastWeek - weeklySummary.trainingsThisWeek;
      result.push({
        id: 'week-down',
        icon: <TrendingDown className="w-4 h-4" />,
        text: language === 'cs'
          ? `Tento týden -${diff} tréninků oproti minulému`
          : `This week -${diff} trainings vs last week`,
        type: 'info',
        priority: 25
      });
    }

    // === INFO INSIGHTS (priority 31-50) ===

    // Top client
    if (trends.topClientName && trends.topClientValue > 0) {
      result.push({
        id: 'top-client',
        icon: <Trophy className="w-4 h-4" />,
        text: language === 'cs'
          ? `Top klient: ${trends.topClientName} (${trends.topClientValue.toLocaleString('cs-CZ')} Kč)`
          : `Top client: ${trends.topClientName} (${trends.topClientValue.toLocaleString('en-US')} CZK)`,
        type: 'info',
        priority: 31
      });
    }

    // Busiest day
    if (trends.busiestDay && trends.busiestDayCount > 0) {
      result.push({
        id: 'busiest-day',
        icon: <Calendar className="w-4 h-4" />,
        text: language === 'cs'
          ? `${trends.busiestDay} je nejrušnější den (${trends.busiestDayCount} tréninků)`
          : `${trends.busiestDay} is your busiest day (${trends.busiestDayCount} trainings)`,
        type: 'info',
        priority: 32
      });
    }

    // Peak hour
    const peakHour = trends.hourDistribution?.reduce((max, h) => 
      h.count > max.count ? h : max, 
      { hour: 0, count: 0 }
    );
    if (peakHour && peakHour.count > 0) {
      result.push({
        id: 'peak-hour',
        icon: <Clock className="w-4 h-4" />,
        text: language === 'cs'
          ? `Nejvíce tréninků v ${peakHour.hour}:00 (${peakHour.count}×)`
          : `Most trainings at ${peakHour.hour}:00 (${peakHour.count}×)`,
        type: 'info',
        priority: 33
      });
    }

    // Active clients
    if (trends.activeClients > 0) {
      result.push({
        id: 'active-clients',
        icon: <Users className="w-4 h-4" />,
        text: language === 'cs'
          ? `${trends.activeClients} aktivních klientů z ${trends.totalClients}`
          : `${trends.activeClients} active clients of ${trends.totalClients}`,
        type: 'info',
        priority: 34
      });
    }

    // Capacity utilization
    if (capacity.percentUsed > 0) {
      result.push({
        id: 'capacity',
        icon: <Target className="w-4 h-4" />,
        text: language === 'cs'
          ? `Využití kapacity: ${Math.round(capacity.percentUsed)}%`
          : `Capacity utilization: ${Math.round(capacity.percentUsed)}%`,
        type: capacity.percentUsed > 80 ? 'success' : 'info',
        priority: capacity.percentUsed > 80 ? 15 : 35
      });
    }

    // Today's earnings
    if (todayEstimatedIncome > 0 && todaySchedule.length > 0) {
      result.push({
        id: 'today-income',
        icon: <TrendingUp className="w-4 h-4" />,
        text: language === 'cs'
          ? `Dnes očekáváte ${todayEstimatedIncome.toLocaleString('cs-CZ')} Kč z ${todaySchedule.length} tréninků`
          : `Today expecting ${todayEstimatedIncome.toLocaleString('en-US')} CZK from ${todaySchedule.length} trainings`,
        type: 'info',
        priority: 36
      });
    }

    // Sort by priority and take top 5
    return result.sort((a, b) => a.priority - b.priority).slice(0, 5);
  }, [trends, finance, weeklySummary, capacity, todaySchedule, todayEstimatedIncome, language]);

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-24 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-muted/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  const getTypeStyles = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'bg-success/10 text-success border-success/20';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'info':
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-warning" />
        <h3 className="font-medium text-sm">
          {language === 'cs' ? 'Postřehy' : 'Insights'}
        </h3>
      </div>
      
      <div className="grid gap-2">
        {insights.map(insight => (
          <div 
            key={insight.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg border ${getTypeStyles(insight.type)}`}
          >
            <span className="shrink-0">{insight.icon}</span>
            <span className="text-sm">{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
