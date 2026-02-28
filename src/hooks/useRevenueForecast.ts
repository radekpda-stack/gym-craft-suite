import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, endOfMonth, format, getDay, getWeeksInMonth } from 'date-fns';
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
    confidence: number; // 0-100
    trainingsEstimate: number;
    vsLastMonth: number; // percent change
    label: string;
  };
  annualProjection: number;
  avgMonthlyRevenue: number;
  avgMonthlyExpenses: number;
  breakEvenTrainings: number;
  trendDirection: 'up' | 'down' | 'stable';
  seasonalityStrength: number; // 0-1, how much seasonality matters
}

/**
 * Weighted Moving Average with Seasonality detection
 * Much better than simple linear regression for income forecasting
 */
function weightedForecast(revenues: number[], monthIndices: number[]): {
  forecast: number;
  low: number;
  high: number;
  confidence: number;
  seasonalFactors: number[];
} {
  const n = revenues.length;
  if (n === 0) return { forecast: 0, low: 0, high: 0, confidence: 0, seasonalFactors: [] };
  if (n === 1) return { forecast: revenues[0], low: revenues[0] * 0.7, high: revenues[0] * 1.3, confidence: 20, seasonalFactors: [1] };

  // 1. Weighted moving average (recent months matter more)
  // Weights: exponentially increasing towards recent months
  const weights = revenues.map((_, i) => Math.pow(1.5, i));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const wma = revenues.reduce((sum, r, i) => sum + r * weights[i], 0) / totalWeight;

  // 2. Detect trend using weighted linear regression
  const weightedMeanX = weights.reduce((sum, w, i) => sum + w * i, 0) / totalWeight;
  const weightedMeanY = wma;
  
  let sumWXY = 0, sumWX2 = 0;
  revenues.forEach((r, i) => {
    sumWXY += weights[i] * (i - weightedMeanX) * (r - weightedMeanY);
    sumWX2 += weights[i] * (i - weightedMeanX) ** 2;
  });
  const slope = sumWX2 > 0 ? sumWXY / sumWX2 : 0;

  // 3. Simple seasonality detection (month-of-year patterns)
  // Group by month index and calculate relative factors
  const monthBuckets = new Map<number, number[]>();
  revenues.forEach((r, i) => {
    const monthIdx = monthIndices[i] % 12;
    if (!monthBuckets.has(monthIdx)) monthBuckets.set(monthIdx, []);
    monthBuckets.get(monthIdx)!.push(r);
  });

  const avgRev = revenues.reduce((a, b) => a + b, 0) / n;
  const seasonalFactors = monthIndices.map(mi => {
    const bucket = monthBuckets.get(mi % 12);
    if (!bucket || bucket.length < 2 || avgRev === 0) return 1;
    const bucketAvg = bucket.reduce((a, b) => a + b, 0) / bucket.length;
    // Dampen seasonal effect to avoid overfitting with small data
    return 0.7 + 0.3 * (bucketAvg / avgRev);
  });

  // 4. Calculate base forecast
  const trendComponent = wma + slope * 1; // 1 step ahead
  const baseForecast = Math.max(0, trendComponent);

  // 5. Confidence interval based on variance
  const residuals = revenues.map((r, i) => r - (wma + slope * (i - n + 1)));
  const variance = residuals.reduce((sum, r) => sum + r * r, 0) / Math.max(1, n - 1);
  const stdDev = Math.sqrt(variance);
  
  // Confidence decreases with fewer data points and higher variance
  const cvNormalized = avgRev > 0 ? Math.min(1, stdDev / avgRev) : 1;
  const dataConfidence = Math.min(1, n / 12); // More data = more confidence
  const confidence = Math.round((1 - cvNormalized * 0.5) * dataConfidence * 100);

  const marginOfError = stdDev * 1.5; // ~87% confidence interval

  return {
    forecast: Math.round(baseForecast),
    low: Math.max(0, Math.round(baseForecast - marginOfError)),
    high: Math.round(baseForecast + marginOfError),
    confidence: Math.max(10, Math.min(95, confidence)),
    seasonalFactors,
  };
}

export function useRevenueForecast() {
  return useQuery({
    queryKey: ['revenue-forecast-v2'],
    queryFn: async (): Promise<RevenueForecastData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const monthsBack = 12; // Use 12 months for better seasonality
      const startDate = startOfMonth(subMonths(now, monthsBack - 1));

      const [trainingsRes, expensesRes, scheduledNextMonthRes] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('date, final_price, status, participant_count')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', startDate.toISOString()),
        supabase
          .from('business_expenses')
          .select('amount, date')
          .eq('user_id', user.id)
          .gte('date', format(startDate, 'yyyy-MM-dd')),
        // Already scheduled trainings for next month (gives better near-term forecast)
        supabase
          .from('training_sessions')
          .select('id, final_price')
          .eq('user_id', user.id)
          .in('status', ['scheduled', 'completed'])
          .gte('date', startOfMonth(subMonths(now, -1)).toISOString())
          .lte('date', endOfMonth(subMonths(now, -1)).toISOString()),
      ]);

      const trainings = trainingsRes.data || [];
      const expenses = expensesRes.data || [];
      const scheduledNextMonth = scheduledNextMonthRes.data || [];

      const points: ForecastPoint[] = [];
      const revenues: number[] = [];
      const expenseAmounts: number[] = [];
      const monthIndices: number[] = [];
      const trainingCounts: number[] = [];

      for (let i = monthsBack - 1; i >= 0; i--) {
        const mStart = startOfMonth(subMonths(now, i));
        const mKey = format(mStart, 'yyyy-MM');

        const monthTrainings = trainings.filter(t => format(new Date(t.date), 'yyyy-MM') === mKey);
        const rev = monthTrainings.reduce((s, t) => s + (t.final_price || 0), 0);
        const exp = expenses
          .filter(e => format(new Date(e.date), 'yyyy-MM') === mKey)
          .reduce((s, e) => s + e.amount, 0);

        // Only include months that have passed or are current
        if (rev > 0 || i > 0) {
          revenues.push(rev);
          expenseAmounts.push(exp);
          monthIndices.push(mStart.getMonth());
          trainingCounts.push(monthTrainings.length);
        }

        points.push({
          month: mKey,
          label: format(mStart, 'LLL', { locale: cs }),
          revenue: rev,
          forecast: null,
          forecastLow: null,
          forecastHigh: null,
          expenses: exp,
          profit: rev - exp,
        });
      }

      // Only keep last 6 actual months for chart clarity
      const recentPoints = points.slice(-6);

      // Calculate forecast
      const { forecast, low, high, confidence, seasonalFactors } = weightedForecast(revenues, monthIndices);

      // Expense forecast (simple average of last 3 months)
      const recentExpenses = expenseAmounts.slice(-3);
      const avgExp = recentExpenses.length > 0
        ? Math.round(recentExpenses.reduce((a, b) => a + b, 0) / recentExpenses.length)
        : 0;

      // Average trainings per month (for training count estimate)
      const recentTrainingCounts = trainingCounts.slice(-3);
      const avgTrainingsPerMonth = recentTrainingCounts.length > 0
        ? Math.round(recentTrainingCounts.reduce((a, b) => a + b, 0) / recentTrainingCounts.length)
        : 0;

      // If we have scheduled trainings for next month, blend with prediction
      const scheduledNextMonthIncome = scheduledNextMonth.reduce((s, t) => s + (t.final_price || 0), 0);
      const scheduledCount = scheduledNextMonth.length;

      // Blend: if many trainings already scheduled, trust schedule more
      const scheduleWeight = scheduledCount > 0 ? Math.min(0.6, scheduledCount / Math.max(1, avgTrainingsPerMonth)) : 0;
      const blendedForecast = Math.round(
        forecast * (1 - scheduleWeight) + 
        (scheduledNextMonthIncome / Math.max(0.1, scheduleWeight)) * scheduleWeight * scheduleWeight
      );
      // Use pure forecast if schedule blending would be weird
      const finalForecast = scheduleWeight > 0.2 ? blendedForecast : forecast;

      // Use the better of pure forecast or schedule-aware
      const nextMonthExpected = scheduledCount >= avgTrainingsPerMonth * 0.5
        ? Math.max(finalForecast, scheduledNextMonthIncome)
        : finalForecast;

      // Add 3 forecast months
      for (let i = 1; i <= 3; i++) {
        const mStart = startOfMonth(subMonths(now, -i));
        // Scale forecast for further months (more uncertainty)
        const scaleFactor = 1 + (i - 1) * 0.02; // slight growth assumption
        const fRev = i === 1 ? nextMonthExpected : Math.round(forecast * scaleFactor);
        const fLow = i === 1 ? low : Math.round(low * scaleFactor * 0.95);
        const fHigh = i === 1 ? high : Math.round(high * scaleFactor * 1.05);

        recentPoints.push({
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

      // Trend direction from last 3 months
      const last3 = revenues.slice(-3);
      const trendDirection: 'up' | 'down' | 'stable' = 
        last3.length >= 2 
          ? last3[last3.length - 1] > last3[0] * 1.05 ? 'up'
            : last3[last3.length - 1] < last3[0] * 0.95 ? 'down'
            : 'stable'
          : 'stable';

      // Seasonality strength
      const seasonalityStrength = seasonalFactors.length > 3
        ? Math.min(1, Math.max(0, 
            seasonalFactors.reduce((sum, f) => sum + Math.abs(f - 1), 0) / seasonalFactors.length * 3
          ))
        : 0;

      // Last month for comparison
      const lastMonthRev = revenues.length > 0 ? revenues[revenues.length - 1] : 0;
      const vsLastMonth = lastMonthRev > 0
        ? Math.round(((nextMonthExpected - lastMonthRev) / lastMonthRev) * 100)
        : 0;

      const nextMonthStart = startOfMonth(subMonths(now, -1));

      // Annual projection
      const avgRev = revenues.length > 0 
        ? revenues.reduce((a, b) => a + b, 0) / revenues.length 
        : 0;
      const annualProjection = Math.round(avgRev * 12);

      // Training estimate for next month
      const trainingsEstimate = scheduledCount > avgTrainingsPerMonth * 0.5
        ? Math.max(scheduledCount, avgTrainingsPerMonth)
        : avgTrainingsPerMonth;

      // Break-even
      const avgPrice = trainings.length > 0
        ? trainings.reduce((s, t) => s + (t.final_price || 0), 0) / trainings.length
        : 0;
      const breakEvenTrainings = avgPrice > 0 ? Math.ceil(avgExp / avgPrice) : 0;

      return {
        points: recentPoints,
        nextMonthForecast: {
          expected: nextMonthExpected,
          low,
          high,
          confidence,
          trainingsEstimate,
          vsLastMonth,
          label: format(nextMonthStart, 'LLLL', { locale: cs }),
        },
        annualProjection,
        avgMonthlyRevenue: Math.round(avgRev),
        avgMonthlyExpenses: avgExp,
        breakEvenTrainings,
        trendDirection,
        seasonalityStrength,
      };
    },
    staleTime: 1000 * 60 * 10,
  });
}
