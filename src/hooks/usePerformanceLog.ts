import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getTimeMs } from '@/lib/timeUtils';
import { checkIsPR as prEngineCheckIsPR, prepareEntryWithPR, recomputePRsAfterChange } from '@/lib/prEngine';

export type PerformanceSource = 'training_session' | 'coach_manual' | 'client_self_report' | 'import' | 'challenge_manual';
export type PerformanceStatus = 'approved' | 'pending' | 'rejected';

export interface PerformanceLogInput {
  client_id: string;
  exercise_id: string;
  exercise_name: string;
  date: string;
  // Metrics
  sets?: number;
  reps?: number;
  weight_kg?: number;
  time_seconds?: number;
  time_ms?: number;
  distance_meters?: number;
  avg_watts?: number;
  rpe?: number;
  level?: number;
  resistance?: number;
  pace_sec_per_500m?: number;
  // Meta
  notes?: string;
  is_test?: boolean;
  source?: PerformanceSource;
  status?: PerformanceStatus;
}

export interface PerformanceLogEntry extends PerformanceLogInput {
  id: string;
  user_id: string;
  is_pr: boolean | null;
  created_at: string;
  updated_at: string;
  verified_by_user_id?: string | null;
  verified_at?: string | null;
}

// Sync exercise entry to matching challenges
async function syncToChallenge(
  entry: PerformanceLogInput & { id: string },
  userId: string
): Promise<void> {
  try {
    if (!entry.exercise_id) return;
    
    const now = new Date().toISOString();
    
    // Find active challenges linked to this exercise
    const { data: challenges } = await supabase
      .from('challenges')
      .select('id, title, scoring_type, primary_metric, allow_multiple_attempts, exercise_id, fixed_distance_m')
      .eq('status', 'published')
      .eq('exercise_id', entry.exercise_id)
      .lte('start_at', now)
      .gte('end_at', now);

    if (!challenges?.length) {
      // Fallback: try title-based matching for legacy challenges without exercise_id
      const { data: legacyChallenges } = await supabase
        .from('challenges')
        .select('id, title, scoring_type, primary_metric, allow_multiple_attempts, fixed_distance_m')
        .eq('status', 'published')
        .is('exercise_id', null)
        .lte('start_at', now)
        .gte('end_at', now);
      
      if (!legacyChallenges?.length) return;
      
      // Match by exercise name in title
      const exerciseNameLower = entry.exercise_name.toLowerCase();
      const matchingLegacy = legacyChallenges.filter(c => {
        const titleLower = c.title.toLowerCase();
        // Check various keywords
        const keywords = getExerciseKeywords(exerciseNameLower);
        return keywords.some(kw => titleLower.includes(kw));
      });
      
      for (const challenge of matchingLegacy) {
        await upsertChallengeSubmission(challenge, entry);
      }
      return;
    }

    for (const challenge of challenges) {
      // If challenge has fixed distance, only sync if entry distance matches
      if (challenge.fixed_distance_m && entry.distance_meters !== challenge.fixed_distance_m) {
        continue;
      }
      await upsertChallengeSubmission(challenge, entry);
    }
  } catch (error) {
    console.error('Failed to sync to challenge:', error);
  }
}

async function upsertChallengeSubmission(
  challenge: { id: string; scoring_type: string; primary_metric: string; allow_multiple_attempts: boolean | null },
  entry: PerformanceLogInput
): Promise<void> {
  const isTimeBased = challenge.scoring_type === 'time_lower_better';
  
  // Calculate score based on primary metric
  let score: number | null = null;
  switch (challenge.primary_metric) {
    case 'time_seconds':
      score = entry.time_seconds || (entry.time_ms ? entry.time_ms / 1000 : null);
      break;
    case 'reps':
      score = entry.reps || null;
      break;
    case 'weight_kg':
      score = entry.weight_kg || null;
      break;
    case 'distance_m':
      score = entry.distance_meters || null;
      break;
    default:
      score = entry.reps || entry.weight_kg || null;
  }
  
  if (score === null) return;
  
  const now = new Date().toISOString();
  
  // Check existing submissions for this client
  const { data: existingSubmissions } = await supabase
    .from('challenge_submissions')
    .select('id, score_primary')
    .eq('challenge_id', challenge.id)
    .eq('client_id', entry.client_id)
    .order('score_primary', { ascending: isTimeBased });
  
  if (!existingSubmissions?.length) {
    // Create new submission
    await supabase
      .from('challenge_submissions')
      .insert({
        challenge_id: challenge.id,
        client_id: entry.client_id,
        score_primary: score,
        note: entry.notes || null,
        status: 'approved',
        submitted_at: now,
      });
    return;
  }
  
  const bestExisting = existingSubmissions[0].score_primary;
  const isBetter = isTimeBased ? score < bestExisting : score > bestExisting;
  
  if (isBetter) {
    if (challenge.allow_multiple_attempts) {
      await supabase
        .from('challenge_submissions')
        .insert({
          challenge_id: challenge.id,
          client_id: entry.client_id,
          score_primary: score,
          note: entry.notes || null,
          status: 'approved',
          submitted_at: now,
        });
    } else {
      await supabase
        .from('challenge_submissions')
        .update({
          score_primary: score,
          note: entry.notes || null,
          submitted_at: now,
        })
        .eq('id', existingSubmissions[0].id);
    }
  }
}

function getExerciseKeywords(exerciseName: string): string[] {
  const name = exerciseName.toLowerCase();
  
  if (name.includes('veslo') || name.includes('row') || name.includes('erg')) {
    return ['row', 'veslo', 'erg', 'rowing', '500'];
  }
  if (name.includes('skierg') || name.includes('ski erg') || name.includes('skillup') || name.includes('skyark')) {
    return ['ski', 'skierg', 'skillup', 'skyark'];
  }
  if (name.includes('běh') || name.includes('run')) {
    return ['run', 'běh', 'running'];
  }
  if (name.includes('bike') || name.includes('kolo')) {
    return ['bike', 'kolo', 'cycling'];
  }
  
  // Return first word as fallback
  return [name.split(' ')[0]];
}

// Check if this is a PR - now uses PR Engine
async function checkIsPR(
  clientId: string,
  exerciseId: string,
  entry: PerformanceLogInput,
  isTimeBased: boolean
): Promise<boolean> {
  const { isPR } = await prEngineCheckIsPR({
    client_id: clientId,
    exercise_id: exerciseId,
    exercise_name: entry.exercise_name,
    weight_kg: entry.weight_kg,
    time_seconds: entry.time_seconds,
    distance_meters: entry.distance_meters,
    avg_watts: entry.avg_watts,
    reps: entry.reps,
  });
  return isPR;
}

export function useCreatePerformanceLog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: PerformanceLogInput) => {
      if (!user) throw new Error('Not authenticated');
      
      // Determine if time-based
      const isTimeBased = !!(input.time_seconds || input.time_ms);
      
      // Check if PR
      const isPR = input.exercise_id 
        ? await checkIsPR(input.client_id, input.exercise_id, input, isTimeBased)
        : false;
      
      const source = input.source || 'coach_manual';
      const status = input.status || 'approved';
      
      const { data, error } = await supabase
        .from('exercise_entries')
        .insert({
          user_id: user.id,
          client_id: input.client_id,
          exercise_id: input.exercise_id || null,
          exercise_name: input.exercise_name,
          date: input.date,
          sets: input.sets || 1,
          reps: input.reps || null,
          weight_kg: input.weight_kg || null,
          time_seconds: input.time_seconds || null,
          time_ms: input.time_ms || null,
          distance_meters: input.distance_meters || null,
          avg_watts: input.avg_watts || null,
          rpe: input.rpe || null,
          level: input.level || null,
          resistance: input.resistance || null,
          pace_sec_per_500m: input.pace_sec_per_500m || null,
          notes: input.notes || null,
          is_test: input.is_test || false,
          is_pr: isPR,
          source,
          status,
          training_session_id: null, // Off-session log
        })
        .select()
        .single();

      if (error) throw error;
      
      // Sync to challenges if approved
      if (status === 'approved' && input.exercise_id) {
        await syncToChallenge({ ...input, id: data.id }, user.id);
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exercise-entries'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-stats', variables.exercise_id] });
      queryClient.invalidateQueries({ queryKey: ['client-exercises', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['challenge-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['pr-metrics'] });
      toast.success('Výkon uložen');
    },
    onError: (error) => {
      console.error('Create performance log error:', error);
      toast.error('Nepodařilo se uložit výkon');
    },
  });
}

// Hook for pending approvals
export function usePendingPerformances() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-performances', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_entries')
        .select(`
          *,
          clients:client_id (id, name),
          exercises:exercise_id (id, name, name_cs, is_time_based, category)
        `)
        .eq('user_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// Hook for approving/rejecting performance
export function useApprovePerformance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      updates 
    }: { 
      id: string; 
      status: 'approved' | 'rejected';
      updates?: Partial<PerformanceLogInput>;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const updateData: Record<string, unknown> = {
        status,
        verified_by_user_id: user.id,
        verified_at: new Date().toISOString(),
        ...(updates || {}),
      };
      
      // If approving, check for PR
      if (status === 'approved' && updates) {
        const { data: entry } = await supabase
          .from('exercise_entries')
          .select('*')
          .eq('id', id)
          .single();
        
        if (entry?.exercise_id) {
          const isTimeBased = !!(entry.time_seconds || entry.time_ms);
          const isPR = await checkIsPR(entry.client_id, entry.exercise_id, {
            client_id: entry.client_id,
            exercise_id: entry.exercise_id,
            exercise_name: entry.exercise_name,
            date: entry.date,
            time_ms: entry.time_ms ?? undefined,
            time_seconds: entry.time_seconds ?? undefined,
            distance_meters: entry.distance_meters ?? undefined,
            weight_kg: entry.weight_kg ?? undefined,
            reps: entry.reps ?? undefined,
          }, isTimeBased);
          updateData.is_pr = isPR;
        }
      }
      
      const { data, error } = await supabase
        .from('exercise_entries')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          exercises:exercise_id (id, name, is_time_based)
        `)
        .single();

      if (error) throw error;
      
      // Sync to challenges if approved
      if (status === 'approved' && data.exercise_id) {
        await syncToChallenge({
          id: data.id,
          client_id: data.client_id,
          exercise_id: data.exercise_id,
          exercise_name: data.exercise_name,
          date: data.date,
          time_seconds: data.time_seconds,
          time_ms: data.time_ms,
          distance_meters: data.distance_meters,
          reps: data.reps,
          weight_kg: data.weight_kg,
          notes: data.notes,
        }, user.id);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-performances'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-entries'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['pr-metrics'] });
      toast.success('Výkon aktualizován');
    },
    onError: (error) => {
      console.error('Approve performance error:', error);
      toast.error('Nepodařilo se aktualizovat výkon');
    },
  });
}

// Sync all approved entries for an exercise to challenges (useful for backfill)
export async function syncExerciseToChallenge(exerciseId: string): Promise<number> {
  const { data: entries } = await supabase
    .from('exercise_entries')
    .select('*')
    .eq('exercise_id', exerciseId)
    .eq('status', 'approved');
  
  if (!entries?.length) return 0;
  
  let synced = 0;
  for (const entry of entries) {
    try {
      await syncToChallenge({
        id: entry.id,
        client_id: entry.client_id,
        exercise_id: entry.exercise_id || '',
        exercise_name: entry.exercise_name,
        date: entry.date,
        time_seconds: entry.time_seconds ?? undefined,
        time_ms: entry.time_ms ?? undefined,
        distance_meters: entry.distance_meters ?? undefined,
        reps: entry.reps ?? undefined,
        weight_kg: entry.weight_kg ?? undefined,
        notes: entry.notes ?? undefined,
      }, entry.user_id);
      synced++;
    } catch (e) {
      console.error('Failed to sync entry:', entry.id, e);
    }
  }
  
  return synced;
}
