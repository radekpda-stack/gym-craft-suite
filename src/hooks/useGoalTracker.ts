import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, differenceInDays, addDays, format } from 'date-fns';

export interface MonthlyGoal {
  id: string;
  type: 'trainings' | 'income';
  targetValue: number;
  currentValue: number;
  month: string; // YYYY-MM format
}

export interface GoalTrackerData {
  trainingsGoal: MonthlyGoal | null;
  incomeGoal: MonthlyGoal | null;
  trainingsProgress: number;
  incomeProgress: number;
  predictedTrainingsCompletion: Date | null;
  predictedIncomeCompletion: Date | null;
  daysRemaining: number;
  avgDailyTrainings: number;
  avgDailyIncome: number;
}

export function useGoalTracker() {
  return useQuery({
    queryKey: ['goal-tracker'],
    queryFn: async (): Promise<GoalTrackerData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const currentMonth = format(thisMonthStart, 'yyyy-MM');
      const daysPassed = differenceInDays(now, thisMonthStart) + 1;
      const daysRemaining = differenceInDays(thisMonthEnd, now);
      const totalDaysInMonth = differenceInDays(thisMonthEnd, thisMonthStart) + 1;

      // Get goals from app_settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('user_id', user.id)
        .in('key', ['monthly_trainings_goal', 'monthly_income_goal']);

      // Get current month stats
      const { data: trainings } = await supabase
        .from('training_sessions')
        .select('id, final_price')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', thisMonthStart.toISOString())
        .lte('date', thisMonthEnd.toISOString());

      const currentTrainings = trainings?.length || 0;
      const currentIncome = trainings?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;

      // Parse goals from settings
      let trainingsTarget = 0;
      let incomeTarget = 0;
      
      settings?.forEach(s => {
        if (s.key === 'monthly_trainings_goal') {
          trainingsTarget = typeof s.value === 'number' ? s.value : parseInt(String(s.value)) || 0;
        }
        if (s.key === 'monthly_income_goal') {
          incomeTarget = typeof s.value === 'number' ? s.value : parseInt(String(s.value)) || 0;
        }
      });

      // Calculate progress
      const trainingsProgress = trainingsTarget > 0 ? (currentTrainings / trainingsTarget) * 100 : 0;
      const incomeProgress = incomeTarget > 0 ? (currentIncome / incomeTarget) * 100 : 0;

      // Calculate daily averages and predictions
      const avgDailyTrainings = daysPassed > 0 ? currentTrainings / daysPassed : 0;
      const avgDailyIncome = daysPassed > 0 ? currentIncome / daysPassed : 0;

      // Predict completion dates
      let predictedTrainingsCompletion: Date | null = null;
      let predictedIncomeCompletion: Date | null = null;

      if (avgDailyTrainings > 0 && trainingsTarget > currentTrainings) {
        const daysNeeded = Math.ceil((trainingsTarget - currentTrainings) / avgDailyTrainings);
        predictedTrainingsCompletion = addDays(now, daysNeeded);
      } else if (currentTrainings >= trainingsTarget && trainingsTarget > 0) {
        predictedTrainingsCompletion = now; // Already achieved
      }

      if (avgDailyIncome > 0 && incomeTarget > currentIncome) {
        const daysNeeded = Math.ceil((incomeTarget - currentIncome) / avgDailyIncome);
        predictedIncomeCompletion = addDays(now, daysNeeded);
      } else if (currentIncome >= incomeTarget && incomeTarget > 0) {
        predictedIncomeCompletion = now; // Already achieved
      }

      return {
        trainingsGoal: trainingsTarget > 0 ? {
          id: 'trainings',
          type: 'trainings',
          targetValue: trainingsTarget,
          currentValue: currentTrainings,
          month: currentMonth,
        } : null,
        incomeGoal: incomeTarget > 0 ? {
          id: 'income',
          type: 'income',
          targetValue: incomeTarget,
          currentValue: currentIncome,
          month: currentMonth,
        } : null,
        trainingsProgress: Math.min(100, trainingsProgress),
        incomeProgress: Math.min(100, incomeProgress),
        predictedTrainingsCompletion,
        predictedIncomeCompletion,
        daysRemaining,
        avgDailyTrainings,
        avgDailyIncome,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, value }: { type: 'trainings' | 'income'; value: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const key = type === 'trainings' ? 'monthly_trainings_goal' : 'monthly_income_goal';

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key,
          value,
          user_id: user.id,
          description: type === 'trainings' ? 'Měsíční cíl počtu tréninků' : 'Měsíční cíl příjmu',
        }, {
          onConflict: 'key,user_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-tracker'] });
    },
  });
}
