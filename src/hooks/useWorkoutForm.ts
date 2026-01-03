import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { UnifiedDiaryEntry } from '@/hooks/useUnifiedDiary';

export interface ExerciseInput {
  exercise_name: string;
  exercise_id?: string;
  sets: string;
  reps: string;
  weight_kg: string;
  duration_seconds: string;
  distance_km: string; // For running
  rpe: string;
  notes: string;
}

export const emptyExercise: ExerciseInput = {
  exercise_name: '',
  sets: '',
  reps: '',
  weight_kg: '',
  duration_seconds: '',
  distance_km: '',
  rpe: '',
  notes: '',
};

export interface WorkoutFormState {
  workoutDate: string;
  workoutType: string | null;
  durationMinutes: string;
  workoutRpe: number | null;
  energyBefore: number | null;
  energyAfter: number | null;
  workoutNotes: string;
  exercises: ExerciseInput[];
  // Running specific
  distanceKm: string;
  paceMinPerKm: string;
  // Mode flags
  isDetailedMode: boolean;
  editingPlannedWorkoutId: string | null;
  editingExistingLogId: string | null;
}

const initialState: WorkoutFormState = {
  workoutDate: format(new Date(), 'yyyy-MM-dd'),
  workoutType: null,
  durationMinutes: '',
  workoutRpe: null,
  energyBefore: null,
  energyAfter: null,
  workoutNotes: '',
  exercises: [{ ...emptyExercise }],
  distanceKm: '',
  paceMinPerKm: '',
  isDetailedMode: false,
  editingPlannedWorkoutId: null,
  editingExistingLogId: null,
};

export function useWorkoutForm() {
  const [formState, setFormState] = useState<WorkoutFormState>(initialState);

  const updateField = useCallback(<K extends keyof WorkoutFormState>(
    field: K, 
    value: WorkoutFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState({
      ...initialState,
      workoutDate: format(new Date(), 'yyyy-MM-dd'),
      exercises: [{ ...emptyExercise }],
    });
  }, []);

  const addExercise = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      exercises: [...prev.exercises, { ...emptyExercise }],
    }));
  }, []);

  const removeExercise = useCallback((index: number) => {
    setFormState(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    }));
  }, []);

  const updateExercise = useCallback((
    index: number, 
    field: keyof ExerciseInput, 
    value: string
  ) => {
    setFormState(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { ...ex, [field]: value } : ex
      ),
    }));
  }, []);

  const updateExerciseName = useCallback((
    index: number, 
    name: string, 
    exerciseId?: string
  ) => {
    setFormState(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { ...ex, exercise_name: name, exercise_id: exerciseId } : ex
      ),
    }));
  }, []);

  // Pre-fill form for editing existing workout
  const loadFromEntry = useCallback((entry: UnifiedDiaryEntry) => {
    setFormState({
      workoutDate: entry.date,
      workoutType: entry.workout_type || null,
      durationMinutes: entry.duration_minutes?.toString() || '',
      workoutRpe: null,
      energyBefore: entry.energy_before || null,
      energyAfter: entry.energy_after || null,
      workoutNotes: entry.notes || '',
      distanceKm: '',
      paceMinPerKm: '',
      isDetailedMode: true,
      editingPlannedWorkoutId: null,
      editingExistingLogId: entry.id,
      exercises: entry.exercises && entry.exercises.length > 0
        ? entry.exercises.map(ex => ({
            exercise_name: ex.exercise_name,
            exercise_id: undefined,
            sets: ex.sets?.toString() || '',
            reps: ex.reps?.toString() || '',
            weight_kg: ex.weight_kg?.toString() || '',
            duration_seconds: ex.duration_seconds ? (ex.duration_seconds / 60).toString() : '',
            distance_km: '',
            rpe: ex.rpe?.toString() || '',
            notes: ex.notes || '',
          }))
        : [{ ...emptyExercise }],
    });
  }, []);

  // Pre-fill form for planned workout completion
  const loadFromPlanned = useCallback((entry: UnifiedDiaryEntry) => {
    setFormState({
      workoutDate: entry.scheduled_for 
        ? format(parseISO(entry.scheduled_for), 'yyyy-MM-dd') 
        : format(new Date(), 'yyyy-MM-dd'),
      workoutType: entry.workout_type || null,
      durationMinutes: entry.duration_minutes?.toString() || '',
      workoutRpe: null,
      energyBefore: null,
      energyAfter: null,
      workoutNotes: entry.notes || '',
      distanceKm: '',
      paceMinPerKm: '',
      isDetailedMode: true,
      editingPlannedWorkoutId: entry.id,
      editingExistingLogId: null,
      exercises: entry.exercises && entry.exercises.length > 0
        ? entry.exercises.map(ex => ({
            exercise_name: ex.exercise_name,
            exercise_id: undefined,
            sets: ex.sets?.toString() || '',
            reps: ex.reps?.toString() || '',
            weight_kg: ex.weight_kg?.toString() || '',
            duration_seconds: ex.duration_seconds ? (ex.duration_seconds / 60).toString() : '',
            distance_km: '',
            rpe: ex.rpe?.toString() || '',
            notes: ex.notes || '',
          }))
        : [{ ...emptyExercise }],
    });
  }, []);

  // Load from entry for "repeat workout" feature
  const loadForRepeat = useCallback((entry: UnifiedDiaryEntry) => {
    setFormState({
      workoutDate: format(new Date(), 'yyyy-MM-dd'), // Today's date
      workoutType: entry.workout_type || null,
      durationMinutes: entry.duration_minutes?.toString() || '',
      workoutRpe: null,
      energyBefore: null,
      energyAfter: null,
      workoutNotes: '',
      distanceKm: '',
      paceMinPerKm: '',
      isDetailedMode: true,
      editingPlannedWorkoutId: null,
      editingExistingLogId: null, // New workout, not editing
      exercises: entry.exercises && entry.exercises.length > 0
        ? entry.exercises.map(ex => ({
            exercise_name: ex.exercise_name,
            exercise_id: undefined,
            sets: ex.sets?.toString() || '',
            reps: ex.reps?.toString() || '',
            weight_kg: ex.weight_kg?.toString() || '',
            duration_seconds: ex.duration_seconds ? (ex.duration_seconds / 60).toString() : '',
            distance_km: '',
            rpe: '',
            notes: '',
          }))
        : [{ ...emptyExercise }],
    });
  }, []);

  // Get validated exercises for saving
  const getValidExercises = useCallback(() => {
    return formState.exercises
      .filter(ex => ex.exercise_name.trim())
      .map((ex, idx) => ({
        exercise_name: ex.exercise_name.trim(),
        exercise_id: ex.exercise_id || null,
        sets: ex.sets ? parseInt(ex.sets) : null,
        reps: ex.reps ? parseInt(ex.reps) : null,
        weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : null,
        duration_seconds: ex.duration_seconds ? parseInt(ex.duration_seconds) * 60 : null,
        distance_meters: ex.distance_km ? parseFloat(ex.distance_km) * 1000 : null,
        rpe: ex.rpe ? parseInt(ex.rpe) : null,
        notes: ex.notes || null,
        sort_order: idx,
      }));
  }, [formState.exercises]);

  // Validation
  const canSave = useCallback((isSaving: boolean) => {
    if (isSaving) return false;
    const { isDetailedMode, exercises, workoutType, editingExistingLogId } = formState;
    if (isDetailedMode && !exercises.some(ex => ex.exercise_name.trim())) return false;
    if (!isDetailedMode && !editingExistingLogId && !workoutType) return false;
    return true;
  }, [formState]);

  return {
    formState,
    updateField,
    resetForm,
    addExercise,
    removeExercise,
    updateExercise,
    updateExerciseName,
    loadFromEntry,
    loadFromPlanned,
    loadForRepeat,
    getValidExercises,
    canSave,
  };
}
