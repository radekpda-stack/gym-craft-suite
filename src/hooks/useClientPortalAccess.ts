/**
 * Hook for fetching client portal access information
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientAccountInfo {
  id: string;
  status: string;
  last_portal_login: string | null;
  last_password_reset_at: string | null;
  created_at: string;
  auth_user_id: string | null;
  credit_history_start_at: string | null;
}

export function useClientPortalAccess(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-access', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('client_accounts')
        .select('id, status, last_portal_login, last_password_reset_at, created_at, auth_user_id, credit_history_start_at')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data as ClientAccountInfo | null;
    },
    enabled: !!clientId,
  });
}
