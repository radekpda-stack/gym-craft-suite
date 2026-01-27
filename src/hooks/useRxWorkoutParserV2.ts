import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { normalizeText } from './useExercises';

export type RxScoringMode = 'for_time' | 'amrap' | 'max_load' | 'rounds_reps';

export interface ParsedExerciseV2 {
  raw_name: string;
  exercise_name: string;
  exercise_id?: string;
  reps_min?: number;
  rx_weight_kg?: number;
  rx_distance_m?: number;
  time_seconds?: number;
  incline_percent?: number;
  speed_setting?: string;
  damper_resistance?: number;
  load_format?: string;
  round_marker?: string;
  is_mapped: boolean;
  suggested_matches?: Array<{ id: string; name: string; similarity: number }>;
}

export interface ParsedRxWorkoutV2 {
  valid: boolean;
  errors: string[];
  warnings: string[];
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
  exercises: ParsedExerciseV2[];
  unmapped_exercises: string[];
  all_mapped: boolean;
}

// Fetch all exercises for mapping including aliases
export function useExercisesForMappingV2() {
  return useQuery({
    queryKey: ['exercises-for-mapping-v2'],
    queryFn: async () => {
      const [exercisesRes, aliasesRes] = await Promise.all([
        supabase
          .from('exercises')
          .select('id, name, name_cs, search_name, category')
          .eq('is_archived', false),
        supabase
          .from('exercise_aliases')
          .select('exercise_id, alias_name, alias_normalized')
      ]);
      
      if (exercisesRes.error) throw exercisesRes.error;
      
      return {
        exercises: exercisesRes.data || [],
        aliases: aliasesRes.data || [],
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Normalize exercise name from format like DUMBBELL_THRUSTER to "Dumbbell Thruster"
function normalizeExerciseName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

// Calculate similarity between two strings (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  
  return (longer.length - costs[longer.length]) / longer.length;
}

// Parse time string (MM:SS or M:SS) to seconds
function parseTimeToSeconds(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

// Parse LOAD format: "2x8 kg" -> { weight: 8, format: "2x8" }
function parseLoad(loadStr: string): { weight: number; format: string } | null {
  // Format: "2x8 kg" or "24 kg" or "8kg"
  const match = loadStr.match(/^(\d+x)?(\d+(?:\.\d+)?)\s*kg$/i);
  if (!match) return null;
  
  const prefix = match[1] || '';
  const weight = parseFloat(match[2]);
  const format = prefix ? `${prefix}${weight}` : `${weight}`;
  
  return { weight, format };
}

// Parse a single exercise block
function parseExerciseBlock(lines: string[]): Partial<ParsedExerciseV2> | null {
  const result: Partial<ParsedExerciseV2> = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = trimmed.slice(0, colonIndex).trim().toUpperCase();
    const value = trimmed.slice(colonIndex + 1).trim();
    
    switch (key) {
      case 'EXERCISE':
        result.raw_name = value;
        result.exercise_name = normalizeExerciseName(value);
        break;
      case 'DISTANCE':
        const distMatch = value.match(/^(\d+)\s*m$/i);
        if (distMatch) result.rx_distance_m = parseInt(distMatch[1]);
        break;
      case 'REPS':
        result.reps_min = parseInt(value) || undefined;
        break;
      case 'LOAD':
        const loadParsed = parseLoad(value);
        if (loadParsed) {
          result.rx_weight_kg = loadParsed.weight;
          result.load_format = loadParsed.format;
        }
        break;
      case 'INCLINE':
        const inclineMatch = value.match(/^(\d+)\s*%?$/);
        if (inclineMatch) result.incline_percent = parseInt(inclineMatch[1]);
        break;
      case 'SPEED':
        result.speed_setting = value;
        break;
      case 'DAMPER':
      case 'RESISTANCE':
        result.damper_resistance = parseInt(value) || undefined;
        break;
      case 'TIME':
        result.time_seconds = parseTimeToSeconds(value) || undefined;
        break;
    }
  }
  
  return result.exercise_name ? result : null;
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

// Find best matching exercise from database
function findExerciseMatch(
  exerciseName: string,
  rawName: string,
  exercises: Array<{ id: string; name: string; name_cs: string | null; search_name: string | null; category: string }>,
  aliases: Array<{ exercise_id: string; alias_name: string; alias_normalized: string }>
): { exercise_id?: string; suggested_matches: Array<{ id: string; name: string; similarity: number }> } {
  const normalizedInput = normalizeText(exerciseName);
  const normalizedRaw = normalizeText(rawName);
  
  // First check exact matches in aliases
  const aliasMatch = aliases.find(a => 
    a.alias_normalized === normalizedInput || 
    a.alias_normalized === normalizedRaw
  );
  if (aliasMatch) {
    const ex = exercises.find(e => e.id === aliasMatch.exercise_id);
    if (ex) {
      return { 
        exercise_id: ex.id, 
        suggested_matches: [{ id: ex.id, name: ex.name_cs || ex.name, similarity: 1 }] 
      };
    }
  }
  
  // Check exact matches in exercises
  const exactMatch = exercises.find(ex => {
    const nameNorm = normalizeText(ex.name);
    const nameCsNorm = ex.name_cs ? normalizeText(ex.name_cs) : '';
    const searchNorm = ex.search_name || '';
    
    return nameNorm === normalizedInput || 
           nameCsNorm === normalizedInput ||
           searchNorm === normalizedInput ||
           nameNorm === normalizedRaw ||
           nameCsNorm === normalizedRaw;
  });
  
  if (exactMatch) {
    return { 
      exercise_id: exactMatch.id, 
      suggested_matches: [{ id: exactMatch.id, name: exactMatch.name_cs || exactMatch.name, similarity: 1 }] 
    };
  }
  
  // Find similar matches
  const matches = exercises
    .map(ex => ({
      id: ex.id,
      name: ex.name_cs || ex.name,
      similarity: Math.max(
        calculateSimilarity(exerciseName, ex.name),
        calculateSimilarity(exerciseName, ex.name_cs || ''),
        calculateSimilarity(rawName, ex.name),
        calculateSimilarity(rawName, ex.name_cs || '')
      )
    }))
    .filter(m => m.similarity > 0.4)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
  
  // Auto-map if similarity is very high
  if (matches.length > 0 && matches[0].similarity >= 0.85) {
    return { exercise_id: matches[0].id, suggested_matches: matches };
  }
  
  return { suggested_matches: matches };
}

export function parseRxWorkoutTextV2(
  text: string,
  exercisesList: Array<{ id: string; name: string; name_cs: string | null; search_name: string | null; category: string }>,
  aliases: Array<{ exercise_id: string; alias_name: string; alias_normalized: string }>
): ParsedRxWorkoutV2 {
  const lines = text.split('\n');
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Default template
  const template: ParsedRxWorkoutV2['template'] = {
    name: '',
    workout_format: 'for_time',
    scoring_mode: 'for_time',
    is_rx_workout: true,
  };
  
  const exercises: ParsedExerciseV2[] = [];
  const unmapped_exercises: string[] = [];
  let currentExerciseLines: string[] = [];
  let lastRoundMarker: string | null = null;
  
  // Check if it's V2 format (has WORKOUT: or EXERCISE:)
  const isV2Format = lines.some(l => 
    l.trim().toUpperCase().startsWith('WORKOUT:') || 
    l.trim().toUpperCase().startsWith('EXERCISE:')
  );
  
  if (!isV2Format) {
    errors.push('Formát není rozpoznán. Použijte WORKOUT:/EXERCISE: formát.');
    return {
      valid: false,
      errors,
      warnings,
      template,
      exercises: [],
      unmapped_exercises: [],
      all_mapped: false,
    };
  }
  
  // Helper to process current exercise block
  const processCurrentExerciseBlock = () => {
    if (currentExerciseLines.length === 0) return;
    
    const parsed = parseExerciseBlock(currentExerciseLines);
    if (parsed && parsed.exercise_name) {
      const match = findExerciseMatch(
        parsed.exercise_name, 
        parsed.raw_name || parsed.exercise_name,
        exercisesList, 
        aliases
      );
      
      exercises.push({
        raw_name: parsed.raw_name || parsed.exercise_name,
        exercise_name: parsed.exercise_name,
        exercise_id: match.exercise_id,
        reps_min: parsed.reps_min,
        rx_weight_kg: parsed.rx_weight_kg,
        rx_distance_m: parsed.rx_distance_m,
        time_seconds: parsed.time_seconds,
        incline_percent: parsed.incline_percent,
        speed_setting: parsed.speed_setting,
        damper_resistance: parsed.damper_resistance,
        load_format: parsed.load_format,
        round_marker: lastRoundMarker || undefined,
        is_mapped: !!match.exercise_id,
        suggested_matches: match.suggested_matches,
      });
      
      if (!match.exercise_id) {
        unmapped_exercises.push(parsed.exercise_name);
      }
      
      lastRoundMarker = null;
    }
    currentExerciseLines = [];
  };
  
  // Parse header and exercises
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      // Empty line might end an exercise block
      processCurrentExerciseBlock();
      continue;
    }
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = trimmed.slice(0, colonIndex).trim().toUpperCase();
    const value = trimmed.slice(colonIndex + 1).trim();
    
    // Header parsing
    if (key === 'WORKOUT') {
      template.name = value;
    } else if (key === 'TYPE') {
      template.scoring_mode = mapTypeToScoringMode(value);
      template.workout_format = mapTypeToFormat(value);
    } else if (key === 'ROUNDS') {
      template.rounds = parseInt(value) || undefined;
    } else if (key === 'TIMECAP' || key === 'TIME_CAP') {
      template.time_cap_seconds = parseTimeToSeconds(value) || undefined;
    } else if (key === 'SCORE') {
      // Already handled by TYPE
      if (value.toUpperCase() === 'TIME') {
        template.scoring_mode = 'for_time';
      }
    } else if (key === 'ROUND_COMPLETE') {
      lastRoundMarker = value;
    } else if (key === 'EXERCISE') {
      // Start new exercise block
      processCurrentExerciseBlock();
      currentExerciseLines = [trimmed];
    } else {
      // Add to current exercise block
      currentExerciseLines.push(trimmed);
    }
  }
  
  // Process last exercise block
  processCurrentExerciseBlock();
  
  // Validation
  if (!template.name) {
    errors.push('Chybí název workoutu (WORKOUT:)');
  }
  if (exercises.length === 0) {
    errors.push('Žádné cviky nebyly nalezeny');
  }
  
  // Warnings
  if (unmapped_exercises.length > 0) {
    warnings.push(`${unmapped_exercises.length} cviků není namapováno a bude potřeba vytvořit nebo přiřadit`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    template,
    exercises,
    unmapped_exercises,
    all_mapped: unmapped_exercises.length === 0,
  };
}

// Hook for parsing with exercise lookup - V2
export function useRxWorkoutParserV2(text: string) {
  const { data, isLoading } = useExercisesForMappingV2();
  
  const parsed = useMemo(() => {
    if (!text.trim() || isLoading || !data) {
      return null;
    }
    return parseRxWorkoutTextV2(text, data.exercises, data.aliases);
  }, [text, data, isLoading]);
  
  return {
    parsed,
    isLoading,
    exercisesList: data?.exercises || [],
  };
}
