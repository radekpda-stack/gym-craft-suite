import { supabase } from '@/integrations/supabase/client';
import { subWeeks, startOfWeek, format, getDay } from 'date-fns';

export type MetricType = 'revenue' | 'retention' | 'credits' | 'payments';

export interface BaselineData {
  metricType: MetricType;
  baselineValue: number;
  standardDeviation: number;
  windowWeeks: number;
  weight: number;
  seasonalityFactor: Record<string, number>;
  confidence: number;
  dataPointsCount: number;
  lastComputedAt: string;
}

export interface AdaptiveWeights {
  retention: number;
  credits: number;
  revenue: number;
  payments: number;
}

const DEFAULT_WEIGHTS: AdaptiveWeights = {
  retention: 0.30,
  credits: 0.25,
  revenue: 0.25,
  payments: 0.20,
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export class BaselineService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Načte uložené baseline parametry z DB
   */
  async getStoredBaselines(): Promise<BaselineData[]> {
    const { data, error } = await supabase
      .from('business_health_baselines')
      .select('*')
      .eq('user_id', this.userId);

    if (error || !data) return [];

    return data.map((row) => ({
      metricType: row.metric_type as MetricType,
      baselineValue: Number(row.baseline_value) || 0,
      standardDeviation: Number(row.standard_deviation) || 0,
      windowWeeks: row.window_weeks || 8,
      weight: Number(row.weight) || 0.25,
      seasonalityFactor: (row.seasonality_factor as Record<string, number>) || {},
      confidence: Number(row.confidence) || 0,
      dataPointsCount: row.data_points_count || 0,
      lastComputedAt: row.last_computed_at || new Date().toISOString(),
    }));
  }

  /**
   * Analyzuje historická data a vypočítá adaptivní baseline
   */
  async computeAndStoreBaselines(): Promise<BaselineData[]> {
    const now = new Date();
    const sixMonthsAgo = subWeeks(now, 26);

    // Fetch training sessions
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id, date, status, user_id')
      .eq('user_id', this.userId)
      .gte('date', sixMonthsAgo.toISOString())
      .order('date', { ascending: true });

    // Fetch credit transactions
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('id, amount, type, created_at, user_id')
      .eq('user_id', this.userId)
      .gte('created_at', sixMonthsAgo.toISOString());

    // Fetch clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id, credit_balance, is_active, created_at')
      .eq('user_id', this.userId);

    const sessionsData = sessions || [];
    const transactionsData = transactions || [];
    const clientsData = clients || [];

    // Analyze each metric
    const revenueBaseline = this.analyzeRevenue(transactionsData);
    const retentionBaseline = this.analyzeRetention(sessionsData, clientsData);
    const creditsBaseline = this.analyzeCredits(clientsData);
    const paymentsBaseline = this.analyzePayments(sessionsData, transactionsData);

    const baselines = [revenueBaseline, retentionBaseline, creditsBaseline, paymentsBaseline];

    // Calculate adaptive weights based on variance
    const adaptiveWeights = this.calculateAdaptiveWeights(baselines);

    // Store to database
    for (const baseline of baselines) {
      baseline.weight = adaptiveWeights[baseline.metricType];
      await this.upsertBaseline(baseline);
    }

    return baselines;
  }

  private analyzeRevenue(transactions: any[]): BaselineData {
    const weeklyRevenue: Record<string, number> = {};
    const dayRevenue: Record<string, number[]> = {};

    for (const tx of transactions) {
      if (tx.type === 'credit' && tx.amount > 0) {
        const date = new Date(tx.created_at);
        const weekKey = format(startOfWeek(date), 'yyyy-ww');
        const dayName = DAY_NAMES[getDay(date)];

        weeklyRevenue[weekKey] = (weeklyRevenue[weekKey] || 0) + tx.amount;
        if (!dayRevenue[dayName]) dayRevenue[dayName] = [];
        dayRevenue[dayName].push(tx.amount);
      }
    }

    const values = Object.values(weeklyRevenue);
    const { mean, stdDev } = this.calculateStats(values);
    const seasonality = this.calculateSeasonality(dayRevenue);

    return {
      metricType: 'revenue',
      baselineValue: mean,
      standardDeviation: stdDev,
      windowWeeks: this.determineOptimalWindow(values),
      weight: DEFAULT_WEIGHTS.revenue,
      seasonalityFactor: seasonality,
      confidence: this.calculateConfidence(values.length),
      dataPointsCount: values.length,
      lastComputedAt: new Date().toISOString(),
    };
  }

  private analyzeRetention(sessions: any[], clients: any[]): BaselineData {
    const activeClients = clients.filter((c) => c.is_active).length;
    const totalClients = clients.length;

    // Weekly retention rate
    const weeklyRetention: number[] = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const weekStart = subWeeks(now, i + 1);
      const weekEnd = subWeeks(now, i);

      const activeInWeek = new Set(
        sessions
          .filter((s) => {
            const date = new Date(s.date);
            return date >= weekStart && date < weekEnd && s.status === 'completed';
          })
          .map((s) => s.client_id)
      ).size;

      if (totalClients > 0) {
        weeklyRetention.push((activeInWeek / totalClients) * 100);
      }
    }

    const { mean, stdDev } = this.calculateStats(weeklyRetention);

    return {
      metricType: 'retention',
      baselineValue: mean || (totalClients > 0 ? (activeClients / totalClients) * 100 : 0),
      standardDeviation: stdDev,
      windowWeeks: 8,
      weight: DEFAULT_WEIGHTS.retention,
      seasonalityFactor: {},
      confidence: this.calculateConfidence(weeklyRetention.length),
      dataPointsCount: weeklyRetention.length,
      lastComputedAt: new Date().toISOString(),
    };
  }

  private analyzeCredits(clients: any[]): BaselineData {
    const creditBalances = clients.map((c) => c.credit_balance || 0);
    const positiveBalances = creditBalances.filter((b) => b > 0).length;
    const healthRate = clients.length > 0 ? (positiveBalances / clients.length) * 100 : 100;

    const { mean, stdDev } = this.calculateStats(creditBalances);

    return {
      metricType: 'credits',
      baselineValue: healthRate,
      standardDeviation: stdDev,
      windowWeeks: 4,
      weight: DEFAULT_WEIGHTS.credits,
      seasonalityFactor: {},
      confidence: this.calculateConfidence(clients.length),
      dataPointsCount: clients.length,
      lastComputedAt: new Date().toISOString(),
    };
  }

  private analyzePayments(sessions: any[], transactions: any[]): BaselineData {
    const completedSessions = sessions.filter((s) => s.status === 'completed').length;
    const paidSessions = transactions.filter((t) => t.type === 'debit').length;

    const paymentRate = completedSessions > 0 ? (paidSessions / completedSessions) * 100 : 100;

    return {
      metricType: 'payments',
      baselineValue: paymentRate,
      standardDeviation: 10,
      windowWeeks: 8,
      weight: DEFAULT_WEIGHTS.payments,
      seasonalityFactor: {},
      confidence: this.calculateConfidence(completedSessions),
      dataPointsCount: completedSessions,
      lastComputedAt: new Date().toISOString(),
    };
  }

  private calculateStats(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0 };

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    return { mean, stdDev };
  }

  private calculateSeasonality(dayData: Record<string, number[]>): Record<string, number> {
    const result: Record<string, number> = {};
    const allValues: number[] = [];

    for (const values of Object.values(dayData)) {
      allValues.push(...values);
    }

    const overallMean = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 1;

    for (const [day, values] of Object.entries(dayData)) {
      if (values.length > 0) {
        const dayMean = values.reduce((a, b) => a + b, 0) / values.length;
        result[day] = overallMean > 0 ? dayMean / overallMean : 1;
      }
    }

    return result;
  }

  private determineOptimalWindow(values: number[]): number {
    if (values.length < 4) return 4;
    if (values.length < 8) return values.length;

    // Calculate variance for different windows
    const variance4 = this.calculateWindowVariance(values, 4);
    const variance8 = this.calculateWindowVariance(values, 8);
    const variance12 = this.calculateWindowVariance(values, 12);

    // Higher variance = need longer window for stability
    if (variance4 < 0.2) return 4;
    if (variance8 < 0.3) return 8;
    return Math.min(12, values.length);
  }

  private calculateWindowVariance(values: number[], windowSize: number): number {
    const recentValues = values.slice(-windowSize);
    const { stdDev, mean } = this.calculateStats(recentValues);
    return mean > 0 ? stdDev / mean : 0; // Coefficient of variation
  }

  private calculateConfidence(dataPoints: number): number {
    // Confidence grows with more data points
    if (dataPoints < 4) return 20;
    if (dataPoints < 8) return 50;
    if (dataPoints < 16) return 75;
    if (dataPoints < 24) return 90;
    return 95;
  }

  private calculateAdaptiveWeights(baselines: BaselineData[]): AdaptiveWeights {
    // Metrics with lower variance get slightly higher weight
    const weights = { ...DEFAULT_WEIGHTS };
    
    // Normalize based on confidence
    let totalWeight = 0;
    for (const baseline of baselines) {
      const confidenceFactor = baseline.confidence / 100;
      weights[baseline.metricType] *= confidenceFactor;
      totalWeight += weights[baseline.metricType];
    }

    // Normalize to sum to 1
    if (totalWeight > 0) {
      for (const key of Object.keys(weights) as MetricType[]) {
        weights[key] = weights[key] / totalWeight;
      }
    }

    return weights;
  }

  private async upsertBaseline(baseline: BaselineData): Promise<void> {
    const { error } = await supabase
      .from('business_health_baselines')
      .upsert({
        user_id: this.userId,
        metric_type: baseline.metricType,
        baseline_value: baseline.baselineValue,
        standard_deviation: baseline.standardDeviation,
        window_weeks: baseline.windowWeeks,
        weight: baseline.weight,
        seasonality_factor: baseline.seasonalityFactor,
        confidence: baseline.confidence,
        data_points_count: baseline.dataPointsCount,
        last_computed_at: baseline.lastComputedAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,metric_type',
      });

    if (error) {
      console.error('Failed to upsert baseline:', error);
    }
  }

  /**
   * Zjistí, jestli je potřeba přepočítat baseline
   */
  async needsRecompute(): Promise<boolean> {
    const baselines = await this.getStoredBaselines();
    
    if (baselines.length < 4) return true;

    const oldestUpdate = baselines.reduce((oldest, b) => {
      const date = new Date(b.lastComputedAt);
      return date < oldest ? date : oldest;
    }, new Date());

    // Recompute if older than 1 week
    const oneWeekAgo = subWeeks(new Date(), 1);
    return oldestUpdate < oneWeekAgo;
  }
}

// Singleton factory
const serviceCache = new Map<string, BaselineService>();

export function getBaselineService(userId: string): BaselineService {
  if (!serviceCache.has(userId)) {
    serviceCache.set(userId, new BaselineService(userId));
  }
  return serviceCache.get(userId)!;
}
