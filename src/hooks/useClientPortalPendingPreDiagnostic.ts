import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export interface PendingPreDiagnostic {
  id: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
  isExpired: boolean;
}

export function useClientPortalPendingPreDiagnostic() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['client-portal-pending-prediagnostic', clientId],
    queryFn: async (): Promise<PendingPreDiagnostic | null> => {
      if (!clientId) return null;

      const now = new Date();

      const { data, error } = await supabase
        .from('pre_diagnostic_forms')
        .select('id, token, status, expires_at, created_at')
        .eq('client_id', clientId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const expiresAt = new Date(data.expires_at);
      const isExpired = now > expiresAt;

      // Don't return expired forms
      if (isExpired) return null;

      return {
        ...data,
        isExpired,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
