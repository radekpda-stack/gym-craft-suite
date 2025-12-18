import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, isAfter, format, eachDayOfInterval, parseISO } from 'date-fns';

export type NutritionStatus = 'good' | 'moderate' | 'poor' | 'unknown';
export type NutritionTrend = 'improving' | 'stable' | 'declining' | 'unknown';

export interface NutritionEvaluation {
  status: NutritionStatus;
  trend: NutritionTrend;
  hasActive: boolean;
  regularityScore: number; // 0-100
  qualityScore: number; // 0-100
  hydrationScore: number; // 0-100
  problemDays: number;
  entriesCount: number;
  avgMealsPerDay: number;
  avgDrinksPerDay: number;
  avgCoffeePerDay: number;
  summary: string;
  warningSignals: string[];
  sessionEndDate?: string;
}

export function useNutritionEvaluation(clientId: string | undefined) {
  return useQuery({
    queryKey: ['nutrition-evaluation', clientId],
    queryFn: async (): Promise<NutritionEvaluation> => {
      if (!clientId) {
        return getEmptyEvaluation();
      }

      // Get latest session
      const { data: sessions } = await supabase
        .from('nutrition_log_sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!sessions || sessions.length === 0) {
        return getEmptyEvaluation();
      }

      const session = sessions[0];
      const isActive = session.status === 'active';
      const startDate = parseISO(session.start_date);
      const endDate = session.end_date ? parseISO(session.end_date) : new Date();

      // Fetch all entries for this session
      const [foodResult, drinkResult, coffeeResult] = await Promise.all([
        supabase
          .from('nutrition_food_entries')
          .select('*')
          .eq('session_id', session.id),
        supabase
          .from('nutrition_drink_entries')
          .select('*')
          .eq('session_id', session.id),
        supabase
          .from('nutrition_coffee_entries')
          .select('*')
          .eq('session_id', session.id),
      ]);

      const foodEntries = foodResult.data || [];
      const drinkEntries = drinkResult.data || [];
      const coffeeEntries = coffeeResult.data || [];

      const totalEntries = foodEntries.length + drinkEntries.length + coffeeEntries.length;

      // Calculate days in session
      const daysInSession = eachDayOfInterval({ start: startDate, end: endDate });
      const totalDays = Math.max(daysInSession.length, 1);

      // Group entries by day
      const entriesByDay = new Map<string, { food: number; drink: number; coffee: number; quality: string[] }>();
      
      daysInSession.forEach(day => {
        entriesByDay.set(format(day, 'yyyy-MM-dd'), { food: 0, drink: 0, coffee: 0, quality: [] });
      });

      foodEntries.forEach((entry: any) => {
        const dayKey = entry.entry_date;
        const existing = entriesByDay.get(dayKey) || { food: 0, drink: 0, coffee: 0, quality: [] };
        existing.food++;
        if (entry.quality) existing.quality.push(entry.quality);
        entriesByDay.set(dayKey, existing);
      });

      drinkEntries.forEach((entry: any) => {
        const dayKey = entry.entry_date;
        const existing = entriesByDay.get(dayKey) || { food: 0, drink: 0, coffee: 0, quality: [] };
        existing.drink++;
        entriesByDay.set(dayKey, existing);
      });

      coffeeEntries.forEach((entry: any) => {
        const dayKey = entry.entry_date;
        const existing = entriesByDay.get(dayKey) || { food: 0, drink: 0, coffee: 0, quality: [] };
        existing.coffee += entry.count || 1;
        entriesByDay.set(dayKey, existing);
      });

      // Calculate averages
      const avgMealsPerDay = foodEntries.length / totalDays;
      const avgDrinksPerDay = drinkEntries.length / totalDays;
      const avgCoffeePerDay = coffeeEntries.reduce((sum: number, e: any) => sum + (e.count || 1), 0) / totalDays;

      // Calculate regularity (days with at least 3 meals)
      let daysWithGoodMeals = 0;
      let problemDays = 0;
      const qualityScores: number[] = [];

      entriesByDay.forEach((dayData, dayKey) => {
        if (dayData.food >= 3) daysWithGoodMeals++;
        if (dayData.food < 2 && dayData.food > 0) problemDays++;
        if (dayData.food === 0 && isAfter(parseISO(dayKey), subDays(new Date(), 2))) {
          // Don't count very recent days as problems (might not have logged yet)
        } else if (dayData.food === 0) {
          problemDays++;
        }
        
        // Calculate quality score for day
        const goodQuality = dayData.quality.filter(q => q === 'good').length;
        const totalQuality = dayData.quality.length;
        if (totalQuality > 0) {
          qualityScores.push((goodQuality / totalQuality) * 100);
        }
      });

      const regularityScore = Math.round((daysWithGoodMeals / totalDays) * 100);
      const qualityScore = qualityScores.length > 0 
        ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
        : 50;

      // Hydration score (target: at least 4 drinks per day)
      const hydrationScore = Math.min(100, Math.round((avgDrinksPerDay / 4) * 100));

      // Warning signals
      const warningSignals: string[] = [];
      
      if (avgMealsPerDay < 2.5) warningSignals.push('Málo jídel denně');
      if (qualityScore < 40) warningSignals.push('Nízká kvalita stravy');
      if (avgDrinksPerDay < 2) warningSignals.push('Nedostatečná hydratace');
      if (avgCoffeePerDay > 4) warningSignals.push('Vysoká spotřeba kofeinu');
      if (problemDays >= 3) warningSignals.push(`${problemDays} problémových dnů`);

      // Determine status
      let status: NutritionStatus = 'good';
      const overallScore = (regularityScore + qualityScore + hydrationScore) / 3;
      
      if (overallScore < 40 || warningSignals.length >= 3) {
        status = 'poor';
      } else if (overallScore < 60 || warningSignals.length >= 2) {
        status = 'moderate';
      }

      // Determine trend (would need historical data - simplified for now)
      const trend: NutritionTrend = 'stable';

      // Generate summary
      let summary: string;
      if (!isActive && totalEntries === 0) {
        summary = 'Žádné záznamy stravy';
      } else if (status === 'poor') {
        summary = 'Problém – nepravidelná/nekvalitní strava';
      } else if (status === 'moderate') {
        summary = 'Kolísavé – prostor pro zlepšení';
      } else {
        summary = `V pořádku (${Math.round(avgMealsPerDay)} jídel/den)`;
      }

      return {
        status,
        trend,
        hasActive: isActive,
        regularityScore,
        qualityScore,
        hydrationScore,
        problemDays,
        entriesCount: totalEntries,
        avgMealsPerDay,
        avgDrinksPerDay,
        avgCoffeePerDay,
        summary,
        warningSignals,
        sessionEndDate: session.end_date,
      };
    },
    enabled: !!clientId,
  });
}

function getEmptyEvaluation(): NutritionEvaluation {
  return {
    status: 'unknown',
    trend: 'unknown',
    hasActive: false,
    regularityScore: 0,
    qualityScore: 0,
    hydrationScore: 0,
    problemDays: 0,
    entriesCount: 0,
    avgMealsPerDay: 0,
    avgDrinksPerDay: 0,
    avgCoffeePerDay: 0,
    summary: 'Zatím žádné záznamy stravy',
    warningSignals: [],
  };
}
