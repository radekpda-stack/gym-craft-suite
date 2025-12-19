import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { featureTracker } from '@/hooks/useFeatureTracking';

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, isFavorite }: { clientId: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('clients')
        .update({ is_favorite: isFavorite })
        .eq('id', clientId);

      if (error) throw error;
    },
    onSuccess: (_, { isFavorite }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      featureTracker.track('client_favorite', 'clients', { isFavorite });
      toast({
        title: isFavorite ? 'Přidáno do oblíbených' : 'Odebráno z oblíbených',
        description: isFavorite 
          ? 'Klient byl přidán do oblíbených.' 
          : 'Klient byl odebrán z oblíbených.',
      });
    },
    onError: (error) => {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se změnit stav oblíbených.',
        variant: 'destructive',
      });
    },
  });
}
