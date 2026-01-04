import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type WorkoutFormat = 'standard' | 'amrap' | 'emom' | 'for_time' | 'tabata' | 'circuit';

export interface TrainingTemplate {
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
  workout_format: WorkoutFormat;
  time_cap_seconds: number | null;
  rounds: number | null;
  work_interval_seconds: number | null;
  rest_interval_seconds: number | null;
  exercises?: TrainingTemplateExercise[];
}

export interface TrainingTemplateExercise {
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
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category?: string;
  estimated_duration?: number;
  is_public?: boolean;
  tags?: string[];
  workout_format?: WorkoutFormat;
  time_cap_seconds?: number;
  rounds?: number;
  work_interval_seconds?: number;
  rest_interval_seconds?: number;
  exercises?: Omit<TrainingTemplateExercise, 'id' | 'template_id' | 'created_at'>[];
}

export function useTrainingTemplates(category?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['training-templates', category],
    queryFn: async (): Promise<TrainingTemplate[]> => {
      let query = supabase
        .from('training_templates')
        .select(`
          *,
          exercises:training_template_exercises(*)
        `)
        .order('updated_at', { ascending: false });
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TrainingTemplate[];
    },
    enabled: !!user,
  });
}

export function useTrainingTemplate(templateId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['training-template', templateId],
    queryFn: async (): Promise<TrainingTemplate | null> => {
      if (!templateId) return null;
      
      const { data, error } = await supabase
        .from('training_templates')
        .select(`
          *,
          exercises:training_template_exercises(*)
        `)
        .eq('id', templateId)
        .single();
      
      if (error) throw error;
      
      // Sort exercises by sort_order
      if (data?.exercises) {
        data.exercises.sort((a: TrainingTemplateExercise, b: TrainingTemplateExercise) => 
          (a.sort_order || 0) - (b.sort_order || 0)
        );
      }
      
      return data as TrainingTemplate;
    },
    enabled: !!user && !!templateId,
  });
}

export function useCreateTrainingTemplate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!user) throw new Error('Nepřihlášen');
      
      const { exercises, ...templateData } = input;
      
      // Create template
      const { data: template, error: templateError } = await supabase
        .from('training_templates')
        .insert({
          user_id: user.id,
          name: templateData.name,
          description: templateData.description || null,
          category: templateData.category || null,
          estimated_duration: templateData.estimated_duration || null,
          is_public: templateData.is_public || false,
          tags: templateData.tags || [],
          workout_format: templateData.workout_format || 'standard',
          time_cap_seconds: templateData.time_cap_seconds || null,
          rounds: templateData.rounds || null,
          work_interval_seconds: templateData.work_interval_seconds || null,
          rest_interval_seconds: templateData.rest_interval_seconds || null,
        })
        .select()
        .single();
      
      if (templateError) throw templateError;
      
      // Add exercises if provided
      if (exercises && exercises.length > 0) {
        const exerciseRows = exercises.map((ex, idx) => ({
          template_id: template.id,
          exercise_id: ex.exercise_id || null,
          exercise_name: ex.exercise_name,
          block_type: ex.block_type || 'primary',
          sets: ex.sets || null,
          reps_min: ex.reps_min || null,
          reps_max: ex.reps_max || null,
          time_seconds: ex.time_seconds || null,
          rest_seconds: ex.rest_seconds || null,
          tempo: ex.tempo || null,
          rpe: ex.rpe || null,
          rir: ex.rir || null,
          notes: ex.notes || null,
          sort_order: ex.sort_order ?? idx,
        }));
        
        const { error: exError } = await supabase
          .from('training_template_exercises')
          .insert(exerciseRows);
        
        if (exError) throw exError;
      }
      
      return template as TrainingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
      toast.success('Šablona vytvořena');
    },
    onError: (error) => {
      toast.error('Chyba: ' + error.message);
    },
  });
}

export function useUpdateTrainingTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      exercises, 
      ...templateData 
    }: Partial<CreateTemplateInput> & { id: string }) => {
      // Update template
      const { data: template, error: templateError } = await supabase
        .from('training_templates')
        .update({
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          estimated_duration: templateData.estimated_duration,
          is_public: templateData.is_public,
          tags: templateData.tags,
          workout_format: templateData.workout_format,
          time_cap_seconds: templateData.time_cap_seconds,
          rounds: templateData.rounds,
          work_interval_seconds: templateData.work_interval_seconds,
          rest_interval_seconds: templateData.rest_interval_seconds,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (templateError) throw templateError;
      
      // Replace exercises if provided
      if (exercises !== undefined) {
        // Delete existing exercises
        await supabase
          .from('training_template_exercises')
          .delete()
          .eq('template_id', id);
        
        // Insert new exercises
        if (exercises.length > 0) {
          const exerciseRows = exercises.map((ex, idx) => ({
            template_id: id,
            exercise_id: ex.exercise_id || null,
            exercise_name: ex.exercise_name,
            block_type: ex.block_type || 'primary',
            sets: ex.sets || null,
            reps_min: ex.reps_min || null,
            reps_max: ex.reps_max || null,
            time_seconds: ex.time_seconds || null,
            rest_seconds: ex.rest_seconds || null,
            tempo: ex.tempo || null,
            rpe: ex.rpe || null,
            rir: ex.rir || null,
            notes: ex.notes || null,
            sort_order: ex.sort_order ?? idx,
          }));
          
          const { error: exError } = await supabase
            .from('training_template_exercises')
            .insert(exerciseRows);
          
          if (exError) throw exError;
        }
      }
      
      return template as TrainingTemplate;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
      queryClient.invalidateQueries({ queryKey: ['training-template', variables.id] });
      toast.success('Šablona aktualizována');
    },
    onError: (error) => {
      toast.error('Chyba: ' + error.message);
    },
  });
}

export function useDeleteTrainingTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('training_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
      toast.success('Šablona smazána');
    },
    onError: (error) => {
      toast.error('Chyba: ' + error.message);
    },
  });
}

export function useDuplicateTrainingTemplate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!user) throw new Error('Nepřihlášen');
      
      // Fetch original template with exercises
      const { data: original, error: fetchError } = await supabase
        .from('training_templates')
        .select(`
          *,
          exercises:training_template_exercises(*)
        `)
        .eq('id', templateId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create new template
      const { data: newTemplate, error: createError } = await supabase
        .from('training_templates')
        .insert({
          user_id: user.id,
          name: `${original.name} (kopie)`,
          description: original.description,
          category: original.category,
          estimated_duration: original.estimated_duration,
          is_public: false,
          tags: original.tags,
          workout_format: original.workout_format || 'standard',
          time_cap_seconds: original.time_cap_seconds,
          rounds: original.rounds,
          work_interval_seconds: original.work_interval_seconds,
          rest_interval_seconds: original.rest_interval_seconds,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Copy exercises
      if (original.exercises && original.exercises.length > 0) {
        const exerciseRows = original.exercises.map((ex: TrainingTemplateExercise) => ({
          template_id: newTemplate.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          block_type: ex.block_type,
          sets: ex.sets,
          reps_min: ex.reps_min,
          reps_max: ex.reps_max,
          time_seconds: ex.time_seconds,
          rest_seconds: ex.rest_seconds,
          tempo: ex.tempo,
          rpe: ex.rpe,
          rir: ex.rir,
          notes: ex.notes,
          sort_order: ex.sort_order,
        }));
        
        const { error: exError } = await supabase
          .from('training_template_exercises')
          .insert(exerciseRows);
        
        if (exError) throw exError;
      }
      
      return newTemplate as TrainingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
      toast.success('Šablona zkopírována');
    },
    onError: (error) => {
      toast.error('Chyba: ' + error.message);
    },
  });
}

// Apply template to a training session
export function useApplyTemplateToSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      templateId, 
      sessionId 
    }: { 
      templateId: string; 
      sessionId: string;
    }) => {
      // Fetch template exercises
      const { data: exercises, error: fetchError } = await supabase
        .from('training_template_exercises')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');
      
      if (fetchError) throw fetchError;
      
      // Get session info
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .select('client_id, user_id, date')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) throw sessionError;
      
      // Create workout entries from template exercises
      if (exercises && exercises.length > 0) {
        const workoutEntries = exercises.map((ex: TrainingTemplateExercise, idx: number) => ({
          training_session_id: sessionId,
          client_id: session.client_id,
          user_id: session.user_id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          set_number: 1,
          reps: ex.reps_min || ex.reps_max,
          weight_kg: null,
          time_seconds: ex.time_seconds,
          notes: ex.notes,
          sort_order: idx,
        }));
        
        // Insert first set for each exercise
        const { error: insertError } = await supabase
          .from('workout_entries')
          .insert(workoutEntries);
        
        if (insertError) throw insertError;
      }
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workout-entries', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['training-session', variables.sessionId] });
      toast.success('Šablona aplikována');
    },
    onError: (error) => {
      toast.error('Chyba: ' + error.message);
    },
  });
}
