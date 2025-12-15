import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrainingFeedback {
  id: string;
  training_session_id: string;
  client_id: string;
  user_id: string;
  training_date: string;
  training_type: string | null;
  rpe_rating: number;
  fatigue_level: number;
  muscle_soreness: string[];
  muscle_soreness_comment: string | null;
  energy_level: string;
  energy_rating: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  mood_rating: number;
  technique_rating: number;
  goal_relevance: string;
  comment: string | null;
  source: string | null;
  // New D+1 fields
  soreness: number | null;
  body_feel: number | null;
  pain: number | null;
  session_fit: number | null;
  difficulty: number | null;
  fun: number | null;
  pain_area: string | null;
  pain_area_other: string | null;
  is_red_flag: boolean;
  red_flag_reasons: string[] | null;
  feedback_request_id: string | null;
  is_processed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedbackInput {
  training_session_id: string;
  client_id: string;
  training_date: string;
  training_type?: string | null;
  rpe_rating: number;
  fatigue_level: number;
  muscle_soreness: string[];
  muscle_soreness_comment?: string | null;
  energy_level: 'stable' | 'better_end' | 'low_entire' | 'good_start_only';
  sleep_hours?: number | null;
  sleep_quality?: number | null;
  mood_rating: number;
  technique_rating: number;
  goal_relevance: 'yes' | 'partially' | 'no';
  comment?: string | null;
}

// Fetch feedback for a specific training session
export function useTrainingFeedback(trainingSessionId: string | undefined) {
  return useQuery({
    queryKey: ['training-feedback', trainingSessionId],
    queryFn: async () => {
      if (!trainingSessionId) return null;
      
      const { data, error } = await supabase
        .from('training_feedback')
        .select('*')
        .eq('training_session_id', trainingSessionId)
        .maybeSingle();

      if (error) throw error;
      return data as TrainingFeedback | null;
    },
    enabled: !!trainingSessionId,
  });
}

// Fetch all feedback for a specific client
export function useClientFeedback(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-feedback', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('training_feedback')
        .select('*')
        .eq('client_id', clientId)
        .order('training_date', { ascending: false });

      if (error) throw error;
      return data as TrainingFeedback[];
    },
    enabled: !!clientId,
  });
}

// Fetch feedback statistics for a client
export function useClientFeedbackStats(clientId: string | undefined) {
  const { data: feedback = [] } = useClientFeedback(clientId);

  const stats = {
    totalFeedback: feedback.length,
    avgRpe: feedback.length > 0 
      ? feedback.reduce((sum, f) => sum + f.rpe_rating, 0) / feedback.length 
      : 0,
    avgFatigue: feedback.length > 0 
      ? feedback.reduce((sum, f) => sum + f.fatigue_level, 0) / feedback.length 
      : 0,
    avgMood: feedback.length > 0 
      ? feedback.reduce((sum, f) => sum + f.mood_rating, 0) / feedback.length 
      : 0,
    avgTechnique: feedback.length > 0 
      ? feedback.reduce((sum, f) => sum + f.technique_rating, 0) / feedback.length 
      : 0,
    avgSleepHours: feedback.filter(f => f.sleep_hours).length > 0
      ? feedback.filter(f => f.sleep_hours).reduce((sum, f) => sum + (f.sleep_hours || 0), 0) / feedback.filter(f => f.sleep_hours).length
      : 0,
    avgSleepQuality: feedback.filter(f => f.sleep_quality).length > 0
      ? feedback.filter(f => f.sleep_quality).reduce((sum, f) => sum + (f.sleep_quality || 0), 0) / feedback.filter(f => f.sleep_quality).length
      : 0,
    // Muscle soreness frequency
    muscleFrequency: feedback.reduce((acc, f) => {
      f.muscle_soreness.forEach(muscle => {
        acc[muscle] = (acc[muscle] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>),
    // Goal relevance breakdown
    goalRelevance: {
      yes: feedback.filter(f => f.goal_relevance === 'yes').length,
      partially: feedback.filter(f => f.goal_relevance === 'partially').length,
      no: feedback.filter(f => f.goal_relevance === 'no').length,
    },
    // Energy level breakdown
    energyLevels: {
      stable: feedback.filter(f => f.energy_level === 'stable').length,
      better_end: feedback.filter(f => f.energy_level === 'better_end').length,
      low_entire: feedback.filter(f => f.energy_level === 'low_entire').length,
      good_start_only: feedback.filter(f => f.energy_level === 'good_start_only').length,
    },
    // Time series data for charts
    rpeOverTime: feedback.map(f => ({
      date: f.training_date,
      value: f.rpe_rating,
    })).reverse(),
    fatigueOverTime: feedback.map(f => ({
      date: f.training_date,
      value: f.fatigue_level,
    })).reverse(),
    moodOverTime: feedback.map(f => ({
      date: f.training_date,
      value: f.mood_rating,
    })).reverse(),
    sleepVsRpe: feedback
      .filter(f => f.sleep_hours && f.sleep_quality)
      .map(f => ({
        sleepHours: f.sleep_hours,
        sleepQuality: f.sleep_quality,
        rpe: f.rpe_rating,
        date: f.training_date,
      })).reverse(),
  };

  return { stats, feedback };
}

// Create new feedback
export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFeedbackInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('training_feedback')
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-feedback', data.training_session_id] });
      queryClient.invalidateQueries({ queryKey: ['client-feedback', data.client_id] });
      toast.success('Zpětná vazba uložena');
    },
    onError: (error) => {
      console.error('Error creating feedback:', error);
      toast.error('Nepodařilo se uložit zpětnou vazbu');
    },
  });
}

// Update existing feedback
export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateFeedbackInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_feedback')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-feedback', data.training_session_id] });
      queryClient.invalidateQueries({ queryKey: ['client-feedback', data.client_id] });
      toast.success('Zpětná vazba aktualizována');
    },
    onError: (error) => {
      console.error('Error updating feedback:', error);
      toast.error('Nepodařilo se aktualizovat zpětnou vazbu');
    },
  });
}
