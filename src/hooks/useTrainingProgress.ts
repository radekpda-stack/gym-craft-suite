import { useMemo } from 'react';
import { useTrainingSessions, TrainingSession } from './useTrainingSessions';
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, format } from 'date-fns';
import { cs } from 'date-fns/locale';

export type ProgressStatus = 'improvement' | 'stagnation' | 'overload';

export interface TrainingProgressEvaluation {
  status: ProgressStatus;
  reason: string;
}

export interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  trainingCount: number;
  totalVolume: number;
  avgDifficulty: number | null;
  avgRPE: number | null;
  trainingTypes: Record<string, number>;
  evaluation: string;
}

/**
 * Evaluate progress status based on simple rules:
 * - Higher volume/intensity than last week → improvement
 * - Same load repeatedly → stagnation  
 * - High RPE + poor feedback → overload
 */
export function evaluateTrainingProgress(
  current: TrainingSession,
  previousTrainings: TrainingSession[]
): TrainingProgressEvaluation {
  // Get trainings from last 7 days before this training
  const currentDate = new Date(current.date);
  const oneWeekAgo = subWeeks(currentDate, 1);
  const twoWeeksAgo = subWeeks(currentDate, 2);

  const lastWeekTrainings = previousTrainings.filter(t => {
    const date = new Date(t.date);
    return date >= oneWeekAgo && date < currentDate && t.status === 'completed';
  });

  const prevWeekTrainings = previousTrainings.filter(t => {
    const date = new Date(t.date);
    return date >= twoWeeksAgo && date < oneWeekAgo && t.status === 'completed';
  });

  // Calculate averages
  const currentRPE = current.rpe || 0;
  const currentDifficulty = current.subjective_difficulty || current.subjective_rating || 5;
  const currentVolume = current.total_volume || 0;

  const avgLastWeekVolume = lastWeekTrainings.length > 0
    ? lastWeekTrainings.reduce((sum, t) => sum + (t.total_volume || 0), 0) / lastWeekTrainings.length
    : 0;

  const avgLastWeekRPE = lastWeekTrainings.length > 0
    ? lastWeekTrainings.reduce((sum, t) => sum + (t.rpe || 0), 0) / lastWeekTrainings.length
    : 0;

  // Rule 1: High RPE (>=8) + poor rating (<= 4) → overload
  if (currentRPE >= 8 && currentDifficulty <= 4) {
    return { 
      status: 'overload', 
      reason: 'Vysoké RPE s nízkým hodnocením – možné přetížení' 
    };
  }

  // Rule 2: Volume increased by more than 10% → improvement
  if (avgLastWeekVolume > 0 && currentVolume > avgLastWeekVolume * 1.1) {
    return { 
      status: 'improvement', 
      reason: 'Zvýšený objem oproti minulému týdnu' 
    };
  }

  // Rule 3: RPE decreased while maintaining or increasing volume → improvement  
  if (avgLastWeekRPE > 0 && currentRPE < avgLastWeekRPE - 1 && currentVolume >= avgLastWeekVolume * 0.9) {
    return { 
      status: 'improvement', 
      reason: 'Nižší RPE při zachování objemu' 
    };
  }

  // Rule 4: High difficulty (8+) combined with high RPE (8+) repeatedly → overload
  const recentHighLoadCount = lastWeekTrainings.filter(t => 
    (t.rpe || 0) >= 8 && (t.subjective_difficulty || t.subjective_rating || 5) >= 8
  ).length;
  if (recentHighLoadCount >= 2 && currentRPE >= 8) {
    return { 
      status: 'overload', 
      reason: 'Opakovaně vysoká zátěž – riziko přetrénování' 
    };
  }

  // Rule 5: Similar volume and RPE over 3+ trainings → stagnation
  if (lastWeekTrainings.length >= 2) {
    const volumeVariance = Math.abs(currentVolume - avgLastWeekVolume) / Math.max(avgLastWeekVolume, 1);
    const rpeVariance = Math.abs(currentRPE - avgLastWeekRPE);
    
    if (volumeVariance < 0.05 && rpeVariance < 1) {
      return { 
        status: 'stagnation', 
        reason: 'Stejná zátěž opakovaně – zvažte progres' 
      };
    }
  }

  // Default: improvement if good rating, otherwise neutral (stagnation)
  if (currentDifficulty >= 7) {
    return { 
      status: 'improvement', 
      reason: 'Dobrý trénink' 
    };
  }

  return { 
    status: 'stagnation', 
    reason: 'Stabilní zátěž' 
  };
}

export function useTrainingProgress(clientId?: string) {
  const { data: sessions = [] } = useTrainingSessions(clientId);

  const evaluations = useMemo(() => {
    const result: Record<string, TrainingProgressEvaluation> = {};
    
    sessions.forEach((session, index) => {
      if (session.status === 'completed') {
        const previousTrainings = sessions.slice(index + 1); // older trainings
        result[session.id] = evaluateTrainingProgress(session, previousTrainings);
      }
    });

    return result;
  }, [sessions]);

  return evaluations;
}

export function useWeeklySummary(clientId?: string) {
  const { data: sessions = [] } = useTrainingSessions(clientId);

  const summary = useMemo((): WeeklySummary | null => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const thisWeekSessions = sessions.filter(s => {
      const date = new Date(s.date);
      return isWithinInterval(date, { start: weekStart, end: weekEnd }) && 
             s.status === 'completed';
    });

    if (thisWeekSessions.length === 0) return null;

    const totalVolume = thisWeekSessions.reduce((sum, s) => sum + (s.total_volume || 0), 0);
    
    const difficultySessions = thisWeekSessions.filter(s => s.subjective_difficulty || s.subjective_rating);
    const avgDifficulty = difficultySessions.length > 0
      ? difficultySessions.reduce((sum, s) => sum + (s.subjective_difficulty || s.subjective_rating || 0), 0) / difficultySessions.length
      : null;

    const rpeSessions = thisWeekSessions.filter(s => s.rpe);
    const avgRPE = rpeSessions.length > 0
      ? rpeSessions.reduce((sum, s) => sum + (s.rpe || 0), 0) / rpeSessions.length
      : null;

    const trainingTypes: Record<string, number> = {};
    thisWeekSessions.forEach(s => {
      const type = s.training_type || 'other';
      trainingTypes[type] = (trainingTypes[type] || 0) + 1;
    });

    // Generate evaluation text
    let evaluation = '';
    if (avgRPE !== null) {
      if (avgRPE >= 8) evaluation = 'Vysoká intenzita – zvažte regeneraci';
      else if (avgRPE >= 6) evaluation = 'Dobrá intenzita';
      else evaluation = 'Nižší intenzita – prostor pro progresi';
    } else {
      evaluation = thisWeekSessions.length >= 3 ? 'Aktivní týden' : 'Průměrná aktivita';
    }

    return {
      weekStart,
      weekEnd,
      trainingCount: thisWeekSessions.length,
      totalVolume,
      avgDifficulty,
      avgRPE,
      trainingTypes,
      evaluation,
    };
  }, [sessions]);

  return summary;
}

export const TRAINING_TYPES = {
  strength: { label: 'Silový', color: 'bg-accent' },
  conditioning: { label: 'Kondiční', color: 'bg-warning' },
  hiit: { label: 'HIIT', color: 'bg-destructive' },
  cardio: { label: 'Kardio', color: 'bg-primary' },
  running: { label: 'Běh', color: 'bg-success' },
  mobility: { label: 'Mobilita', color: 'bg-muted-foreground' },
  flexibility: { label: 'Flexibilita', color: 'bg-accent/70' },
  regeneration: { label: 'Regenerace', color: 'bg-primary/80' },
  functional: { label: 'Funkční', color: 'bg-accent/80' },
  diagnostic: { label: 'Diagnostický', color: 'bg-warning' },
  other: { label: 'Jiný', color: 'bg-muted' },
} as const;

export type TrainingType = keyof typeof TRAINING_TYPES;
