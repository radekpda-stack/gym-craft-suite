import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ParsedRxWorkout, RxScoringMode } from './useRxWorkoutParser';

export interface RxWorkout {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  estimated_duration: number | null;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  workout_format: string;
  time_cap_seconds: number | null;
  rounds: number | null;
  work_interval_seconds: number | null;
  rest_interval_seconds: number | null;
  is_rx_workout: boolean;
  scoring_mode: RxScoringMode | null;
  exercises?: RxWorkoutExercise[];
}

export interface RxWorkoutExercise {
  id: string;
  template_id: string;
  exercise_id: string | null;
  exercise_name: string;
  block_type: string;
  sets: number | null;
  reps_min: number | null;
  reps_max: number | null;
  time_seconds: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  rpe: number | null;
  rir: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  rx_weight_kg: number | null;
  rx_distance_m: number | null;
  unit_label: string | null;
}

// Fetch only RX workouts
export function useRxWorkouts(scoringMode?: RxScoringMode) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['rx-workouts', scoringMode],
    queryFn: async (): Promise<RxWorkout[]> => {
      let query = supabase
        .from('training_templates')
        .select(`
          *,
          exercises:training_template_exercises(*)
        `)
        .eq('is_rx_workout', true)
        .order('name', { ascending: true });
      
      if (scoringMode) {
        query = query.eq('scoring_mode', scoringMode);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RxWorkout[];
    },
    enabled: !!user,
  });
}

// Create RX workout from parsed text
export function useCreateRxWorkout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (parsed: ParsedRxWorkout) => {
      if (!user) throw new Error('Nepřihlášen');
      
      const { template, exercises } = parsed;
      
      // Create template
      const { data: createdTemplate, error: templateError } = await supabase
        .from('training_templates')
        .insert({
          user_id: user.id,
          name: template.name,
          description: template.description || null,
          category: 'RX Benchmark',
          is_public: false,
          tags: ['rx', template.scoring_mode],
          workout_format: template.workout_format,
          time_cap_seconds: template.time_cap_seconds || null,
          rounds: template.rounds || null,
          work_interval_seconds: template.work_interval_seconds || null,
          rest_interval_seconds: template.rest_interval_seconds || null,
          is_rx_workout: true,
          scoring_mode: template.scoring_mode,
        })
        .select()
        .single();
      
      if (templateError) throw templateError;
      
      // Add exercises
      if (exercises.length > 0) {
        const exerciseRows = exercises.map((ex, idx) => ({
          template_id: createdTemplate.id,
          exercise_id: ex.exercise_id || null,
          exercise_name: ex.exercise_name,
          block_type: 'primary',
          reps_min: ex.reps_min || null,
          time_seconds: ex.time_seconds || null,
          rx_weight_kg: ex.rx_weight_kg || null,
          rx_distance_m: ex.rx_distance_m || null,
          unit_label: ex.unit_label || null,
          sort_order: idx,
        }));
        
        const { error: exError } = await supabase
          .from('training_template_exercises')
          .insert(exerciseRows);
        
        if (exError) throw exError;
      }
      
      return createdTemplate as RxWorkout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rx-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
      toast.success('RX Workout vytvořen');
    },
    onError: (error) => {
      console.error('Create RX workout error:', error);
      toast.error('Nepodařilo se vytvořit RX workout');
    },
  });
}

// Delete RX workout
export function useDeleteRxWorkout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await supabase
        .from('training_templates')
        .delete()
        .eq('id', workoutId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rx-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
      toast.success('RX Workout smazán');
    },
    onError: (error) => {
      console.error('Delete RX workout error:', error);
      toast.error('Nepodařilo se smazat RX workout');
    },
  });
}

// Convert RX workout to challenge
export function useRxWorkoutToChallenge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      workoutId, 
      startAt, 
      endAt 
    }: { 
      workoutId: string; 
      startAt: string; 
      endAt: string;
    }) => {
      if (!user) throw new Error('Nepřihlášen');
      
      // Fetch RX workout
      const { data: workout, error: fetchError } = await supabase
        .from('training_templates')
        .select(`
          *,
          exercises:training_template_exercises(*)
        `)
        .eq('id', workoutId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Map scoring_mode to challenge scoring_type
      const scoringTypeMap: Record<string, string> = {
        'for_time': 'time_lower_better',
        'amrap': 'value_higher_better',
        'max_load': 'value_higher_better',
        'rounds_reps': 'value_higher_better',
      };
      
      const scoringType = scoringTypeMap[workout.scoring_mode || 'for_time'] || 'time_lower_better';
      
      // Generate instructions from exercises
      const instructions = workout.exercises
        ?.sort((a: RxWorkoutExercise, b: RxWorkoutExercise) => a.sort_order - b.sort_order)
        .map((ex: RxWorkoutExercise) => {
          let line = '';
          if (ex.reps_min) line += `${ex.reps_min}x `;
          if (ex.rx_distance_m) line += `${ex.rx_distance_m}m `;
          if (ex.time_seconds) line += `${Math.floor(ex.time_seconds / 60)}:${(ex.time_seconds % 60).toString().padStart(2, '0')} `;
          line += ex.exercise_name;
          if (ex.rx_weight_kg) line += ` (${ex.rx_weight_kg}kg)`;
          if (ex.unit_label && !ex.rx_weight_kg) line += ` (${ex.unit_label})`;
          return line;
        })
        .join('\n') || '';
      
      // Create challenge
      const { data: challenge, error: createError } = await supabase
        .from('challenges')
        .insert({
          title: workout.name,
          description: workout.description || `RX Benchmark: ${workout.name}`,
          instructions,
          start_at: startAt,
          end_at: endAt,
          status: 'active',
          scoring_type: scoringType,
          primary_metric: workout.scoring_mode === 'for_time' ? 'time' : 
                         workout.scoring_mode === 'max_load' ? 'weight' : 'reps',
          unit_label: workout.scoring_mode === 'max_load' ? 'kg' : undefined,
          allow_multiple_attempts: true,
          published_to_portal_clients: true,
          created_by_user_id: user.id,
          training_template_id: workoutId,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      return challenge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success('Výzva vytvořena z RX workoutu');
    },
    onError: (error) => {
      console.error('Create challenge from RX error:', error);
      toast.error('Nepodařilo se vytvořit výzvu');
    },
  });
}
