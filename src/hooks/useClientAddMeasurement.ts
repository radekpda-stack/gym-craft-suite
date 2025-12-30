import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

interface AddMeasurementInput {
  date: string;
  weight?: number;
  body_fat_percentage?: number;
  notes?: string;
}

interface AddCardioInput {
  date: string;
  exercise_name: string;
  duration_seconds: number;
  distance_meters: number;
  notes?: string;
}

export function useClientAddMeasurement() {
  const { clientId, user } = useClientPortal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddMeasurementInput) => {
      if (!clientId) {
        throw new Error('Nejste přihlášen jako klient');
      }

      // Normalize number input (support comma as decimal separator)
      const normalizeNumber = (val?: number): number | null => {
        if (val === undefined || val === null) return null;
        return val;
      };

      const { data, error } = await supabase
        .from('measurements')
        .insert({
          client_id: clientId,
          user_id: user?.id || null, // Use client's auth user ID for RLS
          date: input.date,
          weight: normalizeNumber(input.weight),
          body_fat_percentage: normalizeNumber(input.body_fat_percentage),
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Measurement insert error:', error);
        throw new Error(error.message || 'Nepodařilo se uložit měření');
      }
      return data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['client-weight-progress', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-bodyfat-progress', clientId] });
    },
  });
}

export function useClientAddCardio() {
  const { clientId, user } = useClientPortal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddCardioInput) => {
      if (!clientId) {
        throw new Error('Nejste přihlášen jako klient');
      }

      // Check if this is a PR (best time for this distance)
      const isPR = await checkIfCardioIsPR(
        clientId,
        input.exercise_name,
        input.distance_meters,
        input.duration_seconds
      );

      const { data, error } = await supabase
        .from('cardio_entries')
        .insert({
          client_id: clientId,
          user_id: user?.id || null, // Use client's auth user ID for RLS
          date: input.date,
          exercise_name: input.exercise_name,
          duration_seconds: input.duration_seconds,
          distance_meters: input.distance_meters,
          notes: input.notes || null,
          is_pr: isPR,
        })
        .select()
        .single();

      if (error) {
        console.error('Cardio entry insert error:', error);
        throw new Error(error.message || 'Nepodařilo se uložit kardio záznam');
      }

      // Auto-submit to matching active challenges
      await autoSubmitToChallenge(
        clientId,
        input.exercise_name,
        input.distance_meters,
        input.duration_seconds,
        input.notes
      );

      return data;
    },
    onSuccess: () => {
      // Invalidate cardio progress queries
      queryClient.invalidateQueries({ queryKey: ['client-cardio-progress', clientId] });
      queryClient.invalidateQueries({ queryKey: ['cardio-entries', clientId] });
      queryClient.invalidateQueries({ queryKey: ['cardio-stats', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-active-challenges'] });
    },
  });
}

// PR detection for cardio: best time for a given distance
async function checkIfCardioIsPR(
  clientId: string,
  exerciseName: string,
  distanceMeters: number,
  durationSeconds: number
): Promise<boolean> {
  if (!distanceMeters || !durationSeconds) return false;

  const { data: existingEntries } = await supabase
    .from('cardio_entries')
    .select('duration_seconds')
    .eq('client_id', clientId)
    .eq('exercise_name', exerciseName)
    .eq('distance_meters', distanceMeters)
    .not('duration_seconds', 'is', null)
    .order('duration_seconds', { ascending: true })
    .limit(1);

  // First entry for this distance is a PR
  if (!existingEntries?.length) return true;

  // New time is better (lower) than the best existing time
  const bestExistingTime = existingEntries[0].duration_seconds;
  return durationSeconds < bestExistingTime;
}

// Auto-submit cardio result to matching active challenges
async function autoSubmitToChallenge(
  clientId: string,
  exerciseName: string,
  distanceMeters: number,
  durationSeconds: number,
  notes?: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Find active challenges that match this exercise type
    // Look for challenges with "row" or "veslo" in title for rowing, etc.
    const exerciseKeywords = getExerciseKeywords(exerciseName);
    
    const { data: challenges } = await supabase
      .from('challenges')
      .select('id, title, scoring_type, primary_metric, allow_multiple_attempts')
      .eq('status', 'published')
      .lte('start_at', now)
      .gte('end_at', now);

    if (!challenges?.length) return;

    // Find matching challenge based on exercise name and distance
    const matchingChallenge = challenges.find(c => {
      const titleLower = c.title.toLowerCase();
      // Check if title contains exercise keyword and distance
      const hasExercise = exerciseKeywords.some(kw => titleLower.includes(kw));
      const hasDistance = titleLower.includes(String(distanceMeters)) || 
                          titleLower.includes(`${distanceMeters / 1000}k`) ||
                          titleLower.includes(`${distanceMeters}m`);
      return hasExercise && (hasDistance || distanceMeters === 500); // Default 500m for rowing
    });

    if (!matchingChallenge) return;

    // Check if client already has a submission for this challenge
    const { data: existingSubmission } = await supabase
      .from('challenge_submissions')
      .select('id, score_primary')
      .eq('challenge_id', matchingChallenge.id)
      .eq('client_id', clientId)
      .order('score_primary', { ascending: true })
      .limit(1);

    const isTimeBased = matchingChallenge.scoring_type === 'time_lower_better';
    const newScore = durationSeconds;

    // If no existing submission, create one
    if (!existingSubmission?.length) {
      await supabase
        .from('challenge_submissions')
        .insert({
          challenge_id: matchingChallenge.id,
          client_id: clientId,
          score_primary: newScore,
          note: notes || null,
          status: 'approved',
          submitted_at: now,
        });
      console.log('Created new challenge submission for', matchingChallenge.title);
      return;
    }

    // If better score (or multiple attempts allowed), update/insert
    const existingScore = existingSubmission[0].score_primary;
    const isBetter = isTimeBased ? newScore < existingScore : newScore > existingScore;

    if (isBetter) {
      if (matchingChallenge.allow_multiple_attempts) {
        // Insert new submission (multiple attempts allowed)
        await supabase
          .from('challenge_submissions')
          .insert({
            challenge_id: matchingChallenge.id,
            client_id: clientId,
            score_primary: newScore,
            note: notes || null,
            status: 'approved',
            submitted_at: now,
          });
      } else {
        // Update existing submission
        await supabase
          .from('challenge_submissions')
          .update({
            score_primary: newScore,
            note: notes || null,
            submitted_at: now,
          })
          .eq('id', existingSubmission[0].id);
      }
      console.log('Updated challenge submission with better score for', matchingChallenge.title);
    }
  } catch (error) {
    console.error('Failed to auto-submit to challenge:', error);
    // Don't throw - this is a secondary action
  }
}

// Get keywords to match exercise names to challenge titles
function getExerciseKeywords(exerciseName: string): string[] {
  const name = exerciseName.toLowerCase();
  
  if (name.includes('veslo') || name.includes('row') || name.includes('erg')) {
    return ['row', 'veslo', 'erg', 'rowing'];
  }
  if (name.includes('běh') || name.includes('run')) {
    return ['run', 'běh', 'running'];
  }
  if (name.includes('bike') || name.includes('kolo')) {
    return ['bike', 'kolo', 'cycling'];
  }
  
  return [name];
}
