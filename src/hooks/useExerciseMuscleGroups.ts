import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExerciseMuscleGroup {
  id: string;
  exercise_id: string;
  muscle_group_id: string;
  role: 'primary' | 'secondary';
  muscle_group?: {
    id: string;
    name: string;
    name_cz: string;
    region: string;
  };
}

export function useExerciseMuscleGroups(exerciseId?: string) {
  const queryClient = useQueryClient();

  const { data: muscleGroups = [], isLoading, error } = useQuery({
    queryKey: ['exercise-muscle-groups', exerciseId],
    queryFn: async () => {
      if (!exerciseId) return [];
      
      const { data, error } = await supabase
        .from('exercise_muscle_groups')
        .select(`
          *,
          muscle_group:muscle_groups(id, name, name_cz, region)
        `)
        .eq('exercise_id', exerciseId);
      
      if (error) throw error;
      return data as ExerciseMuscleGroup[];
    },
    enabled: !!exerciseId,
  });

  const addMuscleGroup = useMutation({
    mutationFn: async ({ 
      exerciseId, 
      muscleGroupId, 
      role 
    }: { 
      exerciseId: string; 
      muscleGroupId: string; 
      role: 'primary' | 'secondary';
    }) => {
      const { data, error } = await supabase
        .from('exercise_muscle_groups')
        .insert({ exercise_id: exerciseId, muscle_group_id: muscleGroupId, role })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-muscle-groups', exerciseId] });
    },
  });

  const removeMuscleGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercise_muscle_groups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-muscle-groups', exerciseId] });
    },
  });

  const primaryMuscles = muscleGroups.filter(mg => mg.role === 'primary');
  const secondaryMuscles = muscleGroups.filter(mg => mg.role === 'secondary');

  return {
    muscleGroups,
    primaryMuscles,
    secondaryMuscles,
    addMuscleGroup,
    removeMuscleGroup,
    isLoading,
    error,
  };
}

// Hook to get all exercise muscle groups for analytics
export function useAllExerciseMuscleGroups() {
  const { data: mappings = [], isLoading, error } = useQuery({
    queryKey: ['all-exercise-muscle-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_muscle_groups')
        .select(`
          exercise_id,
          role,
          muscle_group:muscle_groups(id, name, name_cz, region)
        `);
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create a map from exercise_id to muscle groups
  const exerciseMuscleMap = new Map<string, { primary: string[]; secondary: string[] }>();
  
  mappings.forEach((m: any) => {
    if (!exerciseMuscleMap.has(m.exercise_id)) {
      exerciseMuscleMap.set(m.exercise_id, { primary: [], secondary: [] });
    }
    const entry = exerciseMuscleMap.get(m.exercise_id)!;
    if (m.role === 'primary') {
      entry.primary.push(m.muscle_group.name);
    } else {
      entry.secondary.push(m.muscle_group.name);
    }
  });

  return {
    mappings,
    exerciseMuscleMap,
    isLoading,
    error,
  };
}
