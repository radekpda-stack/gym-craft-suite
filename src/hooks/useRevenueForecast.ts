import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, endOfMonth, format, addMonths, getDay, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface ForecastPoint {
  month: string;
  label: string;
  revenue: number;
  forecast: number | null;
  forecastLow: number | null;
  forecastHigh: number | null;
  expenses: number;
  profit: number;
}

export interface RevenueForecastData {
  points: ForecastPoint[];
  nextMonthForecast: {
    expected: number;
    low: number;
    high: number;
    confidence: number;
    trainingsEstimate: number;
    productEstimate: number;
    vsLastMonth: number;
    vsLastYearSameMonth: number | null;
    label: string;
    signals: ForecastSignal[];
  };
  annualProjection: number;
  avgMonthlyRevenue: number;
  avgMonthlyExpenses: number;
  breakEvenTrainings: number;
  trendDirection: 'up' | 'down' | 'stable';
  seasonalityStrength: number;
  dataQuality: 'low' | 'medium' | 'high';
}

export interface ForecastSignal {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

// ─── Weighted Moving Average with multi-signal blending ───

interface MonthBucket {
  month: number; // 0-11
  year: number;
  trainingIncome: number;
  productIncome: number;
  cancellationIncome: number;
  totalIncome: number;
  trainingCount: number;
  productCount: number;
  cancelledCount: number;
  totalSessionCount: number; // scheduled + completed
  activeClientIds: Set<string>;
  expenses: number;
  avgPrice: number;
  workingDays: number;
}

function computeSeasonalIndex(buckets: MonthBucket[], targetMonth: number): number {
  // Find same-month data from prior years
  const sameMonthBuckets = buckets.filter(b => b.month === targetMonth && b.totalIncome > 0);
  if (sameMonthBuckets.length === 0) return 1;

  const overallAvg = buckets.reduce((s, b) => s + b.totalIncome, 0) / Math.max(1, buckets.filter(b => b.totalIncome > 0).length);
  if (overallAvg === 0) return 1;

  const sameMonthAvg = sameMonthBuckets.reduce((s, b) => s + b.totalIncome, 0) / sameMonthBuckets.length;
  // Dampen the seasonal effect: blend towards 1.0 with limited data
  const dampening = Math.min(1, sameMonthBuckets.length / 3);
  return 1 + (sameMonthAvg / overallAvg - 1) * dampening;
}

function computeCancellationRisk(buckets: MonthBucket[]): number {
  // Average cancellation rate from recent months
  const recent = buckets.slice(-6);
  if (recent.length === 0) return 0;
  const rates = recent
    .filter(b => b.totalSessionCount > 0)
    .map(b => b.cancelledCount / b.totalSessionCount);
  return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
}

function computeClientTrend(buckets: MonthBucket[]): number {
  // Are we gaining or losing clients?
  const recent = buckets.slice(-3);
  const older = buckets.slice(-6, -3);
  if (recent.length === 0 || older.length === 0) return 1;
  const recentAvg = recent.reduce((s, b) => s + b.activeClientIds.size, 0) / recent.length;
  const olderAvg = older.reduce((s, b) => s + b.activeClientIds.size, 0) / older.length;
  if (olderAvg === 0) return 1;
  return recentAvg / olderAvg;
}

export function useRevenueForecast() {
  return useQuery({
    queryKey: ['revenue-forecast-v3'],
    queryFn: async (): Promise<RevenueForecastData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const monthsBack = 24; // 2 years for seasonality
      const startDate = startOfMonth(subMonths(now, monthsBack - 1));
      const nextMonthStart = startOfMonth(addMonths(now, 1));
      const nextMonthEnd = endOfMonth(addMonths(now, 1));

      // ── Fetch ALL relevant data in parallel ──
      const [
        creditTxRes,
        allSessionsRes,
        scheduledNextMonthRes,
        expensesRes,
        activeClientsRes,
      ] = await Promise.all([
        // 1. Credit transactions = single source of truth for income
        supabase
          .from('credit_transactions')
          .select('created_at, amount, type, client_id')
          .in('type', ['training', 'product', 'canceled_training'])
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true }),
        // 2. All training sessions (for cancellation rate, client patterns)
        supabase
          .from('training_sessions')
          .select('id, date, status, final_price, client_id, participant_count')
          .eq('user_id', user.id)
          .gte('date', startDate.toISOString())
          .in('status', ['completed', 'cancelled', 'scheduled']),
        // 3. Already scheduled trainings for next month
        supabase
          .from('training_sessions')
          .select('id, final_price, client_id')
          .eq('user_id', user.id)
          .in('status', ['scheduled', 'completed'])
          .gte('date', nextMonthStart.toISOString())
          .lte('date', nextMonthEnd.toISOString()),
        // 4. Business expenses
        supabase
          .from('business_expenses')
          .select('amount, date')
          .eq('user_id', user.id)
          .gte('date', format(startDate, 'yyyy-MM-dd')),
        // 5. Active clients count (for client trend signal)
        supabase
          .from('clients')
          .select('id, status, created_at')
          .eq('user_id', user.id),
      ]);

      const creditTx = creditTxRes.data || [];
      const allSessions = allSessionsRes.data || [];
      const scheduledNextMonth = scheduledNextMonthRes.data || [];
      const expenses = expensesRes.data || [];
      const allClients = activeClientsRes.data || [];

      // ── Build month buckets ──
      const bucketMap = new Map<string, MonthBucket>();
      
      for (let i = monthsBack - 1; i >= 0; i--) {
        const mStart = startOfMonth(subMonths(now, i));
        const mKey = format(mStart, 'yyyy-MM');
        bucketMap.set(mKey, {
          month: mStart.getMonth(),
          year: mStart.getFullYear(),
          trainingIncome: 0,
          productIncome: 0,
          cancellationIncome: 0,
          totalIncome: 0,
          trainingCount: 0,
          productCount: 0,
          cancelledCount: 0,
          totalSessionCount: 0,
          activeClientIds: new Set(),
          expenses: 0,
          avgPrice: 0,
          workingDays: 0,
        });
      }

      // Fill from credit_transactions (income source of truth)
      creditTx.forEach(tx => {
        const mKey = format(new Date(tx.created_at), 'yyyy-MM');
        const bucket = bucketMap.get(mKey);
        if (!bucket) return;
        const absAmount = Math.abs(tx.amount);
        if (tx.type === 'training') {
          bucket.trainingIncome += absAmount;
          bucket.trainingCount++;
        } else if (tx.type === 'product') {
          bucket.productIncome += absAmount;
          bucket.productCount++;
        } else if (tx.type === 'canceled_training') {
          bucket.cancellationIncome += absAmount;
        }
        bucket.totalIncome = bucket.trainingIncome + bucket.productIncome + bucket.cancellationIncome;
        if (tx.client_id) bucket.activeClientIds.add(tx.client_id);
      });

      // Fill session data (for cancellation rates & client activity)
      allSessions.forEach(s => {
        const mKey = format(new Date(s.date), 'yyyy-MM');
        const bucket = bucketMap.get(mKey);
        if (!bucket) return;
        bucket.totalSessionCount++;
        if (s.status === 'cancelled') bucket.cancelledCount++;
        if (s.client_id) bucket.activeClientIds.add(s.client_id);
      });

      // Fill expenses
      expenses.forEach(e => {
        const mKey = format(new Date(e.date), 'yyyy-MM');
        const bucket = bucketMap.get(mKey);
        if (bucket) bucket.expenses += e.amount;
      });

      // Compute avg price per bucket
      bucketMap.forEach(bucket => {
        if (bucket.trainingCount > 0) {
          bucket.avgPrice = bucket.trainingIncome / bucket.trainingCount;
        }
      });

      const allBuckets = Array.from(bucketMap.values());
      // Only buckets with data
      const activeBuckets = allBuckets.filter(b => b.totalIncome > 0 || b.totalSessionCount > 0);
      const dataMonths = activeBuckets.length;

      // ── Data quality assessment ──
      const dataQuality: 'low' | 'medium' | 'high' = 
        dataMonths >= 12 ? 'high' : dataMonths >= 6 ? 'medium' : 'low';

      // ── Compute forecast signals ──
      const signals: ForecastSignal[] = [];
      const targetMonth = addMonths(now, 1).getMonth();

      // 1. Seasonal index
      const seasonalIndex = computeSeasonalIndex(activeBuckets, targetMonth);
      const seasonalityStrength = Math.abs(seasonalIndex - 1);
      if (seasonalityStrength > 0.1) {
        signals.push({
          name: 'Sezónnost',
          impact: seasonalIndex > 1 ? 'positive' : 'negative',
          description: seasonalIndex > 1 
            ? `Tento měsíc bývá historicky silnější (×${seasonalIndex.toFixed(2)})` 
            : `Tento měsíc bývá historicky slabší (×${seasonalIndex.toFixed(2)})`,
        });
      }

      // 2. Client trend
      const clientTrend = computeClientTrend(activeBuckets);
      if (clientTrend > 1.05) {
        signals.push({ name: 'Růst klientů', impact: 'positive', description: `Počet aktivních klientů roste (+${Math.round((clientTrend - 1) * 100)}%)` });
      } else if (clientTrend < 0.95) {
        signals.push({ name: 'Pokles klientů', impact: 'negative', description: `Počet aktivních klientů klesá (${Math.round((clientTrend - 1) * 100)}%)` });
      }

      // 3. Cancellation risk
      const cancellationRate = computeCancellationRisk(activeBuckets);
      if (cancellationRate > 0.15) {
        signals.push({ name: 'Rušení tréninků', impact: 'negative', description: `Vysoká míra rušení (${Math.round(cancellationRate * 100)}%)` });
      }

      // 4. Scheduled trainings signal
      const scheduledNextMonthIncome = scheduledNextMonth.reduce((s, t) => s + (t.final_price || 0), 0);
      const scheduledCount = scheduledNextMonth.length;
      if (scheduledCount > 0) {
        signals.push({ name: 'Naplánované tréninky', impact: 'positive', description: `Již ${scheduledCount} tréninků naplánováno (${formatCZK(scheduledNextMonthIncome)})` });
      }

      // 5. Product sales trend
      const recentProductIncome = activeBuckets.slice(-3).reduce((s, b) => s + b.productIncome, 0);
      const olderProductIncome = activeBuckets.slice(-6, -3).reduce((s, b) => s + b.productIncome, 0);
      if (recentProductIncome > olderProductIncome * 1.2 && recentProductIncome > 500) {
        signals.push({ name: 'Růst prodeje', impact: 'positive', description: 'Tržby z produktů rostou' });
      }

      // ── Weighted forecast calculation ──
      const recentBuckets = activeBuckets.slice(-12); // Last 12 active months
      const n = recentBuckets.length;

      if (n === 0) {
        return emptyForecast(now);
      }

      // Exponential weights (recent = heavier)
      const weights = recentBuckets.map((_, i) => Math.pow(1.4, i));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      
      // Weighted average of total income
      const wma = recentBuckets.reduce((sum, b, i) => sum + b.totalIncome * weights[i], 0) / totalWeight;

      // Weighted trend (slope)
      const wMeanX = weights.reduce((sum, w, i) => sum + w * i, 0) / totalWeight;
      let sumWXY = 0, sumWX2 = 0;
      recentBuckets.forEach((b, i) => {
        sumWXY += weights[i] * (i - wMeanX) * (b.totalIncome - wma);
        sumWX2 += weights[i] * (i - wMeanX) ** 2;
      });
      const slope = sumWX2 > 0 ? sumWXY / sumWX2 : 0;

      // Base forecast = WMA + trend + seasonal adjustment
      let baseForecast = (wma + slope) * seasonalIndex;

      // Apply client trend factor
      baseForecast *= clientTrend;

      // Apply cancellation discount (expected loss)
      baseForecast *= (1 - cancellationRate * 0.3); // Partial impact

      // Blend with scheduled if significant
      const avgTrainingsPerMonth = recentBuckets.reduce((s, b) => s + b.trainingCount, 0) / n;
      if (scheduledCount > 0) {
        const scheduleRatio = Math.min(1, scheduledCount / Math.max(1, avgTrainingsPerMonth));
        // Extrapolate: if 50% of typical trainings scheduled, double the scheduled income
        const extrapolatedScheduleIncome = scheduleRatio > 0.3 
          ? scheduledNextMonthIncome / scheduleRatio 
          : scheduledNextMonthIncome;
        
        // Blend: weight schedule more when ratio is higher
        const blendWeight = Math.min(0.6, scheduleRatio * 0.7);
        baseForecast = baseForecast * (1 - blendWeight) + extrapolatedScheduleIncome * blendWeight;
      }

      // Add product sales estimate (avg of last 3 months)
      const avgProductIncome = recentBuckets.slice(-3).reduce((s, b) => s + b.productIncome, 0) / Math.min(3, n);

      const finalForecast = Math.max(0, Math.round(baseForecast));

      // ── Confidence interval ──
      const residuals = recentBuckets.map((b, i) => 
        b.totalIncome - (wma + slope * (i - n + 1)) * computeSeasonalIndex(activeBuckets, b.month)
      );
      const variance = residuals.reduce((sum, r) => sum + r * r, 0) / Math.max(1, n - 1);
      const stdDev = Math.sqrt(variance);
      
      const cvNorm = wma > 0 ? Math.min(1, stdDev / wma) : 1;
      const dataConf = Math.min(1, n / 12);
      const signalBonus = scheduledCount > avgTrainingsPerMonth * 0.5 ? 0.1 : 0;
      const confidence = Math.max(10, Math.min(95, Math.round((1 - cvNorm * 0.5) * dataConf * 100 + signalBonus * 100)));

      const margin = stdDev * 1.5;
      const low = Math.max(0, Math.round(finalForecast - margin));
      const high = Math.round(finalForecast + margin);

      // ── vs last month ──
      const lastMonthBucket = activeBuckets[activeBuckets.length - 1];
      const lastMonthIncome = lastMonthBucket?.totalIncome || 0;
      const vsLastMonth = lastMonthIncome > 0
        ? Math.round(((finalForecast - lastMonthIncome) / lastMonthIncome) * 100)
        : 0;

      // ── vs same month last year ──
      const lastYearSameMonth = activeBuckets.find(
        b => b.month === targetMonth && b.year === now.getFullYear() - 1
      );
      const vsLastYearSameMonth = lastYearSameMonth && lastYearSameMonth.totalIncome > 0
        ? Math.round(((finalForecast - lastYearSameMonth.totalIncome) / lastYearSameMonth.totalIncome) * 100)
        : null;

      // ── Build chart points (last 6 months + 3 forecast) ──
      const chartBuckets = allBuckets.slice(-6);
      const points: ForecastPoint[] = chartBuckets.map(b => ({
        month: `${b.year}-${String(b.month + 1).padStart(2, '0')}`,
        label: format(new Date(b.year, b.month, 1), 'LLL', { locale: cs }),
        revenue: b.totalIncome,
        forecast: null,
        forecastLow: null,
        forecastHigh: null,
        expenses: b.expenses,
        profit: b.totalIncome - b.expenses,
      }));

      // Expense forecast
      const recentExpenses = chartBuckets.slice(-3);
      const avgExp = recentExpenses.length > 0
        ? Math.round(recentExpenses.reduce((s, b) => s + b.expenses, 0) / recentExpenses.length)
        : 0;

      // Add 3 forecast months
      for (let i = 1; i <= 3; i++) {
        const mStart = addMonths(now, i);
        const mSeasonalIdx = computeSeasonalIndex(activeBuckets, mStart.getMonth());
        const scaleFactor = mSeasonalIdx / seasonalIndex; // relative to next month
        const uncertaintyScale = 1 + (i - 1) * 0.15;

        const fRev = i === 1 ? finalForecast : Math.round(finalForecast * scaleFactor);
        const fLow = i === 1 ? low : Math.max(0, Math.round(low * scaleFactor * (1 / uncertaintyScale)));
        const fHigh = i === 1 ? high : Math.round(high * scaleFactor * uncertaintyScale);

        points.push({
          month: format(mStart, 'yyyy-MM'),
          label: format(mStart, 'LLL', { locale: cs }),
          revenue: 0,
          forecast: fRev,
          forecastLow: fLow,
          forecastHigh: fHigh,
          expenses: avgExp,
          profit: fRev - avgExp,
        });
      }

      // ── Trend direction ──
      const last3 = activeBuckets.slice(-3).map(b => b.totalIncome);
      const trendDirection: 'up' | 'down' | 'stable' =
        last3.length >= 2
          ? last3[last3.length - 1] > last3[0] * 1.05 ? 'up'
            : last3[last3.length - 1] < last3[0] * 0.95 ? 'down'
            : 'stable'
          : 'stable';

      // Training count estimate
      const trainingsEstimate = scheduledCount > avgTrainingsPerMonth * 0.5
        ? Math.max(scheduledCount, Math.round(avgTrainingsPerMonth))
        : Math.round(avgTrainingsPerMonth);

      // Product estimate
      const productEstimate = Math.round(avgProductIncome);

      // Break-even
      const overallAvgPrice = activeBuckets.reduce((s, b) => s + b.avgPrice, 0) / Math.max(1, activeBuckets.filter(b => b.avgPrice > 0).length);
      const breakEvenTrainings = overallAvgPrice > 0 ? Math.ceil(avgExp / overallAvgPrice) : 0;

      // Annual projection weighted by recent performance
      const annualProjection = Math.round(finalForecast * 12 * (seasonalityStrength > 0.1 ? 1 : 1)); 
      // Better: average the 12-month forecast
      const avgMonthlyRevenue = activeBuckets.length > 0
        ? Math.round(activeBuckets.reduce((s, b) => s + b.totalIncome, 0) / activeBuckets.length)
        : 0;

      return {
        points,
        nextMonthForecast: {
          expected: finalForecast,
          low,
          high,
          confidence,
          trainingsEstimate,
          productEstimate,
          vsLastMonth,
          vsLastYearSameMonth,
          label: format(addMonths(now, 1), 'LLLL', { locale: cs }),
          signals,
        },
        annualProjection: Math.round(avgMonthlyRevenue * 12),
        avgMonthlyRevenue,
        avgMonthlyExpenses: avgExp,
        breakEvenTrainings,
        trendDirection,
        seasonalityStrength,
        dataQuality,
      };
    },
    staleTime: 1000 * 60 * 10,
  });
}

function emptyForecast(now: Date): RevenueForecastData {
  return {
    points: [],
    nextMonthForecast: {
      expected: 0, low: 0, high: 0, confidence: 0,
      trainingsEstimate: 0, productEstimate: 0,
      vsLastMonth: 0, vsLastYearSameMonth: null,
      label: format(addMonths(now, 1), 'LLLL', { locale: cs }),
      signals: [],
    },
    annualProjection: 0, avgMonthlyRevenue: 0, avgMonthlyExpenses: 0,
    breakEvenTrainings: 0, trendDirection: 'stable', seasonalityStrength: 0, dataQuality: 'low',
  };
}

function formatCZK(value: number): string {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}
