/**
 * Business Yield Score v2 - Insights Generator
 * Generates actionable insights based on the 4 pillars:
 * - Revenue Efficiency
 * - Time Utilization  
 * - Client Quality
 * - Stability
 */

import { YieldPillar, YieldDriver, UnpaidAgingBucket } from '@/hooks/useBusinessYieldScore';

export interface YieldInsight {
  type: 'positive' | 'warning' | 'critical' | 'info';
  emoji: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  pillar?: 'revenue' | 'utilization' | 'clientQuality' | 'stability';
}

export interface YieldPillars {
  revenue: YieldPillar;
  utilization: YieldPillar;
  clientQuality: YieldPillar;
  stability: YieldPillar;
}

export function generateYieldInsights(
  score: number,
  pillars: YieldPillars,
  drivers: YieldDriver[],
  unpaidAging: UnpaidAgingBucket[]
): YieldInsight[] {
  const insights: YieldInsight[] = [];

  // Overall score insight
  if (score >= 80) {
    insights.push({
      type: 'positive',
      emoji: '🎯',
      title: 'Výborná efektivita',
      description: 'Tvůj byznys běží na vysoké úrovni. Všechny pilíře jsou v dobrém stavu.',
    });
  } else if (score >= 60) {
    insights.push({
      type: 'info',
      emoji: '📊',
      title: 'Solidní základ',
      description: 'Byznys funguje dobře, ale některé pilíře mají prostor pro zlepšení.',
    });
  } else if (score >= 40) {
    insights.push({
      type: 'warning',
      emoji: '⚠️',
      title: 'Vyžaduje pozornost',
      description: 'Některé klíčové oblasti potřebují tvou pozornost.',
    });
  } else {
    insights.push({
      type: 'critical',
      emoji: '🚨',
      title: 'Kritický stav',
      description: 'Více pilířů je pod optimální úrovní. Doporučujeme okamžitou akci.',
    });
  }

  // Revenue Efficiency insights
  const revenuePerHour = pillars.revenue.metrics.revenuePerHour as number;
  const revenueTrend = pillars.revenue.trendValue;
  
  if (pillars.revenue.score < 50) {
    insights.push({
      type: revenueTrend < -10 ? 'critical' : 'warning',
      emoji: '💰',
      title: 'Nízká efektivita příjmů',
      description: revenuePerHour > 0 
        ? `Průměrný příjem ${revenuePerHour} Kč/hod je pod tvým průměrem.`
        : 'Zvyš hodinovou sazbu nebo přidej produktové příjmy.',
      pillar: 'revenue',
    });
  } else if (pillars.revenue.score >= 80 && revenueTrend > 5) {
    insights.push({
      type: 'positive',
      emoji: '📈',
      title: 'Příjmy rostou',
      description: `Skvělé! Příjmy vzrostly o ${revenueTrend}% oproti minulému období.`,
      pillar: 'revenue',
    });
  }

  // Time Utilization insights
  const cancelRate = pillars.utilization.metrics.cancelRate as number;
  const lateCancelRate = pillars.utilization.metrics.lateCancelRate as number;
  const capacityUtilization = pillars.utilization.metrics.capacityUtilization as number;

  if (cancelRate > 20) {
    insights.push({
      type: 'critical',
      emoji: '❌',
      title: 'Vysoká míra rušení',
      description: `${cancelRate}% tréninků je zrušeno. Zvaž zálohy nebo podmínky rušení.`,
      actionLabel: 'Nastavit podmínky',
      pillar: 'utilization',
    });
  } else if (lateCancelRate > 10) {
    insights.push({
      type: 'warning',
      emoji: '⏰',
      title: 'Pozdní zrušení',
      description: `${lateCancelRate}% tréninků je zrušeno méně než 24h předem.`,
      pillar: 'utilization',
    });
  }

  if (capacityUtilization > 85) {
    insights.push({
      type: 'positive',
      emoji: '🔥',
      title: 'Vysoké vytížení',
      description: `Kapacita vytížena na ${capacityUtilization}%. Zvaž zvýšení cen.`,
      pillar: 'utilization',
    });
  }

  // Client Quality insights
  const retention30 = pillars.clientQuality.metrics.retention30 as number;
  const concentrationRisk = pillars.clientQuality.metrics.concentrationRisk as number;
  const activeClients = pillars.clientQuality.metrics.activeClients as number;

  if (retention30 < 50) {
    insights.push({
      type: 'warning',
      emoji: '👥',
      title: 'Nízká retence',
      description: `Jen ${retention30}% klientů mělo trénink za posledních 30 dní.`,
      actionLabel: 'Kontaktovat neaktivní',
      actionLink: '/clients?filter=inactive',
      pillar: 'clientQuality',
    });
  }

  if (concentrationRisk > 70) {
    insights.push({
      type: 'warning',
      emoji: '⚖️',
      title: 'Riziko koncentrace',
      description: `Top 20% klientů tvoří ${concentrationRisk}% příjmů. Diverzifikuj klientelu.`,
      pillar: 'clientQuality',
    });
  }

  if (retention30 >= 80) {
    insights.push({
      type: 'positive',
      emoji: '💪',
      title: 'Výborná retence',
      description: `${retention30}% klientů je aktivních. Skvělá práce!`,
      pillar: 'clientQuality',
    });
  }

  // Stability insights
  const paidRate = pillars.stability.metrics.paidRate as number;
  const unpaidCount = pillars.stability.metrics.unpaidCount as number;
  const clientsInDebt = pillars.stability.metrics.clientsInDebt as number;
  const totalDebt = pillars.stability.metrics.totalDebt as number;

  // Unpaid aging - critical for 31+ days
  const oldUnpaid = unpaidAging.find(b => b.range === '31+');
  if (oldUnpaid && oldUnpaid.count > 0) {
    insights.push({
      type: 'critical',
      emoji: '🔴',
      title: 'Staré nezaplacené tréninky',
      description: `${oldUnpaid.count} tréninků nezaplaceno déle než 31 dní (${oldUnpaid.amount.toLocaleString()} Kč).`,
      actionLabel: 'Řešit platby',
      actionLink: '/finances',
      pillar: 'stability',
    });
  }

  if (clientsInDebt > 0 && totalDebt > 1000) {
    insights.push({
      type: clientsInDebt > 3 ? 'critical' : 'warning',
      emoji: '💳',
      title: 'Klienti v dluhu',
      description: `${clientsInDebt} klientů dluží celkem ${totalDebt.toLocaleString()} Kč.`,
      actionLabel: 'Zobrazit dlužníky',
      actionLink: '/clients?filter=debt',
      pillar: 'stability',
    });
  }

  if (paidRate < 80) {
    insights.push({
      type: 'warning',
      emoji: '💸',
      title: 'Nízká platební morálka',
      description: `Pouze ${paidRate}% tréninků je zaplaceno. Zvaž automatické upomínky.`,
      pillar: 'stability',
    });
  }

  if (paidRate >= 95) {
    insights.push({
      type: 'positive',
      emoji: '✅',
      title: 'Výborná platební morálka',
      description: `${paidRate}% tréninků zaplaceno včas. Skvělé!`,
      pillar: 'stability',
    });
  }

  return insights;
}

export function generateYieldSummary(
  score: number,
  pillars: YieldPillars,
  weekChange: number
): { whatWorks: string[]; whatSlows: string[]; recommendations: string[] } {
  const whatWorks: string[] = [];
  const whatSlows: string[] = [];
  const recommendations: string[] = [];

  // What works
  if (pillars.revenue.score >= 70) {
    const revenuePerHour = pillars.revenue.metrics.revenuePerHour as number;
    whatWorks.push(`Efektivita ${revenuePerHour} Kč/hod je nad průměrem.`);
  }
  if (pillars.revenue.trend === 'up' && pillars.revenue.trendValue > 5) {
    whatWorks.push(`Příjmy rostou o ${pillars.revenue.trendValue}%.`);
  }
  if ((pillars.clientQuality.metrics.retention30 as number) >= 70) {
    whatWorks.push(`Retence ${pillars.clientQuality.metrics.retention30}% je solidní.`);
  }
  if ((pillars.stability.metrics.paidRate as number) >= 90) {
    whatWorks.push(`Platební morálka ${pillars.stability.metrics.paidRate}% je výborná.`);
  }
  if (weekChange > 3) {
    whatWorks.push(`Skóre vzrostlo o ${weekChange} bodů za týden.`);
  }

  // What slows
  if (pillars.revenue.trend === 'down' && pillars.revenue.trendValue < -5) {
    whatSlows.push(`Příjmy klesly o ${Math.abs(pillars.revenue.trendValue)}%.`);
  }
  if ((pillars.utilization.metrics.cancelRate as number) > 15) {
    whatSlows.push(`Míra rušení ${pillars.utilization.metrics.cancelRate}% je nad normou.`);
  }
  if ((pillars.clientQuality.metrics.concentrationRisk as number) > 60) {
    whatSlows.push(`${pillars.clientQuality.metrics.concentrationRisk}% příjmů od top 20% klientů.`);
  }
  if ((pillars.stability.metrics.unpaidCount as number) > 5) {
    whatSlows.push(`${pillars.stability.metrics.unpaidCount} nezaplacených tréninků.`);
  }
  if (weekChange < -3) {
    whatSlows.push(`Skóre kleslo o ${Math.abs(weekChange)} bodů za týden.`);
  }

  // Recommendations
  if ((pillars.stability.metrics.unpaidCount as number) > 0) {
    recommendations.push('Zkontroluj nezaplacené tréninky a nastav upomínky.');
  }
  if ((pillars.clientQuality.metrics.retention30 as number) < 50) {
    recommendations.push('Oslovi neaktivní klienty s nabídkou tréninku.');
  }
  if ((pillars.utilization.metrics.cancelRate as number) > 15) {
    recommendations.push('Zvaž zálohy nebo podmínky pro zrušení.');
  }
  if ((pillars.clientQuality.metrics.concentrationRisk as number) > 70) {
    recommendations.push('Rozšiř klientskou základnu pro snížení rizika.');
  }
  if (pillars.revenue.score < 50 && pillars.utilization.score >= 70) {
    recommendations.push('Vysoké vytížení, ale nízké příjmy – zvaž zvýšení cen.');
  }

  // Fallback
  if (whatWorks.length === 0) {
    whatWorks.push('Sbíráme data pro lepší analýzu.');
  }
  if (recommendations.length === 0 && whatSlows.length === 0) {
    recommendations.push('Pokračuj v dobré práci! 💪');
  }

  return {
    whatWorks: whatWorks.slice(0, 2),
    whatSlows: whatSlows.slice(0, 2),
    recommendations: recommendations.slice(0, 2),
  };
}

export function getYieldStatusLabel(status: 'excellent' | 'good' | 'warning' | 'critical'): string {
  const labels = {
    excellent: 'Výborný',
    good: 'Dobrý',
    warning: 'Vyžaduje pozornost',
    critical: 'Kritický',
  };
  return labels[status];
}

export function getYieldStatus(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'warning';
  return 'critical';
}
