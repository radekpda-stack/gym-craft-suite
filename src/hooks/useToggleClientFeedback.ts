import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useToggleClientFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, enabled }: { clientId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('clients')
        .update({ feedback_enabled: enabled })
        .eq('id', clientId);

      if (error) throw error;
      return { clientId, enabled };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['pending-feedback-trainings'] });
      toast.success(data.enabled 
        ? 'Feedback zapnut - klient se bude zobrazovat v přehledu' 
        : 'Feedback vypnut - klient se nebude zobrazovat v přehledu'
      );
    },
    onError: () => {
      toast.error('Nepodařilo se změnit nastavení feedbacku');
    },
  });
}
