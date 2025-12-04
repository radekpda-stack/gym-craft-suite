import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  muscle_groups: string[];
  equipment: string[];
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useExercises() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exercises = [], isLoading, error } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Exercise[];
    },
  });

  const createExercise = useMutation({
    mutationFn: async (exercise: Omit<Exercise, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('exercises')
        .insert({ ...exercise, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast({ title: 'Cvik přidán', description: 'Nový cvik byl úspěšně vytvořen.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat cvik.', variant: 'destructive' });
    },
  });

  const updateExercise = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Exercise> & { id: string }) => {
      const { data, error } = await supabase
        .from('exercises')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast({ title: 'Cvik aktualizován', description: 'Změny byly uloženy.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se uložit změny.', variant: 'destructive' });
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast({ title: 'Cvik smazán', description: 'Cvik byl odstraněn.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se smazat cvik.', variant: 'destructive' });
    },
  });

  const categories = [...new Set(exercises.map((e) => e.category))];

  return {
    exercises,
    categories,
    isLoading,
    error,
    createExercise,
    updateExercise,
    deleteExercise,
  };
}
