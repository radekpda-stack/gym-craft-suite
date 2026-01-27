import { supabase } from '@/integrations/supabase/client';
import type { RxScoringMode } from '@/hooks/useRxWorkouts';

interface PRCheckResult {
  isPR: boolean;
  previousBest: number | null;
  improvement: number | null;
  improvementLabel: string | null;
}

/**
 * Check if a score is a Personal Record for a client on a specific workout
 */
export async function checkForPR(
  workoutId: string,
  clientId: string,
  scorePrimary: number,
  scoringMode: RxScoringMode,
  excludeResultId?: string
): Promise<PRCheckResult> {
  // Fetch all previous results for this client on this workout
  let query = supabase
    .from('rx_workout_results')
    .select('id, score_primary, is_capped')
    .eq('rx_workout_id', workoutId)
    .eq('client_id', clientId)
    .eq('is_capped', false); // Only compare to completed results

  if (excludeResultId) {
    query = query.neq('id', excludeResultId);
  }

  const { data: previousResults, error } = await query;

  if (error) {
    console.error('Error checking PR:', error);
    return { isPR: false, previousBest: null, improvement: null, improvementLabel: null };
  }

  if (!previousResults || previousResults.length === 0) {
    // First result is always a PR
    return { isPR: true, previousBest: null, improvement: null, improvementLabel: 'První výsledek!' };
  }

  // Find previous best based on scoring mode
  const isLowerBetter = scoringMode === 'for_time';
  
  const previousBest = previousResults.reduce((best, result) => {
    if (best === null) return result.score_primary;
    if (isLowerBetter) {
      return result.score_primary < best ? result.score_primary : best;
    }
    return result.score_primary > best ? result.score_primary : best;
  }, null as number | null);

  if (previousBest === null) {
    return { isPR: true, previousBest: null, improvement: null, improvementLabel: 'První výsledek!' };
  }

  // Check if new score is better
  const isBetter = isLowerBetter 
    ? scorePrimary < previousBest 
    : scorePrimary > previousBest;

  if (!isBetter) {
    return { isPR: false, previousBest, improvement: null, improvementLabel: null };
  }

  // Calculate improvement
  const improvement = Math.abs(scorePrimary - previousBest);
  let improvementLabel: string;

  if (scoringMode === 'for_time') {
    const mins = Math.floor(improvement / 60);
    const secs = Math.round(improvement % 60);
    if (mins > 0) {
      improvementLabel = `o ${mins}:${secs.toString().padStart(2, '0')} rychlejší!`;
    } else {
      improvementLabel = `o ${secs}s rychlejší!`;
    }
  } else if (scoringMode === 'max_load') {
    improvementLabel = `+${improvement}kg!`;
  } else {
    // AMRAP/Rounds
    const roundsImproved = Math.floor(improvement);
    const repsImproved = Math.round((improvement - roundsImproved) * 1000);
    if (roundsImproved > 0) {
      improvementLabel = `+${roundsImproved} kol${repsImproved > 0 ? ` ${repsImproved} reps` : ''}!`;
    } else {
      improvementLabel = `+${repsImproved} reps!`;
    }
  }

  return { isPR: true, previousBest, improvement, improvementLabel };
}

/**
 * Mark a result as PR in the database
 */
export async function markAsPR(resultId: string): Promise<void> {
  const { error } = await supabase
    .from('rx_workout_results')
    .update({ is_personal_record: true })
    .eq('id', resultId);

  if (error) {
    console.error('Error marking PR:', error);
    throw error;
  }
}

/**
 * Format improvement for display
 */
export function formatImprovement(
  current: number,
  previous: number,
  scoringMode: RxScoringMode
): string {
  const improvement = Math.abs(current - previous);
  
  if (scoringMode === 'for_time') {
    const mins = Math.floor(improvement / 60);
    const secs = Math.round(improvement % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  } else if (scoringMode === 'max_load') {
    return `${improvement}kg`;
  } else {
    const rounds = Math.floor(improvement);
    const reps = Math.round((improvement - rounds) * 1000);
    return rounds > 0 ? `${rounds}+${reps}` : `${reps} reps`;
  }
}
