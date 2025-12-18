import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DailyAnalysis {
  id: string;
  session_id: string;
  client_id: string;
  analysis_date: string;
  calorie_range_low?: number;
  calorie_range_high?: number;
  calorie_level?: string;
  protein_sources?: string[];
  carb_sources?: string[];
  fat_sources?: string[];
  vegetables_fruits?: string[];
  ultra_processed?: string[];
  protein_score?: number;
  vegetable_fiber_score?: number;
  carb_quality_score?: number;
  fat_quality_score?: number;
  meal_regularity_score?: number;
  hydration_score?: number;
  ultra_processed_score?: number;
  alcohol_sugar_score?: number;
  feedback_positive?: string;
  feedback_improve?: string;
  feedback_suggestions?: string[];
  analyzed_at?: string;
}

export interface WeeklySummary {
  id: string;
  session_id: string;
  client_id: string;
  avg_calorie_range_low?: number;
  avg_calorie_range_high?: number;
  calorie_trend?: string;
  avg_quality_scores?: {
    protein?: number;
    vegetables?: number;
    hydration?: number;
    regularity?: number;
  };
  quality_trend_summary?: string;
  client_strengths?: string[];
  client_weaknesses?: string[];
  client_recommendations?: string[];
  trainer_risks?: string[];
  trainer_observations?: string;
  trainer_conclusion?: string;
  analyzed_at?: string;
}

export function useDailyAnalyses(sessionId: string) {
  return useQuery({
    queryKey: ['nutrition-daily-analyses', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_daily_analysis')
        .select('*')
        .eq('session_id', sessionId)
        .order('analysis_date', { ascending: true });

      if (error) throw error;
      
      // Cast the data to our interface type
      return (data || []) as unknown as DailyAnalysis[];
    },
    enabled: !!sessionId,
  });
}

export function useWeeklySummary(sessionId: string) {
  return useQuery({
    queryKey: ['nutrition-weekly-summary', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_weekly_summary')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error) throw error;
      
      // Cast the data to our interface type
      return data as unknown as WeeklySummary | null;
    },
    enabled: !!sessionId,
  });
}

export function useRunNutritionAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, analyzeType }: { sessionId: string; analyzeType: 'daily' | 'weekly' }) => {
      const { data, error } = await supabase.functions.invoke('analyze-nutrition', {
        body: { sessionId, analyzeType }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId, analyzeType }) => {
      if (analyzeType === 'daily') {
        queryClient.invalidateQueries({ queryKey: ['nutrition-daily-analyses', sessionId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['nutrition-weekly-summary', sessionId] });
      }
      toast.success(analyzeType === 'daily' ? 'Denní analýzy dokončeny' : 'Týdenní shrnutí dokončeno');
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast.error('Nepodařilo se provést analýzu');
    },
  });
}
