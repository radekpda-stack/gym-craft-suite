import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subWeeks, startOfWeek, format, differenceInDays } from 'date-fns';

// ============================================================================
// BUSINESS YIELD SCORE v2
// A 4-pillar scoring system measuring how effectively a trainer converts
// time into money, stability, and client quality.
// ============================================================================

export interface YieldPillar {
  score: number;        // 0-100
  weight: number;       // 0-1
  weightedScore: number;
  metrics: Record<string, number | string>;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;   // % change
  hasData: boolean;
}

export interface UnpaidAgingBucket {
  range: '0-7' | '8-30' | '31+';
  count: number;
  amount: number;
}

export interface YieldDriver {
  id: string;
  label: string;
  impact: 'positive' | 'negative';
  value: string;
  pillar: 'revenue' | 'utilization' | 'clientQuality' | 'stability';
  severity: 'high' | 'medium' | 'low';
}

export interface YieldTimelinePoint {
  week: string;
  weekLabel: string;
  totalScore: number;
  revenue: number;
  utilization: number;
  clientQuality: number;
  stability: number;
}

export interface BusinessYieldData {
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  confidence: number;
  
  pillars: {
    revenue: YieldPillar;
    utilization: YieldPillar;
    clientQuality: YieldPillar;
    stability: YieldPillar;
  };
  
  // Timeline for historical view (12 weeks)
  timeline: YieldTimelinePoint[];
  
  // Week-over-week change
  weekChange: number;
  
  // Top drivers (positive & negative)
  drivers: YieldDriver[];
  
  // Unpaid aging buckets
  unpaidAging: UnpaidAgingBucket[];
  
  // Insights
  insights: {
    whatWorks: string[];
    whatSlows: string[];
    recommendations: string[];
  };
  
  // Meta
  lastComputed: string;
  dataPointsCount: number;
}

// Default weights for pillars
const PILLAR_WEIGHTS = {
  revenue: 0.30,
  utilization: 0.25,
  clientQuality: 0.25,
  stability: 0.20,
};

// Normalize a value to 0-100 scale based on baseline
function normalizeToBaseline(current: number, baseline: number, invertBetter = false): number {
  if (baseline === 0) {
    // No baseline - use moderate score
    return current > 0 ? 60 : 50;
  }
  
  const ratio = current / baseline;
  let score: number;
  
  if (invertBetter) {
    // Lower is better (e.g., cancellation rate)
    score = 100 - Math.min(100, Math.max(0, ratio * 50));
  } else {
    // Higher is better
    // Map: 0.5x = 25, 1x = 50, 1.5x = 75, 2x = 100
    score = Math.min(100, Math.max(0, ratio * 50));
  }
  
  return Math.round(score);
}

// Clamp value between min and max
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Calculate trend between two values
function calculateTrend(current: number, previous: number): { trend: 'up' | 'down' | 'stable'; value: number } {
  if (previous === 0) {
    return { trend: current > 0 ? 'up' : 'stable', value: 0 };
  }
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 3) {
    return { trend: 'stable', value: Math.round(change) };
  }
  return { trend: change > 0 ? 'up' : 'down', value: Math.round(change) };
}

export function useBusinessYieldScore() {
  return useQuery({
    queryKey: ['business-yield-score-v2'],
    queryFn: async (): Promise<BusinessYieldData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const days30Ago = subDays(now, 30);
      const days60Ago = subDays(now, 60);
      const days90Ago = subDays(now, 90);
      const days180Ago = subDays(now, 180);
      const weeks12Ago = subWeeks(now, 12);

      // ========================================
      // PARALLEL DATA FETCHING
      // ========================================
      const [
        clientsResult,
        trainings60dResult,
        trainings180dResult,
        trainingsAllResult,
        cancelledResult,
        creditTransactionsResult,
      ] = await Promise.all([
        // Active clients with credit balance
        supabase
          .from('clients')
          .select('id, name, is_archived, credit_balance, created_at')
          .eq('user_id', user.id)
          .eq('is_archived', false),
        
        // Trainings last 60 days (for stability pillar)
        supabase
          .from('training_sessions')
          .select('id, date, duration, final_price, payment_status, client_id, participant_count, status, is_late_cancellation, canceled_at')
          .eq('user_id', user.id)
          .gte('date', days60Ago.toISOString())
          .order('date', { ascending: true }),
        
        // Trainings last 180 days (for baselines)
        supabase
          .from('training_sessions')
          .select('id, date, duration, final_price, payment_status, client_id, participant_count, status')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', days180Ago.toISOString()),
        
        // All trainings for timeline (12 weeks)
        supabase
          .from('training_sessions')
          .select('id, date, duration, final_price, payment_status, client_id, status')
          .eq('user_id', user.id)
          .gte('date', weeks12Ago.toISOString()),
        
        // Cancelled trainings (for cancel rate)
        supabase
          .from('training_sessions')
          .select('id, date, canceled_at, is_late_cancellation')
          .eq('user_id', user.id)
          .eq('status', 'canceled')
          .gte('date', days90Ago.toISOString()),
        
        // Credit transactions for product revenue
        supabase
          .from('credit_transactions')
          .select('id, amount, created_at, type, product_id')
          .eq('user_id', user.id)
          .gte('created_at', days60Ago.toISOString()),
      ]);

      const clients = clientsResult.data || [];
      const trainings60d = trainings60dResult.data || [];
      const trainings180d = trainings180dResult.data || [];
      const trainingsAll = trainingsAllResult.data || [];
      const cancelledTrainings = cancelledResult.data || [];
      const creditTransactions = creditTransactionsResult.data || [];

      // ========================================
      // FILTER DATA
      // ========================================
      const completed60d = trainings60d.filter(t => t.status === 'completed');
      const completed30d = completed60d.filter(t => new Date(t.date) >= days30Ago);
      const completedPrev30d = completed60d.filter(t => {
        const d = new Date(t.date);
        return d >= days60Ago && d < days30Ago;
      });
      
      const paidCompleted60d = completed60d.filter(t => 
        t.payment_status === 'paid' || t.payment_status === 'prepaid'
      );
      const paidCompleted30d = paidCompleted60d.filter(t => new Date(t.date) >= days30Ago);

      // ========================================
      // 1. REVENUE EFFICIENCY PILLAR (30%)
      // ========================================
      const revenueFromTrainings30d = paidCompleted30d.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const totalHours30d = paidCompleted30d.reduce((sum, t) => sum + ((t.duration || 60) / 60), 0);
      const revenuePerHour = totalHours30d > 0 ? revenueFromTrainings30d / totalHours30d : 0;
      const avgTrainingPrice = paidCompleted30d.length > 0 
        ? revenueFromTrainings30d / paidCompleted30d.length 
        : 0;

      // Product revenue (from credit transactions)
      const productRevenue30d = creditTransactions
        .filter(t => t.type === 'product' && new Date(t.created_at) >= days30Ago)
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
      
      const totalRevenue30d = revenueFromTrainings30d + productRevenue30d;

      // 6-month baseline for revenue
      const completed180d = trainings180d;
      const baseline6mRevenue = completed180d.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const avgMonthlyRevenue6m = baseline6mRevenue / 6;
      
      // Previous 30d revenue for trend
      const revenuePrev30d = completedPrev30d
        .filter(t => t.payment_status === 'paid' || t.payment_status === 'prepaid')
        .reduce((sum, t) => sum + (t.final_price || 0), 0);

      // Revenue score: compare to baseline
      let revenueScore: number;
      if (avgMonthlyRevenue6m > 0) {
        const ratio = totalRevenue30d / avgMonthlyRevenue6m;
        revenueScore = clamp(50 + (ratio - 1) * 50, 0, 100);
      } else {
        revenueScore = totalRevenue30d > 0 ? 60 : 50;
      }

      const revenueTrend = calculateTrend(totalRevenue30d, revenuePrev30d);
      
      const revenuePillar: YieldPillar = {
        score: Math.round(revenueScore),
        weight: PILLAR_WEIGHTS.revenue,
        weightedScore: Math.round(revenueScore * PILLAR_WEIGHTS.revenue),
        metrics: {
          revenuePerHour: Math.round(revenuePerHour),
          avgTrainingPrice: Math.round(avgTrainingPrice),
          totalRevenue: Math.round(totalRevenue30d),
          productShare: totalRevenue30d > 0 ? Math.round((productRevenue30d / totalRevenue30d) * 100) : 0,
        },
        trend: revenueTrend.trend,
        trendValue: revenueTrend.value,
        hasData: paidCompleted30d.length > 0,
      };

      // ========================================
      // 2. TIME UTILIZATION PILLAR (25%)
      // ========================================
      const DAILY_CAPACITY_HOURS = 6;
      const workingDays30d = 22; // Approx working days in a month
      const maxCapacity30d = DAILY_CAPACITY_HOURS * workingDays30d;
      
      const actualHours30d = completed30d.reduce((sum, t) => sum + ((t.duration || 60) / 60), 0);
      const capacityUtilization = maxCapacity30d > 0 ? (actualHours30d / maxCapacity30d) * 100 : 0;

      // Cancel rate (90 days for more stable metric)
      const allTrainings90d = trainingsAll.filter(t => new Date(t.date) >= days90Ago);
      const cancelled90d = cancelledTrainings.length;
      const total90d = allTrainings90d.length + cancelled90d;
      const cancelRate = total90d > 0 ? (cancelled90d / total90d) * 100 : 0;

      // Late cancellations
      const lateCancellations = cancelledTrainings.filter(t => t.is_late_cancellation).length;
      const lateCancelRate = total90d > 0 ? (lateCancellations / total90d) * 100 : 0;

      // 3-month baseline
      const completed90d = trainings180d.filter(t => new Date(t.date) >= days90Ago);
      const baseline3mHours = completed90d.reduce((sum, t) => sum + ((t.duration || 60) / 60), 0);
      const avgMonthlyHours3m = baseline3mHours / 3;

      // Utilization score
      let utilizationScore: number;
      if (avgMonthlyHours3m > 0) {
        const ratio = actualHours30d / avgMonthlyHours3m;
        utilizationScore = clamp(50 + (ratio - 1) * 50, 0, 100);
      } else {
        utilizationScore = actualHours30d > 0 ? 60 : 50;
      }
      // Penalize high cancel rate
      utilizationScore = utilizationScore - Math.min(20, cancelRate);

      const prevHours30d = completedPrev30d.reduce((sum, t) => sum + ((t.duration || 60) / 60), 0);
      const utilizationTrend = calculateTrend(actualHours30d, prevHours30d);

      const utilizationPillar: YieldPillar = {
        score: Math.round(Math.max(0, utilizationScore)),
        weight: PILLAR_WEIGHTS.utilization,
        weightedScore: Math.round(Math.max(0, utilizationScore) * PILLAR_WEIGHTS.utilization),
        metrics: {
          capacityUtilization: Math.round(capacityUtilization),
          actualHours: Math.round(actualHours30d),
          cancelRate: Math.round(cancelRate * 10) / 10,
          lateCancelRate: Math.round(lateCancelRate * 10) / 10,
        },
        trend: utilizationTrend.trend,
        trendValue: utilizationTrend.value,
        hasData: completed30d.length > 0,
      };

      // ========================================
      // 3. CLIENT QUALITY PILLAR (25%)
      // ========================================
      // Active client = at least 1 completed session in last 30 days
      const activeClientIds30d = new Set(completed30d.map(t => t.client_id).filter(Boolean));
      const activeClientIds60d = new Set(completed60d.map(t => t.client_id).filter(Boolean));
      const activeClientIds90d = new Set(
        trainings180d.filter(t => new Date(t.date) >= days90Ago).map(t => t.client_id).filter(Boolean)
      );

      const totalActiveClients = clients.length;
      
      // Weighted retention: 30d (50%), 60d (30%), 90d (20%)
      const retention30 = totalActiveClients > 0 ? (activeClientIds30d.size / totalActiveClients) * 100 : 0;
      const retention60 = totalActiveClients > 0 ? (activeClientIds60d.size / totalActiveClients) * 100 : 0;
      const retention90 = totalActiveClients > 0 ? (activeClientIds90d.size / totalActiveClients) * 100 : 0;
      const weightedRetention = retention30 * 0.5 + retention60 * 0.3 + retention90 * 0.2;

      // Revenue per client
      const revenuePerClient = activeClientIds30d.size > 0 
        ? totalRevenue30d / activeClientIds30d.size 
        : 0;

      // Client concentration: top 20% clients' share of revenue
      const clientRevenues: Record<string, number> = {};
      paidCompleted30d.forEach(t => {
        if (t.client_id) {
          clientRevenues[t.client_id] = (clientRevenues[t.client_id] || 0) + (t.final_price || 0);
        }
      });
      const sortedRevenues = Object.values(clientRevenues).sort((a, b) => b - a);
      const top20Count = Math.max(1, Math.ceil(sortedRevenues.length * 0.2));
      const top20Revenue = sortedRevenues.slice(0, top20Count).reduce((sum, r) => sum + r, 0);
      const concentrationRisk = totalRevenue30d > 0 ? (top20Revenue / totalRevenue30d) * 100 : 0;

      // Client quality score
      let clientQualityScore = Math.min(100, weightedRetention);
      // Penalize high concentration (>60%)
      if (concentrationRisk > 60) {
        clientQualityScore -= (concentrationRisk - 60) * 0.5;
      }

      const prevActiveClientIds = new Set(completedPrev30d.map(t => t.client_id).filter(Boolean));
      const clientQualityTrend = calculateTrend(activeClientIds30d.size, prevActiveClientIds.size);

      const clientQualityPillar: YieldPillar = {
        score: Math.round(Math.max(0, clientQualityScore)),
        weight: PILLAR_WEIGHTS.clientQuality,
        weightedScore: Math.round(Math.max(0, clientQualityScore) * PILLAR_WEIGHTS.clientQuality),
        metrics: {
          activeClients: activeClientIds30d.size,
          totalClients: totalActiveClients,
          retention30: Math.round(retention30),
          revenuePerClient: Math.round(revenuePerClient),
          concentrationRisk: Math.round(concentrationRisk),
        },
        trend: clientQualityTrend.trend,
        trendValue: clientQualityTrend.value,
        hasData: totalActiveClients > 0,
      };

      // ========================================
      // 4. STABILITY PILLAR (20%)
      // ========================================
      // Payment discipline (60 days)
      const unpaidCompleted60d = completed60d.filter(t => 
        !t.payment_status || t.payment_status === 'pending'
      );
      const paidRate60d = completed60d.length > 0 
        ? ((completed60d.length - unpaidCompleted60d.length) / completed60d.length) * 100 
        : 100;

      // Unpaid aging buckets
      const unpaidAging: UnpaidAgingBucket[] = [
        { range: '0-7', count: 0, amount: 0 },
        { range: '8-30', count: 0, amount: 0 },
        { range: '31+', count: 0, amount: 0 },
      ];

      unpaidCompleted60d.forEach(t => {
        const daysOld = differenceInDays(now, new Date(t.date));
        const amount = t.final_price || 0;
        if (daysOld <= 7) {
          unpaidAging[0].count++;
          unpaidAging[0].amount += amount;
        } else if (daysOld <= 30) {
          unpaidAging[1].count++;
          unpaidAging[1].amount += amount;
        } else {
          unpaidAging[2].count++;
          unpaidAging[2].amount += amount;
        }
      });

      // Credit health by amount
      const clientsInDebt = clients.filter(c => (c.credit_balance || 0) < 0);
      const totalDebtAmount = clientsInDebt.reduce((sum, c) => sum + Math.abs(c.credit_balance || 0), 0);
      const totalPositiveCredit = clients
        .filter(c => (c.credit_balance || 0) > 0)
        .reduce((sum, c) => sum + (c.credit_balance || 0), 0);
      
      // Debt ratio against 60d revenue
      const revenue60d = completed60d.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const debtRatio = revenue60d > 0 ? (totalDebtAmount / revenue60d) * 100 : 0;

      // Revenue stability: coefficient of variation over 12 weeks
      const weeklyRevenues: number[] = [];
      for (let i = 0; i < 12; i++) {
        const weekStart = subWeeks(now, i + 1);
        const weekEnd = subWeeks(now, i);
        const weekRevenue = trainingsAll
          .filter(t => {
            const d = new Date(t.date);
            return d >= weekStart && d < weekEnd && t.status === 'completed';
          })
          .reduce((sum, t) => sum + (t.final_price || 0), 0);
        weeklyRevenues.push(weekRevenue);
      }
      
      const avgWeeklyRevenue = weeklyRevenues.reduce((a, b) => a + b, 0) / 12;
      const variance = weeklyRevenues.reduce((sum, r) => sum + Math.pow(r - avgWeeklyRevenue, 2), 0) / 12;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = avgWeeklyRevenue > 0 ? (stdDev / avgWeeklyRevenue) * 100 : 0;

      // Stability score
      let stabilityScore = paidRate60d;
      // Penalize high debt ratio
      stabilityScore -= Math.min(20, debtRatio * 0.5);
      // Penalize high variance
      stabilityScore -= Math.min(15, coefficientOfVariation * 0.2);

      const prevUnpaidCount = completedPrev30d.filter(t => 
        !t.payment_status || t.payment_status === 'pending'
      ).length;
      const stabilityTrend = calculateTrend(
        completed30d.length - unpaidCompleted60d.filter(t => new Date(t.date) >= days30Ago).length,
        completedPrev30d.length - prevUnpaidCount
      );

      const stabilityPillar: YieldPillar = {
        score: Math.round(clamp(stabilityScore, 0, 100)),
        weight: PILLAR_WEIGHTS.stability,
        weightedScore: Math.round(clamp(stabilityScore, 0, 100) * PILLAR_WEIGHTS.stability),
        metrics: {
          paidRate: Math.round(paidRate60d),
          unpaidCount: unpaidCompleted60d.length,
          totalDebt: Math.round(totalDebtAmount),
          clientsInDebt: clientsInDebt.length,
          debtRatio: Math.round(debtRatio * 10) / 10,
          revenueVariation: Math.round(coefficientOfVariation),
        },
        trend: stabilityTrend.trend,
        trendValue: stabilityTrend.value,
        hasData: completed60d.length > 0,
      };

      // ========================================
      // ADJUST WEIGHTS IF PILLAR HAS NO DATA
      // ========================================
      const pillarsWithData = [revenuePillar, utilizationPillar, clientQualityPillar, stabilityPillar]
        .filter(p => p.hasData);
      const totalWeight = pillarsWithData.reduce((sum, p) => sum + p.weight, 0);
      
      // Recalculate weighted scores with adjusted weights
      if (totalWeight < 1 && totalWeight > 0) {
        const adjustmentFactor = 1 / totalWeight;
        [revenuePillar, utilizationPillar, clientQualityPillar, stabilityPillar].forEach(p => {
          if (p.hasData) {
            p.weightedScore = Math.round(p.score * p.weight * adjustmentFactor);
          } else {
            p.weightedScore = 0;
          }
        });
      }

      // ========================================
      // TOTAL SCORE
      // ========================================
      const totalScore = Math.round(
        revenuePillar.weightedScore +
        utilizationPillar.weightedScore +
        clientQualityPillar.weightedScore +
        stabilityPillar.weightedScore
      );

      // Status
      let status: BusinessYieldData['status'];
      if (totalScore >= 80) status = 'excellent';
      else if (totalScore >= 60) status = 'good';
      else if (totalScore >= 40) status = 'warning';
      else status = 'critical';

      // ========================================
      // TIMELINE (12 weeks)
      // ========================================
      const timeline: YieldTimelinePoint[] = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 1 });
        
        const weekTrainings = trainingsAll.filter(t => {
          const d = new Date(t.date);
          return d >= weekStart && d < weekEnd && t.status === 'completed';
        });
        
        const weekRevenue = weekTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
        const weekHours = weekTrainings.reduce((sum, t) => sum + ((t.duration || 60) / 60), 0);
        const weekActiveClients = new Set(weekTrainings.map(t => t.client_id).filter(Boolean)).size;
        const weekPaidCount = weekTrainings.filter(t => t.payment_status === 'paid' || t.payment_status === 'prepaid').length;
        
        // Simplified scores for timeline
        const weekRevenueScore = avgWeeklyRevenue > 0 ? clamp(50 + ((weekRevenue / avgWeeklyRevenue) - 1) * 50, 0, 100) : 50;
        const weekUtilScore = clamp(weekHours / (DAILY_CAPACITY_HOURS * 5) * 100, 0, 100);
        const weekClientScore = totalActiveClients > 0 ? clamp((weekActiveClients / totalActiveClients) * 100, 0, 100) : 50;
        const weekStabilityScore = weekTrainings.length > 0 ? (weekPaidCount / weekTrainings.length) * 100 : 100;
        
        const weekTotalScore = Math.round(
          weekRevenueScore * PILLAR_WEIGHTS.revenue +
          weekUtilScore * PILLAR_WEIGHTS.utilization +
          weekClientScore * PILLAR_WEIGHTS.clientQuality +
          weekStabilityScore * PILLAR_WEIGHTS.stability
        );
        
        timeline.push({
          week: format(weekStart, 'yyyy-MM-dd'),
          weekLabel: format(weekStart, 'd.M.'),
          totalScore: weekTotalScore,
          revenue: Math.round(weekRevenueScore),
          utilization: Math.round(weekUtilScore),
          clientQuality: Math.round(weekClientScore),
          stability: Math.round(weekStabilityScore),
        });
      }

      // Week-over-week change
      const lastWeekScore = timeline[timeline.length - 1]?.totalScore || 0;
      const prevWeekScore = timeline[timeline.length - 2]?.totalScore || lastWeekScore;
      const weekChange = lastWeekScore - prevWeekScore;

      // ========================================
      // DRIVERS (top positive/negative factors)
      // ========================================
      const drivers: YieldDriver[] = [];
      
      // Revenue drivers
      if (revenuePerHour > avgMonthlyRevenue6m / (22 * DAILY_CAPACITY_HOURS) * 1.2) {
        drivers.push({
          id: 'high_hourly_rate',
          label: 'Vysoká hodinová sazba',
          impact: 'positive',
          value: `${Math.round(revenuePerHour)} Kč/h`,
          pillar: 'revenue',
          severity: 'medium',
        });
      }
      if (productRevenue30d > totalRevenue30d * 0.1) {
        drivers.push({
          id: 'product_revenue',
          label: 'Příjmy z produktů',
          impact: 'positive',
          value: `${Math.round(productRevenue30d)} Kč`,
          pillar: 'revenue',
          severity: 'low',
        });
      }
      if (revenueTrend.value < -10) {
        drivers.push({
          id: 'revenue_decline',
          label: 'Pokles příjmů',
          impact: 'negative',
          value: `${revenueTrend.value}%`,
          pillar: 'revenue',
          severity: revenueTrend.value < -20 ? 'high' : 'medium',
        });
      }

      // Utilization drivers
      if (cancelRate > 15) {
        drivers.push({
          id: 'high_cancel_rate',
          label: 'Vysoká míra rušení',
          impact: 'negative',
          value: `${Math.round(cancelRate)}%`,
          pillar: 'utilization',
          severity: cancelRate > 25 ? 'high' : 'medium',
        });
      }
      if (lateCancelRate > 5) {
        drivers.push({
          id: 'late_cancellations',
          label: 'Pozdní zrušení (<24h)',
          impact: 'negative',
          value: `${lateCancellations}×`,
          pillar: 'utilization',
          severity: lateCancelRate > 10 ? 'high' : 'medium',
        });
      }
      if (capacityUtilization > 70) {
        drivers.push({
          id: 'high_utilization',
          label: 'Vysoké vytížení',
          impact: 'positive',
          value: `${Math.round(capacityUtilization)}%`,
          pillar: 'utilization',
          severity: 'medium',
        });
      }

      // Client quality drivers
      if (retention30 > 70) {
        drivers.push({
          id: 'high_retention',
          label: 'Vysoká retence',
          impact: 'positive',
          value: `${Math.round(retention30)}%`,
          pillar: 'clientQuality',
          severity: 'medium',
        });
      }
      if (concentrationRisk > 60) {
        drivers.push({
          id: 'concentration_risk',
          label: 'Závislost na top klientech',
          impact: 'negative',
          value: `${Math.round(concentrationRisk)}%`,
          pillar: 'clientQuality',
          severity: concentrationRisk > 75 ? 'high' : 'medium',
        });
      }

      // Stability drivers
      if (unpaidAging[2].count > 0) {
        drivers.push({
          id: 'old_unpaid',
          label: 'Staré nezaplacené (31+ dní)',
          impact: 'negative',
          value: `${unpaidAging[2].count}× / ${Math.round(unpaidAging[2].amount)} Kč`,
          pillar: 'stability',
          severity: 'high',
        });
      }
      if (clientsInDebt.length > 0 && debtRatio > 10) {
        drivers.push({
          id: 'client_debt',
          label: 'Klienti v dluhu',
          impact: 'negative',
          value: `${clientsInDebt.length}× / ${Math.round(totalDebtAmount)} Kč`,
          pillar: 'stability',
          severity: debtRatio > 20 ? 'high' : 'medium',
        });
      }
      if (paidRate60d > 90) {
        drivers.push({
          id: 'good_payment',
          label: 'Výborná platební morálka',
          impact: 'positive',
          value: `${Math.round(paidRate60d)}%`,
          pillar: 'stability',
          severity: 'medium',
        });
      }

      // Sort drivers by severity and impact
      drivers.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        const impactOrder = { negative: 0, positive: 1 };
        return severityOrder[a.severity] - severityOrder[b.severity] || 
               impactOrder[a.impact] - impactOrder[b.impact];
      });

      // ========================================
      // INSIGHTS
      // ========================================
      const whatWorks: string[] = [];
      const whatSlows: string[] = [];
      const recommendations: string[] = [];

      // What works
      if (revenueTrend.trend === 'up' && revenueTrend.value > 5) {
        whatWorks.push(`Příjmy rostou o ${revenueTrend.value}% oproti předchozím 30 dnům.`);
      }
      if (retention30 > 70) {
        whatWorks.push(`${Math.round(retention30)}% klientů je aktivních (trénink v posledních 30 dnech).`);
      }
      if (paidRate60d > 90) {
        whatWorks.push(`Platební morálka ${Math.round(paidRate60d)}% – skvělé!`);
      }
      if (whatWorks.length === 0) {
        whatWorks.push('Data se shromažďují pro lepší přehled.');
      }

      // What slows
      if (unpaidAging[2].amount > 0) {
        whatSlows.push(`${Math.round(unpaidAging[2].amount)} Kč nezaplaceno déle než 31 dní.`);
      }
      if (cancelRate > 15) {
        whatSlows.push(`Míra rušení ${Math.round(cancelRate)}% je nad průměrem.`);
      }
      if (concentrationRisk > 60) {
        whatSlows.push(`Top ${top20Count} klientů tvoří ${Math.round(concentrationRisk)}% příjmů – riziko závislosti.`);
      }
      if (revenueTrend.trend === 'down' && revenueTrend.value < -10) {
        whatSlows.push(`Příjmy klesají o ${Math.abs(revenueTrend.value)}%.`);
      }

      // Recommendations
      if (unpaidAging[2].count > 0) {
        recommendations.push('Oslovte klienty s nezaplacenými tréninky starými 31+ dní.');
      }
      if (clientsInDebt.length > 0) {
        recommendations.push(`Řešte ${clientsInDebt.length} ${clientsInDebt.length === 1 ? 'klienta' : 'klientů'} v dluhu.`);
      }
      if (retention30 < 50) {
        recommendations.push('Kontaktujte neaktivní klienty pro zvýšení retence.');
      }
      if (recommendations.length === 0 && whatSlows.length === 0) {
        recommendations.push('Pokračujte v dobré práci!');
      }

      // ========================================
      // CONFIDENCE
      // ========================================
      const dataPointsCount = completed60d.length + cancelledTrainings.length;
      let confidence = 50;
      if (dataPointsCount >= 50) confidence = 95;
      else if (dataPointsCount >= 30) confidence = 85;
      else if (dataPointsCount >= 15) confidence = 70;
      else if (dataPointsCount >= 5) confidence = 55;

      return {
        score: totalScore,
        status,
        confidence,
        pillars: {
          revenue: revenuePillar,
          utilization: utilizationPillar,
          clientQuality: clientQualityPillar,
          stability: stabilityPillar,
        },
        timeline,
        weekChange,
        drivers,
        unpaidAging,
        insights: {
          whatWorks: whatWorks.slice(0, 2),
          whatSlows: whatSlows.slice(0, 2),
          recommendations: recommendations.slice(0, 2),
        },
        lastComputed: now.toISOString(),
        dataPointsCount,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
