/**
 * Hook to correlate training volume/RPE with feedback metrics
 * Provides data for scatter charts and tag-based aggregations
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay } from 'date-fns';
import { safeAverage } from '@/lib/feedbackCalculations';

export interface TrainingFeedbackDataPoint {
  trainingSessionId: string;
  trainingDate: string;
  clientId: string;
  clientName: string;
  
  // Training metrics
  sessionVolume: number | null; // sum of sets × reps × weight
  totalSets: number;
  totalReps: number;
  durationMinutes: number | null;
  rpe: number | null; // from feedback
  
  // Feedback metrics
  bodyFeel: number | null;
  soreness: number | null;
  energy: number | null;
  pain: number | null;
  fun: number | null;
  
  // Tags from training session
  focusTags: string[];
  bodyPartTags: string[];
  intensityTags: string[];
}

export interface TagAggregation {
  tagName: string;
  tagType: 'focus' | 'body_part' | 'intensity';
  count: number;
  avgSoreness: number | null;
  avgBodyFeel: number | null;
  avgEnergy: number | null;
  avgPain: number | null;
  avgVolume: number | null;
}

export interface CorrelationStats {
  volumeVsSoreness: number | null; // Pearson correlation coefficient
  rpeVsBodyFeel: number | null;
  durationVsEnergy: number | null;
}

export interface TrainingFeedbackCorrelationData {
  dataPoints: TrainingFeedbackDataPoint[];
  tagAggregations: TagAggregation[];
  correlations: CorrelationStats;
  totalTrainings: number;
  trainingsWithFeedback: number;
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
function calculateCorrelation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return null;
  
  return Math.round((numerator / denominator) * 100) / 100;
}

export function useTrainingFeedbackCorrelation(
  clientId?: string,
  days: number = 90
) {
  return useQuery({
    queryKey: ['training-feedback-correlation', clientId, days],
    queryFn: async (): Promise<TrainingFeedbackCorrelationData> => {
      const startDate = subDays(new Date(), days);
      
      // Fetch completed feedback requests with their feedback data
      let requestsQuery = supabase
        .from('feedback_requests')
        .select(`
          id,
          client_id,
          training_session_id,
          completed_at
        `)
        .eq('status', 'completed')
        .gte('created_at', startOfDay(startDate).toISOString())
        .not('training_session_id', 'is', null);
      
      if (clientId) {
        requestsQuery = requestsQuery.eq('client_id', clientId);
      }
      
      const { data: requests } = await requestsQuery;
      
      if (!requests || requests.length === 0) {
        return {
          dataPoints: [],
          tagAggregations: [],
          correlations: { volumeVsSoreness: null, rpeVsBodyFeel: null, durationVsEnergy: null },
          totalTrainings: 0,
          trainingsWithFeedback: 0,
        };
      }
      
      const requestIds = requests.map(r => r.id);
      const trainingSessionIds = requests.map(r => r.training_session_id!);
      const clientIds = [...new Set(requests.map(r => r.client_id))];
      
      // Fetch training feedback
      const { data: feedbacks } = await supabase
        .from('training_feedback')
        .select('*')
        .in('feedback_request_id', requestIds);
      
      // Fetch training sessions with tags
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select(`
          id,
          date,
          duration,
          training_session_tags (
            tags (
              id,
              name,
              tag_type
            )
          )
        `)
        .in('id', trainingSessionIds);
      
      // Fetch exercise entries for volume calculation
      const { data: exerciseEntries } = await supabase
        .from('exercise_entries')
        .select('training_session_id, sets, reps, weight_kg')
        .in('training_session_id', trainingSessionIds);
      
      // Fetch client names
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);
      
      const clientMap = (clients || []).reduce((acc, c) => {
        acc[c.id] = c.name;
        return acc;
      }, {} as Record<string, string>);
      
      // Calculate session volumes
      const volumeBySession: Record<string, { volume: number; sets: number; reps: number }> = {};
      (exerciseEntries || []).forEach(entry => {
        const sessionId = entry.training_session_id;
        if (!sessionId) return;
        
        if (!volumeBySession[sessionId]) {
          volumeBySession[sessionId] = { volume: 0, sets: 0, reps: 0 };
        }
        
        const sets = entry.sets || 0;
        const reps = entry.reps || 0;
        const weight = entry.weight_kg || 0;
        
        volumeBySession[sessionId].volume += sets * reps * weight;
        volumeBySession[sessionId].sets += sets;
        volumeBySession[sessionId].reps += sets * reps;
      });
      
      // Build data points
      const dataPoints: TrainingFeedbackDataPoint[] = [];
      
      for (const request of requests) {
        const feedback = (feedbacks || []).find(f => f.feedback_request_id === request.id);
        const session = (sessions || []).find(s => (s as any).id === request.training_session_id);
        
        if (!feedback || !session) continue;
        
        // Extract tags
        const focusTags: string[] = [];
        const bodyPartTags: string[] = [];
        const intensityTags: string[] = [];
        
        const sessionTags = (session as any).training_session_tags || [];
        for (const st of sessionTags) {
          const tag = st.tags;
          if (!tag) continue;
          
          if (tag.tag_type === 'focus') focusTags.push(tag.name);
          else if (tag.tag_type === 'body_part') bodyPartTags.push(tag.name);
          else if (tag.tag_type === 'intensity') intensityTags.push(tag.name);
        }
        
        const volumeData = volumeBySession[request.training_session_id!];
        
        dataPoints.push({
          trainingSessionId: request.training_session_id!,
          trainingDate: (session as any).date,
          clientId: request.client_id,
          clientName: clientMap[request.client_id] || 'Neznámý',
          sessionVolume: volumeData?.volume || null,
          totalSets: volumeData?.sets || 0,
          totalReps: volumeData?.reps || 0,
          durationMinutes: (session as any).duration,
          rpe: feedback.rpe_rating,
          bodyFeel: feedback.body_feel,
          soreness: feedback.soreness,
          energy: feedback.energy_rating,
          pain: feedback.pain,
          fun: feedback.fun,
          focusTags,
          bodyPartTags,
          intensityTags,
        });
      }
      
      // Build tag aggregations
      const tagMap: Record<string, {
        tagType: 'focus' | 'body_part' | 'intensity';
        soreness: number[];
        bodyFeel: number[];
        energy: number[];
        pain: number[];
        volume: number[];
      }> = {};
      
      for (const dp of dataPoints) {
        const addToTag = (tagName: string, tagType: 'focus' | 'body_part' | 'intensity') => {
          if (!tagMap[tagName]) {
            tagMap[tagName] = { tagType, soreness: [], bodyFeel: [], energy: [], pain: [], volume: [] };
          }
          if (dp.soreness !== null) tagMap[tagName].soreness.push(dp.soreness);
          if (dp.bodyFeel !== null) tagMap[tagName].bodyFeel.push(dp.bodyFeel);
          if (dp.energy !== null) tagMap[tagName].energy.push(dp.energy);
          if (dp.pain !== null) tagMap[tagName].pain.push(dp.pain);
          if (dp.sessionVolume !== null) tagMap[tagName].volume.push(dp.sessionVolume);
        };
        
        dp.focusTags.forEach(t => addToTag(t, 'focus'));
        dp.bodyPartTags.forEach(t => addToTag(t, 'body_part'));
        dp.intensityTags.forEach(t => addToTag(t, 'intensity'));
      }
      
      const tagAggregations: TagAggregation[] = Object.entries(tagMap)
        .map(([tagName, data]) => ({
          tagName,
          tagType: data.tagType,
          count: data.soreness.length || data.bodyFeel.length || 1,
          avgSoreness: safeAverage(data.soreness),
          avgBodyFeel: safeAverage(data.bodyFeel),
          avgEnergy: safeAverage(data.energy),
          avgPain: safeAverage(data.pain),
          avgVolume: safeAverage(data.volume),
        }))
        .sort((a, b) => b.count - a.count);
      
      // Calculate correlations
      const validVolumeAndSoreness = dataPoints
        .filter(dp => dp.sessionVolume !== null && dp.soreness !== null);
      const volumeVsSoreness = calculateCorrelation(
        validVolumeAndSoreness.map(dp => dp.sessionVolume!),
        validVolumeAndSoreness.map(dp => dp.soreness!)
      );
      
      const validRpeAndBodyFeel = dataPoints
        .filter(dp => dp.rpe !== null && dp.bodyFeel !== null);
      const rpeVsBodyFeel = calculateCorrelation(
        validRpeAndBodyFeel.map(dp => dp.rpe!),
        validRpeAndBodyFeel.map(dp => dp.bodyFeel!)
      );
      
      const validDurationAndEnergy = dataPoints
        .filter(dp => dp.durationMinutes !== null && dp.energy !== null);
      const durationVsEnergy = calculateCorrelation(
        validDurationAndEnergy.map(dp => dp.durationMinutes!),
        validDurationAndEnergy.map(dp => dp.energy!)
      );
      
      return {
        dataPoints,
        tagAggregations,
        correlations: { volumeVsSoreness, rpeVsBodyFeel, durationVsEnergy },
        totalTrainings: trainingSessionIds.length,
        trainingsWithFeedback: dataPoints.length,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
