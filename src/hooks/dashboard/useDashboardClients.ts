import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { ClientQuickInfo } from '@/types/client';
import type { ClientRow, UnpaidTrainingRow, TrainingSessionRow } from './types';

/**
 * Hook for fetching clients quick info
 */
export function useDashboardClients() {
  const { data: appSettings } = useAppSettings();

  return useQuery({
    queryKey: ['dashboard-clients', appSettings?.low_credit_threshold],
    queryFn: async (): Promise<ClientQuickInfo[]> => {
      const lowCreditThreshold = (appSettings?.low_credit_threshold as number) || 800;

      const [clientsResult, unpaidResult, trainingsResult] = await Promise.all([
        supabase.from('clients').select('id, name, credit_balance, is_favorite, is_archived').eq('is_archived', false),
        supabase.from('training_sessions').select('id, client_id').eq('status', 'completed').eq('payment_status', 'pending'),
        supabase.from('training_sessions').select('id, date, client_id').eq('status', 'completed').order('date', { ascending: false }),
      ]);

      const unpaidByClient = new Map<string, number>();
      ((unpaidResult.data || []) as UnpaidTrainingRow[]).forEach(t => {
        unpaidByClient.set(t.client_id, (unpaidByClient.get(t.client_id) || 0) + 1);
      });

      const lastTrainingByClient = new Map<string, Date>();
      ((trainingsResult.data || []) as TrainingSessionRow[]).forEach(t => {
        if (!lastTrainingByClient.has(t.client_id)) {
          lastTrainingByClient.set(t.client_id, new Date(t.date));
        }
      });

      return ((clientsResult.data || []) as ClientRow[])
        .map(c => {
          const unpaidCount = unpaidByClient.get(c.id) || 0;
          const creditBalance = c.credit_balance || 0;
          let status: 'ok' | 'warning' | 'error' = 'ok';
          if (creditBalance < 0 || unpaidCount >= 3) status = 'error';
          else if (creditBalance <= lowCreditThreshold || unpaidCount > 0) status = 'warning';

          return {
            id: c.id, name: c.name, creditBalance,
            lastTrainingDate: lastTrainingByClient.get(c.id) || null,
            status, isFavorite: c.is_favorite || false, unpaidCount,
          };
        })
        .sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
          const order = { error: 0, warning: 1, ok: 2 };
          if (a.status !== b.status) return order[a.status] - order[b.status];
          return a.name.localeCompare(b.name);
        })
        .slice(0, 10);
    },
    staleTime: 60000,
  });
}
