/**
 * Insight generators for dashboard
 * Extracted from DashboardInsights for maintainability
 */

import { 
  TrendingUp, 
  TrendingDown,
  Trophy, 
  AlertTriangle, 
  Calendar,
  Users,
  Clock,
  Target,
  Percent,
  UserPlus,
  DollarSign,
  BarChart3,
  Star,
  Activity,
  Zap
} from 'lucide-react';
import { createElement } from 'react';
import type { Insight, InsightGeneratorContext } from './insightTypes';

// Helper to create icon elements
const icon = (Icon: any) => createElement(Icon, { className: 'w-4 h-4' });

/**
 * Generate warning insights (priority 1-10)
 */
export function generateWarningInsights(ctx: InsightGeneratorContext): Insight[] {
  const result: Insight[] = [];
  const cs = ctx.language === 'cs';
  const { trends, finance } = ctx;

  // High cancellation rate
  if (trends.cancellationRate > 10) {
    result.push({
      id: 'high-cancellation',
      icon: icon(AlertTriangle),
      text: cs 
        ? `Míra zrušení: ${Math.round(trends.cancellationRate)}%`
        : `Cancellation rate: ${Math.round(trends.cancellationRate)}%`,
      type: 'warning',
      priority: 1,
      detail: {
        title: cs ? 'Vysoká míra zrušení' : 'High Cancellation Rate',
        description: cs 
          ? `Za tento měsíc bylo zrušeno ${trends.cancelledCount} tréninků (${Math.round(trends.cancellationRate)}%).`
          : `${trends.cancelledCount} trainings were cancelled this month (${Math.round(trends.cancellationRate)}%).`,
        metric: {
          value: `${Math.round(trends.cancellationRate)}%`,
          label: cs ? 'Míra zrušení' : 'Cancellation Rate',
          trend: 'down'
        },
        tip: cs 
          ? 'Zvažte zavedení storno poplatku nebo připomínek před tréninkem.'
          : 'Consider implementing cancellation fees or pre-training reminders.',
      }
    });
  }

  // Low credit - removed, now handled by ActionCenterCard exclusively

  // Income decline
  if (finance.incomeChange < -10) {
    result.push({
      id: 'income-decline',
      icon: icon(TrendingDown),
      text: cs
        ? `Příjmy klesly o ${Math.abs(Math.round(finance.incomeChange))}%`
        : `Income down ${Math.abs(Math.round(finance.incomeChange))}%`,
      type: 'warning',
      priority: 4,
      detail: {
        title: cs ? 'Pokles příjmů' : 'Income Decline',
        description: cs
          ? `Příjmy jsou o ${Math.abs(Math.round(finance.incomeChange))}% nižší než minulý měsíc.`
          : `Income is ${Math.abs(Math.round(finance.incomeChange))}% lower than last month.`,
        metric: {
          value: `${finance.monthlyIncome.toLocaleString(cs ? 'cs-CZ' : 'en-US')} Kč`,
          label: cs ? 'Tento měsíc' : 'This Month',
          trend: 'down'
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
      icon: icon(Percent),
      text: cs
        ? `Retence klientů: ${Math.round(trends.retentionRate)}%`
        : `Client retention: ${Math.round(trends.retentionRate)}%`,
      type: 'warning',
      priority: 5,
      detail: {
        title: cs ? 'Nízká retence klientů' : 'Low Client Retention',
        description: cs
          ? `Pouze ${Math.round(trends.retentionRate)}% klientů se vrací. Průměr je 70-80%.`
          : `Only ${Math.round(trends.retentionRate)}% of clients return. Average is 70-80%.`,
        metric: {
          value: `${Math.round(trends.retentionRate)}%`,
          label: cs ? 'Retence' : 'Retention',
          trend: 'down'
        },
      }
    });
  }

  return result;
}

/**
 * Generate positive insights (priority 11-30)
 */
export function generatePositiveInsights(ctx: InsightGeneratorContext): Insight[] {
  const result: Insight[] = [];
  const cs = ctx.language === 'cs';
  const { trends, finance, weeklySummary, capacity } = ctx;

  // Income growing
  if (finance.incomeChange > 10) {
    result.push({
      id: 'income-growth',
      icon: icon(TrendingUp),
      text: cs
        ? `Příjmy rostou o ${Math.round(finance.incomeChange)}%`
        : `Income up ${Math.round(finance.incomeChange)}%`,
      type: 'success',
      priority: 11,
      detail: {
        title: cs ? 'Růst příjmů' : 'Income Growth',
        description: cs
          ? `Skvělá práce! Příjmy jsou o ${Math.round(finance.incomeChange)}% vyšší.`
          : `Great job! Income is ${Math.round(finance.incomeChange)}% higher.`,
        metric: {
          value: `+${Math.round(finance.incomeChange)}%`,
          label: cs ? 'Nárůst' : 'Growth',
          trend: 'up'
        },
      }
    });
  }

  // Great retention
  if (trends.retentionRate >= 80) {
    result.push({
      id: 'retention',
      icon: icon(Target),
      text: cs
        ? `Retence: ${Math.round(trends.retentionRate)}% 🎉`
        : `Retention: ${Math.round(trends.retentionRate)}% 🎉`,
      type: 'success',
      priority: 12,
      detail: {
        title: cs ? 'Výborná retence' : 'Excellent Retention',
        description: cs
          ? `${Math.round(trends.retentionRate)}% klientů se vrací!`
          : `${Math.round(trends.retentionRate)}% of clients return!`,
        metric: {
          value: `${Math.round(trends.retentionRate)}%`,
          label: cs ? 'Retence' : 'Retention',
          trend: 'up'
        }
      }
    });
  }

  // New clients
  if (trends.newClientsThisMonth > 0) {
    result.push({
      id: 'new-clients',
      icon: icon(UserPlus),
      text: cs
        ? `+${trends.newClientsThisMonth} ${trends.newClientsThisMonth === 1 ? 'nový klient' : trends.newClientsThisMonth < 5 ? 'noví klienti' : 'nových klientů'}`
        : `+${trends.newClientsThisMonth} new client${trends.newClientsThisMonth > 1 ? 's' : ''}`,
      type: 'success',
      priority: 13,
    });
  }

  // Week trend up
  if (weeklySummary.weekTrend === 'up') {
    const diff = weeklySummary.trainingsThisWeek - weeklySummary.trainingsLastWeek;
    result.push({
      id: 'week-up',
      icon: icon(TrendingUp),
      text: cs
        ? `Tento týden +${diff} tréninků`
        : `This week +${diff} trainings`,
      type: 'success',
      priority: 14,
    });
  }

  // High capacity
  if (capacity.percentUsed > 80) {
    result.push({
      id: 'high-capacity',
      icon: icon(Zap),
      text: cs
        ? `Kapacita: ${Math.round(capacity.percentUsed)}% využito`
        : `Capacity: ${Math.round(capacity.percentUsed)}% utilized`,
      type: 'success',
      priority: 15,
    });
  }

  return result;
}

/**
 * Generate informative insights (priority 31-60)
 */
export function generateInfoInsights(ctx: InsightGeneratorContext): Insight[] {
  const result: Insight[] = [];
  const cs = ctx.language === 'cs';
  const { trends, finance, capacity, todayEstimatedIncome, todayScheduleCount } = ctx;

  // Top client
  if (trends.topClientName && trends.topClientValue > 0) {
    result.push({
      id: 'top-client',
      icon: icon(Trophy),
      text: cs
        ? `Top klient: ${trends.topClientName}`
        : `Top client: ${trends.topClientName}`,
      type: 'info',
      priority: 31,
    });
  }

  // Busiest day
  if (trends.busiestDay && trends.busiestDayCount > 0) {
    result.push({
      id: 'busiest-day',
      icon: icon(Calendar),
      text: cs
        ? `Nejrušnější den: ${trends.busiestDay}`
        : `Busiest day: ${trends.busiestDay}`,
      type: 'info',
      priority: 32,
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
      icon: icon(Clock),
      text: cs
        ? `Špička v ${peakHour.hour}:00`
        : `Peak at ${peakHour.hour}:00`,
      type: 'info',
      priority: 33,
    });
  }

  // Active clients ratio
  if (trends.activeClients > 0 && trends.totalClients > 0) {
    const activeRatio = Math.round((trends.activeClients / trends.totalClients) * 100);
    result.push({
      id: 'active-ratio',
      icon: icon(Activity),
      text: cs
        ? `${activeRatio}% klientů aktivních`
        : `${activeRatio}% clients active`,
      type: activeRatio > 70 ? 'success' : 'info',
      priority: activeRatio > 70 ? 16 : 34,
    });
  }

  // Average training price
  if (finance.avgPerTraining > 0) {
    result.push({
      id: 'avg-price',
      icon: icon(DollarSign),
      text: cs
        ? `Průměr: ${Math.round(finance.avgPerTraining).toLocaleString('cs-CZ')} Kč/trénink`
        : `Avg: ${Math.round(finance.avgPerTraining).toLocaleString('en-US')} CZK/training`,
      type: 'info',
      priority: 35,
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
      icon: icon(BarChart3),
      text: cs
        ? `${dominantPercent}% ${dominantType === 'solo' ? 'individuálních' : dominantType === 'duo' ? 'duo' : 'skupinových'}`
        : `${dominantPercent}% ${dominantType} trainings`,
      type: 'info',
      priority: 36,
    });
  }

  // Today's earnings
  if (todayEstimatedIncome > 0 && todayScheduleCount > 0) {
    result.push({
      id: 'today-income',
      icon: icon(Star),
      text: cs
        ? `Dnes: ${todayEstimatedIncome.toLocaleString('cs-CZ')} Kč`
        : `Today: ${todayEstimatedIncome.toLocaleString('en-US')} CZK`,
      type: 'info',
      priority: 38,
    });
  }

  // Total clients info
  if (trends.totalClients > 0) {
    result.push({
      id: 'total-clients',
      icon: icon(Users),
      text: cs
        ? `Celkem ${trends.totalClients} klientů`
        : `${trends.totalClients} total clients`,
      type: 'info',
      priority: 41,
    });
  }

  return result;
}

/**
 * Seeded random for consistent shuffle per session
 */
export function seededShuffle<T>(array: T[], seed: number): T[] {
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

/**
 * Generate all insights and select which to display
 */
export function generateDisplayedInsights(
  ctx: InsightGeneratorContext,
  shuffleSeed: number,
  maxInsights: number = 6
): Insight[] {
  const warnings = generateWarningInsights(ctx);
  const positive = generatePositiveInsights(ctx);
  const info = generateInfoInsights(ctx);

  // Shuffle non-warning insights
  const shuffledPositive = seededShuffle(positive, shuffleSeed);
  const shuffledInfo = seededShuffle(info, shuffleSeed + 1);

  // Build final list
  const result: Insight[] = [];
  
  // Add all warnings (max 3)
  result.push(...warnings.slice(0, 3));
  
  // Add 1-2 positive insights
  result.push(...shuffledPositive.slice(0, 2));
  
  // Fill remaining slots with informative
  const remaining = maxInsights - result.length;
  result.push(...shuffledInfo.slice(0, remaining));

  // Sort by priority for final display
  return result.sort((a, b) => a.priority - b.priority).slice(0, maxInsights);
}
