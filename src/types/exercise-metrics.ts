// Extended exercise entry metrics types

export interface ExtendedExerciseEntry {
  id: string;
  user_id: string;
  client_id: string;
  exercise_id: string | null;
  exercise_name: string;
  date: string;
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  is_bodyweight: boolean;
  time_seconds: number | null;
  tempo: string | null;
  notes: string | null;
  is_pr: boolean;
  distance_meters: number | null;
  
  // Extended cardio metrics
  avg_watts: number | null;
  max_watts: number | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  pace_sec_per_500m: number | null;
  pace_sec_per_km: number | null;
  cadence_spm: number | null;
  strokes: number | null;
  
  // Physiology
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  
  // Subjective
  rpe: number | null;
  leg_fatigue: boolean;
  
  // Metadata
  is_test: boolean;
  incline_percent: number | null;
  level: number | null;
  resistance: number | null;
  calories_kcal: number | null;
  
  // Flexible storage
  metrics_json: Record<string, unknown> | null;
  
  created_at: string;
  updated_at: string;
}

export interface ExtendedExerciseEntryWithClient extends ExtendedExerciseEntry {
  clients?: {
    id: string;
    name: string;
  } | null;
}

// Input type for creating an entry with extended metrics
export type CreateExtendedExerciseEntryInput = Omit<
  ExtendedExerciseEntry,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

// Metric definition from database
export interface ExerciseMetricDefinition {
  id: string;
  exercise_id: string | null;
  exercise_category: string | null;
  metric_key: string;
  label: string;
  label_en: string | null;
  unit: string | null;
  input_type: 'number' | 'time' | 'slider' | 'boolean' | 'text';
  is_optional: boolean;
  display_order: number;
  show_in_table: boolean;
  show_in_stats: boolean;
  stat_role: 'best_is_min' | 'best_is_max' | 'avg' | 'sum' | 'latest' | null;
  default_value: number | null;
  min_value: number | null;
  max_value: number | null;
  primary_metric: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}
