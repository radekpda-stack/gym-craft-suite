// Types for training plan generation

export type PlanGoal = 'strength' | 'hypertrophy' | 'conditioning' | 'fat_loss' | 'ocr' | 'rehab_general' | 'general_fitness';
export type ClientLevel = 'beginner' | 'intermediate' | 'advanced';
export type TrainingSplit = 'full_body' | 'upper_lower' | 'push_pull_legs';
export type BlockType = 'prep' | 'primary' | 'secondary' | 'accessory' | 'core' | 'conditioning' | 'cooldown';

export const EQUIPMENT_OPTIONS = [
  { value: 'barbell', label: 'Osa' },
  { value: 'dumbbell', label: 'Jednoručky' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'cable', label: 'Kladky' },
  { value: 'machine', label: 'Stroje' },
  { value: 'bands', label: 'Gumy' },
  { value: 'bodyweight', label: 'Vlastní váha' },
  { value: 'bench', label: 'Lavička' },
  { value: 'pullup_bar', label: 'Hrazda' },
  { value: 'rower', label: 'Veslovací trenažér' },
  { value: 'ski_erg', label: 'Ski erg' },
  { value: 'treadmill', label: 'Běžecký pás' },
  { value: 'treadmill_sled_mode', label: 'Běžecký pás (sled)' },
] as const;

export const GOAL_OPTIONS_EXTENDED = [
  { value: 'strength', label: 'Síla' },
  { value: 'hypertrophy', label: 'Hypertrofie' },
  { value: 'conditioning', label: 'Kondice' },
  { value: 'fat_loss', label: 'Redukce' },
  { value: 'ocr', label: 'OCR / Spartan' },
  { value: 'rehab_general', label: 'Rehabilitace' },
  { value: 'general_fitness', label: 'Obecná kondice' },
] as const;

export const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Začátečník' },
  { value: 'intermediate', label: 'Pokročilý' },
  { value: 'advanced', label: 'Expert' },
] as const;

export const SPLIT_OPTIONS = [
  { value: 'full_body', label: 'Full body' },
  { value: 'upper_lower', label: 'Upper/Lower' },
  { value: 'push_pull_legs', label: 'Push/Pull/Legs' },
] as const;

export const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 75, label: '75 min' },
  { value: 90, label: '90 min' },
] as const;

export const FOCUS_AREAS = [
  { value: 'glutes', label: 'Hýždě' },
  { value: 'core', label: 'Core' },
  { value: 'upper_back', label: 'Horní záda' },
  { value: 'grip', label: 'Úchop' },
  { value: 'shoulders', label: 'Ramena' },
  { value: 'chest', label: 'Hrudník' },
  { value: 'legs', label: 'Nohy' },
  { value: 'arms', label: 'Paže' },
] as const;

export const PAIN_AREAS = [
  { value: 'shoulder', label: 'Rameno' },
  { value: 'lower_back', label: 'Bedra' },
  { value: 'knee', label: 'Koleno' },
  { value: 'hip', label: 'Kyčel' },
] as const;

export interface GenerationParams {
  goal: PlanGoal;
  sessionsPerWeek: number;
  weeksCount: number;
  level: ClientLevel;
  equipment: string[];
  sessionDuration: number;
  split?: TrainingSplit;
  focusAreas?: string[];
  painAreas?: string[];
  painNotes?: string;
  conditioningFrequency?: number;
}

export interface GeneratedExercise {
  exercise_name: string;
  block_type: BlockType;
  sets: number;
  reps_min: number;
  reps_max: number;
  rpe?: number;
  rir?: number;
  rest_seconds: number;
  tempo?: string;
  notes?: string;
  sort_order: number;
}

export interface GeneratedWorkout {
  name: string;
  focus: string;
  estimated_duration: number;
  exercises: GeneratedExercise[];
}

export interface GeneratedDay {
  day_number: number;
  focus: string;
  workouts: GeneratedWorkout[];
}

export interface GeneratedWeek {
  week_number: number;
  is_deload: boolean;
  focus_note?: string;
  days: GeneratedDay[];
}

export interface GeneratedPlan {
  weeks: GeneratedWeek[];
}
