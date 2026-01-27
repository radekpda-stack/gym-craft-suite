import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { RxScoringMode } from './useRxWorkouts';

export type { RxScoringMode };

export interface ParsedExercise {
  exercise_name: string;
  exercise_id?: string;
  reps_min?: number;
  rx_weight_kg?: number;
  rx_distance_m?: number;
  time_seconds?: number;
  unit_label?: string;
}

export interface ParsedRxWorkout {
  valid: boolean;
  errors: string[];
  template: {
    name: string;
    workout_format: string;
    scoring_mode: RxScoringMode;
    time_cap_seconds?: number;
    rounds?: number;
    work_interval_seconds?: number;
    rest_interval_seconds?: number;
    is_rx_workout: true;
    description?: string;
  };
  exercises: ParsedExercise[];
  unmapped_exercises: string[];
}

// Fetch all exercises for mapping
export function useExercisesForMapping() {
  return useQuery({
    queryKey: ['exercises-for-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, name_cs')
        .eq('is_archived', false);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Parse time string (MM:SS or M:SS) to seconds
function parseTimeToSeconds(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

// Parse exercise line: "21x Thruster | 43kg" or "400m Row" or "1x Deadlift | 1RM"
function parseExerciseLine(line: string): ParsedExercise | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith('#')) {
    return null;
  }

  // Pattern: {count}{unit} {name} | {modifier}
  // Examples: "21x Thruster | 43kg", "400m Row", "1:00 Plank", "1x Deadlift | 1RM"
  
  let exercise_name = trimmed;
  let reps_min: number | undefined;
  let rx_weight_kg: number | undefined;
  let rx_distance_m: number | undefined;
  let time_seconds: number | undefined;
  let unit_label: string | undefined;

  // Check for modifier after |
  const pipeIndex = trimmed.indexOf('|');
  let basePart = trimmed;
  let modifier = '';
  
  if (pipeIndex > 0) {
    basePart = trimmed.slice(0, pipeIndex).trim();
    modifier = trimmed.slice(pipeIndex + 1).trim();
    
    // Parse modifier (e.g., "43kg", "1RM", "bodyweight")
    const weightMatch = modifier.match(/^(\d+(?:\.\d+)?)\s*kg$/i);
    if (weightMatch) {
      rx_weight_kg = parseFloat(weightMatch[1]);
    }
    unit_label = modifier;
  }

  // Parse reps: "21x Thruster"
  const repsMatch = basePart.match(/^(\d+)x\s+(.+)$/i);
  if (repsMatch) {
    reps_min = parseInt(repsMatch[1]);
    exercise_name = repsMatch[2].trim();
    return { exercise_name, reps_min, rx_weight_kg, unit_label };
  }

  // Parse distance: "400m Row"
  const distanceMatch = basePart.match(/^(\d+)m\s+(.+)$/i);
  if (distanceMatch) {
    rx_distance_m = parseInt(distanceMatch[1]);
    exercise_name = distanceMatch[2].trim();
    return { exercise_name, rx_distance_m, rx_weight_kg, unit_label };
  }

  // Parse time: "1:00 Plank"
  const timeMatch = basePart.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
  if (timeMatch) {
    time_seconds = parseTimeToSeconds(timeMatch[1]) || undefined;
    exercise_name = timeMatch[2].trim();
    return { exercise_name, time_seconds, rx_weight_kg, unit_label };
  }

  // Just exercise name
  exercise_name = basePart;
  return { exercise_name, rx_weight_kg, unit_label };
}

// Map workout type string to scoring mode
function mapTypeToScoringMode(type: string): RxScoringMode {
  const typeMap: Record<string, RxScoringMode> = {
    'for_time': 'for_time',
    'fortime': 'for_time',
    'amrap': 'amrap',
    'max_load': 'max_load',
    'maxload': 'max_load',
    'max': 'max_load',
    'rounds_reps': 'rounds_reps',
    'rounds': 'rounds_reps',
  };
  return typeMap[type.toLowerCase()] || 'for_time';
}

// Map workout type to workout_format
function mapTypeToFormat(type: string): string {
  const formatMap: Record<string, string> = {
    'for_time': 'for_time',
    'fortime': 'for_time',
    'amrap': 'amrap',
    'max_load': 'standard',
    'maxload': 'standard',
    'max': 'standard',
    'emom': 'emom',
    'tabata': 'tabata',
    'circuit': 'circuit',
  };
  return formatMap[type.toLowerCase()] || 'standard';
}

export function parseRxWorkoutText(
  text: string,
  exercisesList: Array<{ id: string; name: string; name_cs: string | null }>
): ParsedRxWorkout {
  const lines = text.split('\n');
  const errors: string[] = [];
  
  // Default template
  const template: ParsedRxWorkout['template'] = {
    name: '',
    workout_format: 'for_time',
    scoring_mode: 'for_time',
    is_rx_workout: true,
  };
  
  const exercises: ParsedExercise[] = [];
  const unmapped_exercises: string[] = [];

  // Parse headers (@name, @type, etc.)
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('@name:')) {
      template.name = trimmed.slice(6).trim();
    } else if (trimmed.startsWith('@type:')) {
      const type = trimmed.slice(6).trim();
      template.scoring_mode = mapTypeToScoringMode(type);
      template.workout_format = mapTypeToFormat(type);
    } else if (trimmed.startsWith('@timecap:')) {
      const timeStr = trimmed.slice(9).trim();
      template.time_cap_seconds = parseTimeToSeconds(timeStr) || undefined;
    } else if (trimmed.startsWith('@rounds:')) {
      template.rounds = parseInt(trimmed.slice(8).trim()) || undefined;
    } else if (trimmed.startsWith('@work:')) {
      const timeStr = trimmed.slice(6).trim();
      template.work_interval_seconds = parseTimeToSeconds(timeStr) || undefined;
    } else if (trimmed.startsWith('@rest:')) {
      const timeStr = trimmed.slice(6).trim();
      template.rest_interval_seconds = parseTimeToSeconds(timeStr) || undefined;
    } else if (trimmed.startsWith('@description:')) {
      template.description = trimmed.slice(13).trim();
    }
  }

  // Parse exercises
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith('#')) {
      continue;
    }
    
    const parsed = parseExerciseLine(trimmed);
    if (parsed) {
      // Try to map to existing exercise
      const normalizedName = parsed.exercise_name.toLowerCase();
      const match = exercisesList.find(ex => 
        ex.name.toLowerCase() === normalizedName ||
        (ex.name_cs && ex.name_cs.toLowerCase() === normalizedName)
      );
      
      if (match) {
        parsed.exercise_id = match.id;
      } else {
        unmapped_exercises.push(parsed.exercise_name);
      }
      
      exercises.push(parsed);
    }
  }

  // Validation
  if (!template.name) {
    errors.push('Chybí název workoutu (@name)');
  }
  if (exercises.length === 0) {
    errors.push('Žádné cviky nebyly nalezeny');
  }

  return {
    valid: errors.length === 0,
    errors,
    template,
    exercises,
    unmapped_exercises,
  };
}

// Hook for parsing with exercise lookup
export function useRxWorkoutParser(text: string) {
  const { data: exercisesList = [], isLoading } = useExercisesForMapping();
  
  const parsed = useMemo(() => {
    if (!text.trim() || isLoading) {
      return null;
    }
    return parseRxWorkoutText(text, exercisesList);
  }, [text, exercisesList, isLoading]);

  return {
    parsed,
    isLoading,
  };
}
