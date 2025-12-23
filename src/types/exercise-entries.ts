// Exercise type discriminator
export type ExerciseType = 'strength' | 'cardio' | 'mobility' | 'skill';

// Base interface for all exercise entries
export interface BaseExerciseEntry {
  id: string;
  user_id: string;
  client_id: string;
  exercise_id: string | null;
  exercise_name: string;
  date: string;
  training_session_id?: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Strength entry (existing exercise_entries)
export interface StrengthEntry extends BaseExerciseEntry {
  entry_type: 'strength';
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  is_bodyweight: boolean;
  time_seconds: number | null;
  tempo: string | null;
  is_pr: boolean;
  training_phase?: string | null;
  training_type?: string | null;
}

// Cardio entry
export interface CardioEntry extends BaseExerciseEntry {
  entry_type: 'cardio';
  duration_seconds: number;
  distance_meters: number | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_watts: number | null;
  max_watts: number | null;
  rpe: number | null;
  leg_fatigue: boolean;
  is_test: boolean;
  is_pr: boolean;
}

// Mobility entry
export interface MobilityEntry extends BaseExerciseEntry {
  entry_type: 'mobility';
  duration_seconds: number | null;
  sets: number;
  hold_seconds: number | null;
  rpe: number | null;
  quality_rating: 'poor' | 'fair' | 'good' | 'excellent' | null;
  range_of_motion: 'limited' | 'normal' | 'full' | null;
  side: 'left' | 'right' | 'both' | 'none' | null;
}

// Skill entry
export interface SkillEntry extends BaseExerciseEntry {
  entry_type: 'skill';
  duration_seconds: number | null;
  attempts: number | null;
  successful: number | null;
  rpe: number | null;
  technique_rating: 'learning' | 'developing' | 'competent' | 'proficient' | 'mastered' | null;
  is_breakthrough: boolean;
}

// Union type for all entries
export type AnyExerciseEntry = StrengthEntry | CardioEntry | MobilityEntry | SkillEntry;

// Input types for creating entries
export type CreateCardioEntryInput = Omit<CardioEntry, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'entry_type'>;
export type CreateMobilityEntryInput = Omit<MobilityEntry, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'entry_type'>;
export type CreateSkillEntryInput = Omit<SkillEntry, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'entry_type'>;

// Exercise with type information
export interface ExerciseWithType {
  id: string;
  name: string;
  name_cs: string | null;
  name_en: string | null;
  category: string;
  exercise_type: ExerciseType;
  is_time_based: boolean;
  default_unit: string;
  is_bodyweight: boolean;
  is_unilateral: boolean;
}

// Cardio performance metrics for PR detection
export interface CardioPerformance {
  time_per_distance?: number; // seconds per meter
  distance_per_time?: number; // meters per second
  avg_watts?: number;
  max_watts?: number;
}
