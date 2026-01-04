import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useSeedCircuitTemplates() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .rpc('seed_circuit_templates_for_user', { p_user_id: user.id });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
      if (data && data.length > 0) {
        toast.success(`Vytvořeno ${data.length} vzorových kruhových tréninků`);
      }
    },
    onError: (error) => {
      console.error('Seed circuit templates error:', error);
      toast.error('Nepodařilo se vytvořit vzorové tréninky');
    },
  });
}
