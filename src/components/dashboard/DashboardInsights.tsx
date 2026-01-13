import { useState, useMemo, useCallback } from 'react';
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
  UserPlus,
  ChevronRight,
  RefreshCw,
  DollarSign,
  BarChart3,
  Star,
  Activity,
  Zap
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { InsightDetailSheet } from './InsightDetailSheet';
import type { TrendData, FinanceMetrics, WeeklySummary, CapacityInfo } from '@/hooks/dashboard/types';
import type { ScheduleItem } from '@/types/training';

interface InsightDetail {
  title: string;
  description: string;
  metric?: {
    value: string;
    label: string;
    trend?: 'up' | 'down' | 'stable';
  };
  breakdown?: {
    items: { label: string; value: string }[];
  };
  tip?: string;
  actionLabel?: string;
  actionUrl?: string;
}

interface Insight {
  id: string;
  icon: React.ReactNode;
  text: string;
  type: 'success' | 'warning' | 'info';
  priority: number;
  detail?: InsightDetail;
}

export type InsightWithDetail = Insight;

interface DashboardInsightsProps {
  trends: TrendData;
  finance: FinanceMetrics;
  weeklySummary: WeeklySummary;
  capacity: CapacityInfo;
  todaySchedule: ScheduleItem[];
  todayEstimatedIncome: number;
  isLoading?: boolean;
}

// Seeded random for consistent shuffle per session
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;
  
  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
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
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now());

  const handleRefresh = useCallback(() => {
    setShuffleSeed(Date.now());
  }, []);

  const allInsights = useMemo(() => {
    const result: Insight[] = [];
    const cs = language === 'cs';

    // === WARNING INSIGHTS (priority 1-10) - Always shown ===

    // High cancellation rate
    if (trends.cancellationRate > 10) {
      result.push({
        id: 'high-cancellation',
        icon: <AlertTriangle className="w-4 h-4" />,
        text: cs 
          ? `Míra zrušení: ${Math.round(trends.cancellationRate)}%`
          : `Cancellation rate: ${Math.round(trends.cancellationRate)}%`,
        type: 'warning',
        priority: 1,
        detail: {
          title: cs ? 'Vysoká míra zrušení' : 'High Cancellation Rate',
          description: cs 
            ? `Za tento měsíc bylo zrušeno ${trends.cancelledCount} tréninků, což představuje ${Math.round(trends.cancellationRate)}% všech naplánovaných.`
            : `${trends.cancelledCount} trainings were cancelled this month, representing ${Math.round(trends.cancellationRate)}% of all scheduled.`,
          metric: {
            value: `${Math.round(trends.cancellationRate)}%`,
            label: cs ? 'Míra zrušení' : 'Cancellation Rate',
            trend: 'down'
          },
          tip: cs 
            ? 'Zvažte zavedení storno poplatku nebo připomínek před tréninkem.'
            : 'Consider implementing cancellation fees or pre-training reminders.',
          actionLabel: cs ? 'Zobrazit zrušené' : 'View Cancelled',
          actionUrl: '/trainings?filter=cancelled'
        }
      });
    }

    // Clients with low credit
    if (finance.creditAtRisk.count > 0) {
      result.push({
        id: 'low-credit',
        icon: <CreditCard className="w-4 h-4" />,
        text: cs
          ? `${finance.creditAtRisk.count} klientů má nízký kredit`
          : `${finance.creditAtRisk.count} clients have low credit`,
        type: 'warning',
        priority: 2,
        detail: {
          title: cs ? 'Klienti s nízkým kreditem' : 'Low Credit Clients',
          description: cs
            ? `${finance.creditAtRisk.count} klientů má kredit pod stanovenou hranicí. Celková částka v ohrožení: ${finance.creditAtRisk.amount.toLocaleString('cs-CZ')} Kč.`
            : `${finance.creditAtRisk.count} clients have credit below the threshold. Total amount at risk: ${finance.creditAtRisk.amount.toLocaleString('en-US')} CZK.`,
          metric: {
            value: `${finance.creditAtRisk.amount.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč`,
            label: cs ? 'Ohrožená částka' : 'Amount at Risk',
            trend: 'down'
          },
          actionLabel: cs ? 'Zobrazit klienty' : 'View Clients',
          actionUrl: '/clients?filter=lowCredit'
        }
      });
    }

    // Unpaid trainings
    if (finance.unpaidTotal.count > 0) {
      result.push({
        id: 'unpaid',
        icon: <AlertTriangle className="w-4 h-4" />,
        text: cs
          ? `${finance.unpaidTotal.count} tréninků čeká na platbu`
          : `${finance.unpaidTotal.count} trainings awaiting payment`,
        type: 'warning',
        priority: 3,
        detail: {
          title: cs ? 'Neuhrazené tréninky' : 'Unpaid Trainings',
          description: cs
            ? `Celkem ${finance.unpaidTotal.count} tréninků v hodnotě ${finance.unpaidTotal.amount.toLocaleString('cs-CZ')} Kč čeká na úhradu.`
            : `${finance.unpaidTotal.count} trainings worth ${finance.unpaidTotal.amount.toLocaleString('en-US')} CZK are awaiting payment.`,
          metric: {
            value: `${finance.unpaidTotal.amount.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč`,
            label: cs ? 'Neuhrazeno' : 'Unpaid',
            trend: 'down'
          },
          actionLabel: cs ? 'Zobrazit neuhrazené' : 'View Unpaid',
          actionUrl: '/trainings?filter=unpaid'
        }
      });
    }

    // Income decline
    if (finance.incomeChange < -10) {
      result.push({
        id: 'income-decline',
        icon: <TrendingDown className="w-4 h-4" />,
        text: cs
          ? `Příjmy klesly o ${Math.abs(Math.round(finance.incomeChange))}%`
          : `Income down ${Math.abs(Math.round(finance.incomeChange))}%`,
        type: 'warning',
        priority: 4,
        detail: {
          title: cs ? 'Pokles příjmů' : 'Income Decline',
          description: cs
            ? `Příjmy tento měsíc jsou o ${Math.abs(Math.round(finance.incomeChange))}% nižší než minulý měsíc.`
            : `Income this month is ${Math.abs(Math.round(finance.incomeChange))}% lower than last month.`,
          metric: {
            value: `${finance.monthlyIncome.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč`,
            label: cs ? 'Tento měsíc' : 'This Month',
            trend: 'down'
          },
          breakdown: {
            items: [
              { label: cs ? 'Tento měsíc' : 'This month', value: `${finance.monthlyIncome.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč` },
              { label: cs ? 'Minulý měsíc' : 'Last month', value: `${finance.lastMonthIncome.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč` }
            ]
          },
          actionLabel: cs ? 'Zobrazit statistiky' : 'View Statistics',
          actionUrl: '/statistics'
        }
      });
    }

    // Low retention
    if (trends.retentionRate > 0 && trends.retentionRate < 60) {
      result.push({
        id: 'low-retention',
        icon: <Percent className="w-4 h-4" />,
        text: cs
          ? `Retence klientů: ${Math.round(trends.retentionRate)}%`
          : `Client retention: ${Math.round(trends.retentionRate)}%`,
        type: 'warning',
        priority: 5,
        detail: {
          title: cs ? 'Nízká retence klientů' : 'Low Client Retention',
          description: cs
            ? `Pouze ${Math.round(trends.retentionRate)}% klientů se vrací na další tréninky. Průměr v oboru je 70-80%.`
            : `Only ${Math.round(trends.retentionRate)}% of clients return for more trainings. Industry average is 70-80%.`,
          metric: {
            value: `${Math.round(trends.retentionRate)}%`,
            label: cs ? 'Retence' : 'Retention',
            trend: 'down'
          },
          tip: cs
            ? 'Zvažte follow-up zprávy nebo věrnostní program.'
            : 'Consider follow-up messages or a loyalty program.',
          actionLabel: cs ? 'Zobrazit klienty' : 'View Clients',
          actionUrl: '/clients'
        }
      });
    }

    // === POSITIVE INSIGHTS (priority 11-30) ===

    // Income growing
    if (finance.incomeChange > 10) {
      result.push({
        id: 'income-growth',
        icon: <TrendingUp className="w-4 h-4" />,
        text: cs
          ? `Příjmy rostou o ${Math.round(finance.incomeChange)}%`
          : `Income up ${Math.round(finance.incomeChange)}%`,
        type: 'success',
        priority: 11,
        detail: {
          title: cs ? 'Růst příjmů' : 'Income Growth',
          description: cs
            ? `Skvělá práce! Vaše příjmy jsou o ${Math.round(finance.incomeChange)}% vyšší než minulý měsíc.`
            : `Great job! Your income is ${Math.round(finance.incomeChange)}% higher than last month.`,
          metric: {
            value: `+${Math.round(finance.incomeChange)}%`,
            label: cs ? 'Nárůst' : 'Growth',
            trend: 'up'
          },
          breakdown: {
            items: [
              { label: cs ? 'Tento měsíc' : 'This month', value: `${finance.monthlyIncome.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč` },
              { label: cs ? 'Minulý měsíc' : 'Last month', value: `${finance.lastMonthIncome.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč` }
            ]
          },
          actionLabel: cs ? 'Zobrazit statistiky' : 'View Statistics',
          actionUrl: '/statistics'
        }
      });
    }

    // Great retention rate
    if (trends.retentionRate >= 80) {
      result.push({
        id: 'retention',
        icon: <Target className="w-4 h-4" />,
        text: cs
          ? `Retence klientů: ${Math.round(trends.retentionRate)}% 🎉`
          : `Client retention: ${Math.round(trends.retentionRate)}% 🎉`,
        type: 'success',
        priority: 12,
        detail: {
          title: cs ? 'Výborná retence' : 'Excellent Retention',
          description: cs
            ? `${Math.round(trends.retentionRate)}% vašich klientů se vrací! To je nadprůměrný výsledek.`
            : `${Math.round(trends.retentionRate)}% of your clients return! That's above average.`,
          metric: {
            value: `${Math.round(trends.retentionRate)}%`,
            label: cs ? 'Retence' : 'Retention',
            trend: 'up'
          }
        }
      });
    }

    // New clients this month
    if (trends.newClientsThisMonth > 0) {
      result.push({
        id: 'new-clients',
        icon: <UserPlus className="w-4 h-4" />,
        text: cs
          ? `+${trends.newClientsThisMonth} ${trends.newClientsThisMonth === 1 ? 'nový klient' : trends.newClientsThisMonth < 5 ? 'noví klienti' : 'nových klientů'}`
          : `+${trends.newClientsThisMonth} new client${trends.newClientsThisMonth > 1 ? 's' : ''}`,
        type: 'success',
        priority: 13,
        detail: {
          title: cs ? 'Noví klienti' : 'New Clients',
          description: cs
            ? `Tento měsíc jste získali ${trends.newClientsThisMonth} ${trends.newClientsThisMonth === 1 ? 'nového klienta' : 'nových klientů'}.`
            : `You gained ${trends.newClientsThisMonth} new client${trends.newClientsThisMonth > 1 ? 's' : ''} this month.`,
          metric: {
            value: `+${trends.newClientsThisMonth}`,
            label: cs ? 'Noví klienti' : 'New Clients',
            trend: 'up'
          },
          actionLabel: cs ? 'Zobrazit klienty' : 'View Clients',
          actionUrl: '/clients?sort=newest'
        }
      });
    }

    // Week trend up
    if (weeklySummary.weekTrend === 'up') {
      const diff = weeklySummary.trainingsThisWeek - weeklySummary.trainingsLastWeek;
      result.push({
        id: 'week-up',
        icon: <TrendingUp className="w-4 h-4" />,
        text: cs
          ? `Tento týden +${diff} tréninků`
          : `This week +${diff} trainings`,
        type: 'success',
        priority: 14,
        detail: {
          title: cs ? 'Týdenní růst' : 'Weekly Growth',
          description: cs
            ? `Tento týden máte o ${diff} tréninků více než minulý týden.`
            : `You have ${diff} more trainings this week than last week.`,
          metric: {
            value: `${weeklySummary.trainingsThisWeek}`,
            label: cs ? 'Tréninků tento týden' : 'Trainings This Week',
            trend: 'up'
          },
          breakdown: {
            items: [
              { label: cs ? 'Tento týden' : 'This week', value: `${weeklySummary.trainingsThisWeek}` },
              { label: cs ? 'Minulý týden' : 'Last week', value: `${weeklySummary.trainingsLastWeek}` }
            ]
          }
        }
      });
    }

    // High capacity utilization
    if (capacity.percentUsed > 80) {
      result.push({
        id: 'high-capacity',
        icon: <Zap className="w-4 h-4" />,
        text: cs
          ? `Kapacita: ${Math.round(capacity.percentUsed)}% využito`
          : `Capacity: ${Math.round(capacity.percentUsed)}% utilized`,
        type: 'success',
        priority: 15,
        detail: {
          title: cs ? 'Vysoké využití kapacity' : 'High Capacity Utilization',
          description: cs
            ? `Využíváte ${Math.round(capacity.percentUsed)}% své kapacity. Skvělá práce!`
            : `You're utilizing ${Math.round(capacity.percentUsed)}% of your capacity. Great work!`,
          metric: {
            value: `${Math.round(capacity.percentUsed)}%`,
            label: cs ? 'Využití' : 'Utilization',
            trend: 'up'
          },
          breakdown: {
            items: [
              { label: cs ? 'Dokončeno' : 'Completed', value: `${capacity.completed}` },
              { label: cs ? 'Naplánováno' : 'Scheduled', value: `${capacity.scheduled}` },
              { label: cs ? 'Kapacita' : 'Capacity', value: `${capacity.total}` }
            ]
          }
        }
      });
    }

    // === INFO INSIGHTS (priority 31-60) ===

    // Top client
    if (trends.topClientName && trends.topClientValue > 0) {
      result.push({
        id: 'top-client',
        icon: <Trophy className="w-4 h-4" />,
        text: cs
          ? `Top klient: ${trends.topClientName}`
          : `Top client: ${trends.topClientName}`,
        type: 'info',
        priority: 31,
        detail: {
          title: cs ? 'Váš nejlepší klient' : 'Your Top Client',
          description: cs
            ? `${trends.topClientName} je váš nejhodnotnější klient tento měsíc.`
            : `${trends.topClientName} is your most valuable client this month.`,
          metric: {
            value: `${trends.topClientValue.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč`,
            label: cs ? 'Celková útrata' : 'Total Spent'
          },
          actionLabel: cs ? 'Zobrazit profil' : 'View Profile',
          actionUrl: '/clients'
        }
      });
    }

    // Busiest day
    if (trends.busiestDay && trends.busiestDayCount > 0) {
      result.push({
        id: 'busiest-day',
        icon: <Calendar className="w-4 h-4" />,
        text: cs
          ? `Nejrušnější den: ${trends.busiestDay}`
          : `Busiest day: ${trends.busiestDay}`,
        type: 'info',
        priority: 32,
        detail: {
          title: cs ? 'Nejrušnější den v týdnu' : 'Busiest Day of Week',
          description: cs
            ? `${trends.busiestDay} je váš nejrušnější den s ${trends.busiestDayCount} tréninky.`
            : `${trends.busiestDay} is your busiest day with ${trends.busiestDayCount} trainings.`,
          metric: {
            value: `${trends.busiestDayCount}`,
            label: cs ? 'Tréninků' : 'Trainings'
          },
          tip: cs
            ? 'Zvažte rozšíření kapacity v tento den nebo nabídku alternativ v jiné dny.'
            : 'Consider expanding capacity on this day or offering alternatives on other days.'
        }
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
        text: cs
          ? `Špička v ${peakHour.hour}:00`
          : `Peak at ${peakHour.hour}:00`,
        type: 'info',
        priority: 33,
        detail: {
          title: cs ? 'Nejoblíbenější hodina' : 'Most Popular Hour',
          description: cs
            ? `Většina vašich tréninků probíhá v ${peakHour.hour}:00 (${peakHour.count} tréninků).`
            : `Most of your trainings happen at ${peakHour.hour}:00 (${peakHour.count} trainings).`,
          metric: {
            value: `${peakHour.hour}:00`,
            label: cs ? 'Špičková hodina' : 'Peak Hour'
          },
          breakdown: trends.hourDistribution ? {
            items: trends.hourDistribution
              .filter(h => h.count > 0)
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map(h => ({ 
                label: `${h.hour}:00`, 
                value: `${h.count}×` 
              }))
          } : undefined
        }
      });
    }

    // Active clients ratio
    if (trends.activeClients > 0 && trends.totalClients > 0) {
      const activeRatio = Math.round((trends.activeClients / trends.totalClients) * 100);
      result.push({
        id: 'active-ratio',
        icon: <Activity className="w-4 h-4" />,
        text: cs
          ? `${activeRatio}% klientů aktivních`
          : `${activeRatio}% clients active`,
        type: activeRatio > 70 ? 'success' : 'info',
        priority: activeRatio > 70 ? 16 : 34,
        detail: {
          title: cs ? 'Aktivita klientů' : 'Client Activity',
          description: cs
            ? `${trends.activeClients} z ${trends.totalClients} klientů bylo aktivních v posledních 30 dnech.`
            : `${trends.activeClients} of ${trends.totalClients} clients were active in the last 30 days.`,
          metric: {
            value: `${activeRatio}%`,
            label: cs ? 'Aktivní klienti' : 'Active Clients',
            trend: activeRatio > 70 ? 'up' : 'stable'
          },
          breakdown: {
            items: [
              { label: cs ? 'Aktivní' : 'Active', value: `${trends.activeClients}` },
              { label: cs ? 'Celkem' : 'Total', value: `${trends.totalClients}` }
            ]
          },
          actionLabel: cs ? 'Zobrazit neaktivní' : 'View Inactive',
          actionUrl: '/clients?filter=inactive'
        }
      });
    }

    // Average training price
    if (finance.avgPerTraining > 0) {
      const priceChange = finance.lastMonthAvgPerTraining > 0 
        ? ((finance.avgPerTraining - finance.lastMonthAvgPerTraining) / finance.lastMonthAvgPerTraining * 100)
        : 0;
      result.push({
        id: 'avg-price',
        icon: <DollarSign className="w-4 h-4" />,
        text: cs
          ? `Průměr: ${Math.round(finance.avgPerTraining).toLocaleString('cs-CZ')} Kč/trénink`
          : `Avg: ${Math.round(finance.avgPerTraining).toLocaleString('en-US')} CZK/training`,
        type: 'info',
        priority: 35,
        detail: {
          title: cs ? 'Průměrná cena tréninku' : 'Average Training Price',
          description: cs
            ? `Vaše průměrná cena za trénink je ${Math.round(finance.avgPerTraining).toLocaleString('cs-CZ')} Kč.`
            : `Your average training price is ${Math.round(finance.avgPerTraining).toLocaleString('en-US')} CZK.`,
          metric: {
            value: `${Math.round(finance.avgPerTraining).toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč`,
            label: cs ? 'Průměr' : 'Average',
            trend: priceChange > 5 ? 'up' : priceChange < -5 ? 'down' : 'stable'
          },
          breakdown: finance.lastMonthAvgPerTraining > 0 ? {
            items: [
              { label: cs ? 'Tento měsíc' : 'This month', value: `${Math.round(finance.avgPerTraining).toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč` },
              { label: cs ? 'Minulý měsíc' : 'Last month', value: `${Math.round(finance.lastMonthAvgPerTraining).toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč` }
            ]
          } : undefined
        }
      });
    }

    // Training types breakdown
    const { solo, duo, group } = finance.trainingsByParticipants || {};
    const totalByType = (solo?.count || 0) + (duo?.count || 0) + (group?.count || 0);
    if (totalByType > 0) {
      const dominantType = solo?.count >= duo?.count && solo?.count >= group?.count ? 'solo'
        : duo?.count >= group?.count ? 'duo' : 'group';
      const dominantPercent = Math.round(((finance.trainingsByParticipants[dominantType]?.count || 0) / totalByType) * 100);
      
      result.push({
        id: 'training-types',
        icon: <BarChart3 className="w-4 h-4" />,
        text: cs
          ? `${dominantPercent}% ${dominantType === 'solo' ? 'individuálních' : dominantType === 'duo' ? 'duo' : 'skupinových'}`
          : `${dominantPercent}% ${dominantType} trainings`,
        type: 'info',
        priority: 36,
        detail: {
          title: cs ? 'Typy tréninků' : 'Training Types',
          description: cs
            ? `Rozdělení vašich tréninků podle počtu účastníků.`
            : `Breakdown of your trainings by participant count.`,
          breakdown: {
            items: [
              { 
                label: cs ? 'Individuální' : 'Solo', 
                value: `${solo?.count || 0} (${Math.round((solo?.avgPrice || 0))} Kč/ø)` 
              },
              { 
                label: 'Duo', 
                value: `${duo?.count || 0} (${Math.round((duo?.avgPrice || 0))} Kč/ø)` 
              },
              { 
                label: cs ? 'Skupinové' : 'Group', 
                value: `${group?.count || 0} (${Math.round((group?.avgPrice || 0))} Kč/ø)` 
              }
            ]
          }
        }
      });
    }

    // Capacity info (when not high)
    if (capacity.percentUsed > 0 && capacity.percentUsed <= 80) {
      result.push({
        id: 'capacity',
        icon: <Target className="w-4 h-4" />,
        text: cs
          ? `Kapacita: ${Math.round(capacity.percentUsed)}%`
          : `Capacity: ${Math.round(capacity.percentUsed)}%`,
        type: 'info',
        priority: 37,
        detail: {
          title: cs ? 'Využití kapacity' : 'Capacity Utilization',
          description: cs
            ? `Tento měsíc využíváte ${Math.round(capacity.percentUsed)}% své kapacity.`
            : `You're using ${Math.round(capacity.percentUsed)}% of your capacity this month.`,
          metric: {
            value: `${Math.round(capacity.percentUsed)}%`,
            label: cs ? 'Využití' : 'Utilization',
            trend: 'stable'
          },
          breakdown: {
            items: [
              { label: cs ? 'Dokončeno' : 'Completed', value: `${capacity.completed}` },
              { label: cs ? 'Naplánováno' : 'Scheduled', value: `${capacity.scheduled}` },
              { label: cs ? 'Kapacita' : 'Capacity', value: `${capacity.total}` }
            ]
          },
          tip: cs
            ? `Máte prostor pro dalších ${capacity.total - capacity.completed - capacity.scheduled} tréninků.`
            : `You have room for ${capacity.total - capacity.completed - capacity.scheduled} more trainings.`
        }
      });
    }

    // Today's earnings
    if (todayEstimatedIncome > 0 && todaySchedule.length > 0) {
      result.push({
        id: 'today-income',
        icon: <Star className="w-4 h-4" />,
        text: cs
          ? `Dnes: ${todayEstimatedIncome.toLocaleString('cs-CZ')} Kč`
          : `Today: ${todayEstimatedIncome.toLocaleString('en-US')} CZK`,
        type: 'info',
        priority: 38,
        detail: {
          title: cs ? 'Dnešní příjem' : "Today's Income",
          description: cs
            ? `Z ${todaySchedule.length} naplánovaných tréninků očekáváte ${todayEstimatedIncome.toLocaleString('cs-CZ')} Kč.`
            : `From ${todaySchedule.length} scheduled trainings, you expect ${todayEstimatedIncome.toLocaleString('en-US')} CZK.`,
          metric: {
            value: `${todayEstimatedIncome.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč`,
            label: cs ? 'Očekávaný příjem' : 'Expected Income'
          },
          actionLabel: cs ? 'Zobrazit rozvrh' : 'View Schedule',
          actionUrl: '/schedule'
        }
      });
    }

    // Week trend down (informative, not warning)
    if (weeklySummary.weekTrend === 'down') {
      const diff = weeklySummary.trainingsLastWeek - weeklySummary.trainingsThisWeek;
      result.push({
        id: 'week-down',
        icon: <TrendingDown className="w-4 h-4" />,
        text: cs
          ? `Tento týden -${diff} tréninků`
          : `This week -${diff} trainings`,
        type: 'info',
        priority: 39,
        detail: {
          title: cs ? 'Týdenní pokles' : 'Weekly Decline',
          description: cs
            ? `Tento týden máte o ${diff} tréninků méně než minulý.`
            : `You have ${diff} fewer trainings this week than last.`,
          metric: {
            value: `${weeklySummary.trainingsThisWeek}`,
            label: cs ? 'Tréninků tento týden' : 'Trainings This Week',
            trend: 'down'
          },
          breakdown: {
            items: [
              { label: cs ? 'Tento týden' : 'This week', value: `${weeklySummary.trainingsThisWeek}` },
              { label: cs ? 'Minulý týden' : 'Last week', value: `${weeklySummary.trainingsLastWeek}` }
            ]
          }
        }
      });
    }

    // Monthly income info
    if (finance.monthlyIncome > 0) {
      result.push({
        id: 'monthly-income',
        icon: <DollarSign className="w-4 h-4" />,
        text: cs
          ? `Tento měsíc: ${finance.monthlyIncome.toLocaleString('cs-CZ')} Kč`
          : `This month: ${finance.monthlyIncome.toLocaleString('en-US')} CZK`,
        type: 'info',
        priority: 40,
        detail: {
          title: cs ? 'Měsíční příjem' : 'Monthly Income',
          description: cs
            ? `Váš celkový příjem za tento měsíc z ${finance.trainingsWithPriceCount} tréninků.`
            : `Your total income this month from ${finance.trainingsWithPriceCount} trainings.`,
          metric: {
            value: `${finance.monthlyIncome.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč`,
            label: cs ? 'Celkem' : 'Total',
            trend: finance.incomeChange > 5 ? 'up' : finance.incomeChange < -5 ? 'down' : 'stable'
          },
          breakdown: finance.lastMonthIncome > 0 ? {
            items: [
              { label: cs ? 'Tento měsíc' : 'This month', value: `${finance.monthlyIncome.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč` },
              { label: cs ? 'Minulý měsíc' : 'Last month', value: `${finance.lastMonthIncome.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč` }
            ]
          } : undefined,
          actionLabel: cs ? 'Zobrazit statistiky' : 'View Statistics',
          actionUrl: '/statistics'
        }
      });
    }

    // Total clients info
    if (trends.totalClients > 0) {
      result.push({
        id: 'total-clients',
        icon: <Users className="w-4 h-4" />,
        text: cs
          ? `Celkem ${trends.totalClients} klientů`
          : `${trends.totalClients} total clients`,
        type: 'info',
        priority: 41,
        detail: {
          title: cs ? 'Vaše klientela' : 'Your Clients',
          description: cs
            ? `Máte celkem ${trends.totalClients} klientů, z toho ${trends.activeClients} aktivních.`
            : `You have ${trends.totalClients} total clients, ${trends.activeClients} active.`,
          metric: {
            value: `${trends.totalClients}`,
            label: cs ? 'Celkem klientů' : 'Total Clients'
          },
          actionLabel: cs ? 'Zobrazit klienty' : 'View Clients',
          actionUrl: '/clients'
        }
      });
    }

    return result;
  }, [trends, finance, weeklySummary, capacity, todaySchedule, todayEstimatedIncome, language]);

  // Select insights with rotation
  const displayedInsights = useMemo(() => {
    // Separate warnings (always show) from others
    const warnings = allInsights.filter(i => i.type === 'warning');
    const positive = allInsights.filter(i => i.type === 'success');
    const informative = allInsights.filter(i => i.type === 'info');

    // Shuffle non-warning insights
    const shuffledPositive = seededShuffle(positive, shuffleSeed);
    const shuffledInfo = seededShuffle(informative, shuffleSeed + 1);

    // Build final list
    const result: Insight[] = [];
    
    // Add all warnings (max 3)
    result.push(...warnings.slice(0, 3));
    
    // Add 1-2 positive insights
    result.push(...shuffledPositive.slice(0, 2));
    
    // Fill remaining slots with informative (up to 6 total)
    const remaining = 6 - result.length;
    result.push(...shuffledInfo.slice(0, remaining));

    // Sort by priority for final display
    return result.sort((a, b) => a.priority - b.priority).slice(0, 6);
  }, [allInsights, shuffleSeed]);

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

  if (displayedInsights.length === 0) {
    return null;
  }

  const getTypeStyles = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'bg-success/10 text-success border-success/20 hover:bg-success/15';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15';
      case 'info':
      default:
        return 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15';
    }
  };

  return (
    <>
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-warning" />
            <h3 className="font-medium text-sm">
              {language === 'cs' ? 'Postřehy' : 'Insights'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {language === 'cs' ? 'Další' : 'More'}
          </Button>
        </div>
        
        <div className="grid gap-2">
          {displayedInsights.map(insight => (
            <button 
              key={insight.id}
              onClick={() => setSelectedInsight(insight)}
              className={`flex items-center gap-3 p-2.5 rounded-lg border w-full text-left transition-all cursor-pointer ${getTypeStyles(insight.type)}`}
            >
              <span className="shrink-0">{insight.icon}</span>
              <span className="text-sm flex-1">{insight.text}</span>
              <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      <InsightDetailSheet
        insight={selectedInsight}
        open={!!selectedInsight}
        onOpenChange={(open) => !open && setSelectedInsight(null)}
      />
    </>
  );
}
