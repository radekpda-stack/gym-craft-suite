import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TrainingPlan {
  id: string;
  client_id: string;
  name: string;
  primary_goal: string;
  secondary_goal: string | null;
  period_start: string;
  period_end: string | null;
  phase: string;
  days_per_week: number;
  equipment: string[];
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface PlanWeek {
  id: string;
  training_plan_id: string;
  week_number: number;
  focus_note: string | null;
  deload_flag: boolean;
  created_at: string;
  user_id: string;
}

export interface PlanDay {
  id: string;
  plan_week_id: string;
  day_number: number;
  intended_focus: string | null;
  optional_flag: boolean;
  created_at: string;
  user_id: string;
}

export interface PlanWorkout {
  id: string;
  plan_day_id: string;
  workout_name: string;
  workout_type: string;
  estimated_duration: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
  user_id: string;
}

export interface PlanExercise {
  id: string;
  plan_workout_id: string;
  exercise_id: string | null;
  exercise_name: string;
  target_sets: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_rpe: number | null;
  target_rir: number | null;
  tempo: string | null;
  rest_seconds: number;
  progression_type: string;
  alternative_exercise_id: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  user_id: string;
}

export const GOAL_OPTIONS = [
  { value: 'strength', label: 'Síla' },
  { value: 'hypertrophy', label: 'Hypertrofie' },
  { value: 'endurance', label: 'Vytrvalost' },
  { value: 'ocr', label: 'OCR / Funkční' },
  { value: 'rehab', label: 'Rehabilitace' },
  { value: 'mixed', label: 'Kombinovaný' },
];

export const PHASE_OPTIONS = [
  { value: 'base', label: 'Základní' },
  { value: 'build', label: 'Budovací' },
  { value: 'peak', label: 'Vrcholová' },
  { value: 'deload', label: 'Deload' },
  { value: 'rehab', label: 'Rehabilitační' },
];

export const FOCUS_OPTIONS = [
  { value: 'upper', label: 'Horní tělo' },
  { value: 'lower', label: 'Dolní tělo' },
  { value: 'full', label: 'Celé tělo' },
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'run', label: 'Běh' },
  { value: 'skill', label: 'Dovednosti' },
  { value: 'recovery', label: 'Regenerace' },
];

export const WORKOUT_TYPE_OPTIONS = [
  { value: 'strength', label: 'Silový' },
  { value: 'run', label: 'Běžecký' },
  { value: 'conditioning', label: 'Kondiční' },
  { value: 'hybrid', label: 'Hybridní' },
];

export function useTrainingPlans(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['training-plans', clientId],
    queryFn: async () => {
      let query = supabase
        .from('training_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrainingPlan[];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (plan: Omit<TrainingPlan, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('training_plans')
        .insert({ ...plan, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plans'] });
      toast({ title: 'Plán vytvořen', description: 'Tréninkový plán byl úspěšně vytvořen.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se vytvořit plán.', variant: 'destructive' });
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plans'] });
      toast({ title: 'Plán aktualizován', description: 'Změny byly uloženy.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se uložit změny.', variant: 'destructive' });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('training_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plans'] });
      toast({ title: 'Plán smazán', description: 'Tréninkový plán byl odstraněn.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se smazat plán.', variant: 'destructive' });
    },
  });

  return {
    plans,
    isLoading,
    error,
    createPlan,
    updatePlan,
    deletePlan,
  };
}

export function usePlanDetail(planId?: string) {
  return useQuery({
    queryKey: ['training-plan-detail', planId],
    queryFn: async () => {
      if (!planId) return null;

      const { data: plan, error: planError } = await supabase
        .from('training_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      const { data: weeks, error: weeksError } = await supabase
        .from('plan_weeks')
        .select('*')
        .eq('training_plan_id', planId)
        .order('week_number', { ascending: true });

      if (weeksError) throw weeksError;

      const weekIds = weeks?.map((w) => w.id) || [];
      
      let days: PlanDay[] = [];
      if (weekIds.length > 0) {
        const { data: daysData, error: daysError } = await supabase
          .from('plan_days')
          .select('*')
          .in('plan_week_id', weekIds)
          .order('day_number', { ascending: true });

        if (daysError) throw daysError;
        days = daysData || [];
      }

      const dayIds = days.map((d) => d.id);
      
      let workouts: PlanWorkout[] = [];
      if (dayIds.length > 0) {
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('plan_workouts')
          .select('*')
          .in('plan_day_id', dayIds)
          .order('sort_order', { ascending: true });

        if (workoutsError) throw workoutsError;
        workouts = workoutsData || [];
      }

      const workoutIds = workouts.map((w) => w.id);
      
      let exercises: PlanExercise[] = [];
      if (workoutIds.length > 0) {
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('plan_exercises')
          .select('*')
          .in('plan_workout_id', workoutIds)
          .order('sort_order', { ascending: true });

        if (exercisesError) throw exercisesError;
        exercises = exercisesData || [];
      }

      return {
        plan: plan as TrainingPlan,
        weeks: weeks as PlanWeek[],
        days,
        workouts,
        exercises,
      };
    },
    enabled: !!planId,
  });
}

export function usePlanWeeks(planId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createWeek = useMutation({
    mutationFn: async (week: Omit<PlanWeek, 'id' | 'created_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('plan_weeks')
        .insert({ ...week, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-detail', planId] });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat týden.', variant: 'destructive' });
    },
  });

  const deleteWeek = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plan_weeks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-detail', planId] });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se smazat týden.', variant: 'destructive' });
    },
  });

  return { createWeek, deleteWeek };
}

export function usePlanDays(planId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDay = useMutation({
    mutationFn: async (day: Omit<PlanDay, 'id' | 'created_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('plan_days')
        .insert({ ...day, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-detail', planId] });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat den.', variant: 'destructive' });
    },
  });

  return { createDay };
}

export function usePlanWorkouts(planId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createWorkout = useMutation({
    mutationFn: async (workout: Omit<PlanWorkout, 'id' | 'created_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('plan_workouts')
        .insert({ ...workout, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-detail', planId] });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat trénink.', variant: 'destructive' });
    },
  });

  const updateWorkout = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanWorkout> & { id: string }) => {
      const { data, error } = await supabase
        .from('plan_workouts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-detail', planId] });
    },
  });

  const deleteWorkout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plan_workouts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-detail', planId] });
    },
  });

  return { createWorkout, updateWorkout, deleteWorkout };
}

export function usePlanExercises(planId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createExercise = useMutation({
    mutationFn: async (exercise: Omit<PlanExercise, 'id' | 'created_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('plan_exercises')
        .insert({ ...exercise, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-detail', planId] });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat cvik.', variant: 'destructive' });
    },
  });

  const updateExercise = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanExercise> & { id: string }) => {
      const { data, error } = await supabase
        .from('plan_exercises')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-detail', planId] });
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plan_exercises').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-detail', planId] });
    },
  });

  return { createExercise, updateExercise, deleteExercise };
}
