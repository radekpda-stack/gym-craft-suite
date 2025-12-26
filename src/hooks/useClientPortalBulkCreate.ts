import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface BulkCreateResult {
  success: boolean;
  created_count: number;
  skipped_count: number;
  error?: string;
}

export function useBulkCreateClientPortals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<BulkCreateResult> => {
      if (!user?.id) {
        throw new Error('Uživatel není přihlášen');
      }

      const { data, error } = await supabase.rpc('bulk_create_client_portals', {
        p_trainer_id: user.id,
      });

      if (error) throw error;
      
      const result = data as unknown as BulkCreateResult;
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['portal-clients'] });
        queryClient.invalidateQueries({ queryKey: ['clients-without-portal'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        
        if (result.created_count > 0) {
          toast.success(`Vytvořeno ${result.created_count} portálových účtů`, {
            description: result.skipped_count > 0 
              ? `${result.skipped_count} klientů přeskočeno (bez emailu nebo již mají přístup)`
              : undefined,
          });
        } else {
          toast.info('Všichni klienti již mají portálový účet nebo nemají email');
        }
      } else {
        toast.error(result.error || 'Nepodařilo se vytvořit portály');
      }
    },
    onError: (error: Error) => {
      console.error('Bulk create error:', error);
      toast.error('Nepodařilo se vytvořit portály', {
        description: error.message,
      });
    },
  });
}

// Hook to get count of clients without portal
export function useClientsWithoutPortalCount() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .eq('is_system', false)
        .not('email', 'is', null);

      if (error) throw error;

      // Get clients with portal
      const { count: portalCount, error: portalError } = await supabase
        .from('client_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', user.id);

      if (portalError) throw portalError;

      return (count ?? 0) - (portalCount ?? 0);
    },
  });
}
