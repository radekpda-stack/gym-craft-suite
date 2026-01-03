import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useFavoriteExercises() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [], isLoading } = useQuery({
    queryKey: ['favorite-exercises', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('favorite_exercises')
        .select('exercise_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(f => f.exercise_id);
    },
    enabled: !!user?.id,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (exerciseId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const isFavorite = favoriteIds.includes(exerciseId);

      if (isFavorite) {
        const { error } = await supabase
          .from('favorite_exercises')
          .delete()
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId);
        
        if (error) throw error;
        return { added: false };
      } else {
        const { error } = await supabase
          .from('favorite_exercises')
          .insert({ user_id: user.id, exercise_id: exerciseId });
        
        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['favorite-exercises'] });
      toast({
        title: result.added ? 'Přidáno do oblíbených' : 'Odebráno z oblíbených',
        description: result.added 
          ? 'Cvik byl přidán mezi oblíbené' 
          : 'Cvik byl odebrán z oblíbených',
      });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se změnit stav oblíbeného cviku',
        variant: 'destructive',
      });
    },
  });

  const isFavorite = (exerciseId: string) => favoriteIds.includes(exerciseId);

  return {
    favoriteIds,
    isLoading,
    toggleFavorite,
    isFavorite,
  };
}
