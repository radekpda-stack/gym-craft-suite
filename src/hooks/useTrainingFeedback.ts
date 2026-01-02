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
  pain_area_intensities: Record<string, number> | null;
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

// Fetch feedback by feedback_request_id
export function useFeedbackByRequestId(feedbackRequestId: string | undefined) {
  return useQuery({
    queryKey: ['feedback-by-request', feedbackRequestId],
    queryFn: async () => {
      if (!feedbackRequestId) return null;
      
      const { data, error } = await supabase
        .from('training_feedback')
        .select('*')
        .eq('feedback_request_id', feedbackRequestId)
        .maybeSingle();

      if (error) throw error;
      return data as TrainingFeedback | null;
    },
    enabled: !!feedbackRequestId,
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
    // Legacy stats (for backward compatibility)
    avgRpe: feedback.length > 0 
      ? feedback.reduce((sum, f) => sum + (f.difficulty || f.rpe_rating || 5), 0) / feedback.length 
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
    // NEW: D+1 feedback stats (1-10 scale)
    avgSoreness: feedback.filter(f => f.soreness).length > 0
      ? feedback.filter(f => f.soreness).reduce((sum, f) => sum + (f.soreness || 0), 0) / feedback.filter(f => f.soreness).length
      : 0,
    avgBodyFeel: feedback.filter(f => f.body_feel).length > 0
      ? feedback.filter(f => f.body_feel).reduce((sum, f) => sum + (f.body_feel || 0), 0) / feedback.filter(f => f.body_feel).length
      : 0,
    avgEnergy: feedback.filter(f => f.energy_rating).length > 0
      ? feedback.filter(f => f.energy_rating).reduce((sum, f) => sum + (f.energy_rating || 0), 0) / feedback.filter(f => f.energy_rating).length
      : 0,
    avgPain: feedback.filter(f => f.pain).length > 0
      ? feedback.filter(f => f.pain).reduce((sum, f) => sum + (f.pain || 0), 0) / feedback.filter(f => f.pain).length
      : 0,
    avgDifficulty: feedback.filter(f => f.difficulty).length > 0
      ? feedback.filter(f => f.difficulty).reduce((sum, f) => sum + (f.difficulty || 0), 0) / feedback.filter(f => f.difficulty).length
      : 0,
    avgFun: feedback.filter(f => f.fun).length > 0
      ? feedback.filter(f => f.fun).reduce((sum, f) => sum + (f.fun || 0), 0) / feedback.filter(f => f.fun).length
      : 0,
    avgSessionFit: feedback.filter(f => f.session_fit).length > 0
      ? feedback.filter(f => f.session_fit).reduce((sum, f) => sum + (f.session_fit || 0), 0) / feedback.filter(f => f.session_fit).length
      : 0,
    // Red flag count
    redFlagCount: feedback.filter(f => f.is_red_flag).length,
    highPainCount: feedback.filter(f => f.pain && f.pain >= 7).length,
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
    // Time series data for charts - use new fields when available
    rpeOverTime: feedback.map(f => ({
      date: f.training_date,
      value: f.difficulty || f.rpe_rating,
    })).reverse(),
    fatigueOverTime: feedback.map(f => ({
      date: f.training_date,
      value: f.soreness || f.fatigue_level,
    })).reverse(),
    moodOverTime: feedback.map(f => ({
      date: f.training_date,
      value: f.fun || f.mood_rating,
    })).reverse(),
    bodyFeelOverTime: feedback.filter(f => f.body_feel).map(f => ({
      date: f.training_date,
      value: f.body_feel!,
    })).reverse(),
    painOverTime: feedback.filter(f => f.pain).map(f => ({
      date: f.training_date,
      value: f.pain!,
    })).reverse(),
    energyOverTime: feedback.filter(f => f.energy_rating).map(f => ({
      date: f.training_date,
      value: f.energy_rating!,
    })).reverse(),
    sleepVsRpe: feedback
      .filter(f => f.sleep_hours && f.sleep_quality)
      .map(f => ({
        sleepHours: f.sleep_hours,
        sleepQuality: f.sleep_quality,
        rpe: f.difficulty || f.rpe_rating,
        date: f.training_date,
      })).reverse(),
    // Pain area intensity statistics
    painAreaStats: calculatePainAreaStats(feedback),
  };

  return { stats, feedback };
}

// Calculate pain area statistics from feedback
function calculatePainAreaStats(feedback: TrainingFeedback[]) {
  const areaData: Record<string, { totalIntensity: number; count: number; maxIntensity: number }> = {};
  
  feedback.forEach(f => {
    if (f.pain_area_intensities) {
      const intensities = f.pain_area_intensities as Record<string, number>;
      Object.entries(intensities).forEach(([area, intensity]) => {
        // Normalize area name (remove _left, _right, _both suffix for grouping)
        const normalizedArea = area.replace(/_left$|_right$|_both$/, '');
        
        if (!areaData[normalizedArea]) {
          areaData[normalizedArea] = { totalIntensity: 0, count: 0, maxIntensity: 0 };
        }
        areaData[normalizedArea].totalIntensity += intensity;
        areaData[normalizedArea].count += 1;
        areaData[normalizedArea].maxIntensity = Math.max(areaData[normalizedArea].maxIntensity, intensity);
      });
    }
  });

  return {
    byArea: Object.entries(areaData).map(([area, data]) => ({
      area,
      avgIntensity: data.count > 0 ? data.totalIntensity / data.count : 0,
      maxIntensity: data.maxIntensity,
      occurrences: data.count,
    })).sort((a, b) => b.avgIntensity - a.avgIntensity),
    totalPainReports: feedback.filter(f => f.pain && f.pain >= 4).length,
    avgOverallPain: feedback.filter(f => f.pain).length > 0
      ? feedback.filter(f => f.pain).reduce((sum, f) => sum + (f.pain || 0), 0) / feedback.filter(f => f.pain).length
      : 0,
  };
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
