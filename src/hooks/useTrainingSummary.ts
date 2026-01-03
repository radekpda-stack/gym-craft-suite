import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SessionSummaryData {
  totalVolume: number; // kg * reps
  totalSets: number;
  totalReps: number;
  exerciseCount: number;
  durationMinutes: number;
  averageRPE: number | null;
  newPRs: {
    exerciseName: string;
    value: number;
    unit: string;
    improvement: number;
  }[];
  topExercises: {
    name: string;
    volume: number;
    sets: number;
  }[];
  xpEarned: number;
  streakDays: number;
}

export function useTrainingSummary(trainingSessionId: string | undefined, clientId: string | undefined) {
  return useQuery({
    queryKey: ['training-summary', trainingSessionId, clientId],
    queryFn: async (): Promise<SessionSummaryData | null> => {
      if (!trainingSessionId || !clientId) return null;

      // Fetch exercise entries for this training session
      const { data: entries, error } = await supabase
        .from('exercise_entries')
        .select('*')
        .eq('training_session_id', trainingSessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!entries || entries.length === 0) {
        return {
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
          exerciseCount: 0,
          durationMinutes: 0,
          averageRPE: null,
          newPRs: [],
          topExercises: [],
          xpEarned: 50, // Base XP for completing a workout
          streakDays: 0,
        };
      }

      // Calculate totals
      let totalVolume = 0;
      let totalSets = 0;
      let totalReps = 0;
      let rpeSum = 0;
      let rpeCount = 0;
      const exerciseVolumes: Record<string, { name: string; volume: number; sets: number }> = {};

      for (const entry of entries) {
        const sets = entry.sets || 1;
        const reps = entry.reps || 0;
        const weight = entry.weight_kg || 0;
        const volume = sets * reps * weight;

        totalVolume += volume;
        totalSets += sets;
        totalReps += sets * reps;

        if (entry.rpe) {
          rpeSum += entry.rpe;
          rpeCount++;
        }

        const exerciseKey = entry.exercise_name;
        if (!exerciseVolumes[exerciseKey]) {
          exerciseVolumes[exerciseKey] = { name: entry.exercise_name, volume: 0, sets: 0 };
        }
        exerciseVolumes[exerciseKey].volume += volume;
        exerciseVolumes[exerciseKey].sets += sets;
      }

      // Find new PRs - compare with previous entries
      const newPRs: SessionSummaryData['newPRs'] = [];
      const prEntries = entries.filter(e => e.is_pr);

      for (const prEntry of prEntries) {
        // Get previous best for this exercise
        const { data: previousBest } = await supabase
          .from('exercise_entries')
          .select('weight_kg')
          .eq('client_id', clientId)
          .eq('exercise_name', prEntry.exercise_name)
          .neq('id', prEntry.id)
          .order('weight_kg', { ascending: false })
          .limit(1)
          .maybeSingle();

        const currentWeight = prEntry.weight_kg || 0;
        const previousWeight = previousBest?.weight_kg || 0;
        const improvement = previousWeight > 0 ? currentWeight - previousWeight : 0;

        if (currentWeight > 0) {
          newPRs.push({
            exerciseName: prEntry.exercise_name,
            value: currentWeight,
            unit: 'kg',
            improvement,
          });
        }
      }

      // Top exercises by volume
      const topExercises = Object.values(exerciseVolumes)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);

      // Calculate XP
      let xpEarned = 50; // Base XP
      xpEarned += Math.floor(totalVolume / 500) * 5; // 5 XP per 500kg volume
      xpEarned += newPRs.length * 25; // 25 XP per PR
      xpEarned += entries.length * 2; // 2 XP per exercise

      // Get workout streak
      const { data: recentWorkouts } = await supabase
        .from('client_confirmed_workouts')
        .select('performed_date')
        .eq('client_id', clientId)
        .order('performed_date', { ascending: false })
        .limit(30);

      let streakDays = 0;
      if (recentWorkouts && recentWorkouts.length > 0) {
        // Calculate streak based on workout frequency (allow 2 day gaps)
        const dates = recentWorkouts.map(w => new Date(w.performed_date).getTime());
        const today = Date.now();
        let lastDate = today;

        for (const date of dates) {
          const daysDiff = Math.floor((lastDate - date) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 3) { // Allow up to 3 day gap for streak
            streakDays++;
            lastDate = date;
          } else {
            break;
          }
        }
      }

      return {
        totalVolume: Math.round(totalVolume),
        totalSets,
        totalReps,
        exerciseCount: Object.keys(exerciseVolumes).length,
        durationMinutes: 0, // Will be filled from training session
        averageRPE: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
        newPRs,
        topExercises,
        xpEarned,
        streakDays,
      };
    },
    enabled: !!trainingSessionId && !!clientId,
  });
}
