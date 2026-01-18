import { useMemo } from 'react';
import { useDashboardCore } from './useDashboardCore';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { ClientQuickInfo } from '@/types/client';

/**
 * Hook for fetching clients quick info
 * Now uses shared core data to avoid duplicate queries
 */
export function useDashboardClients() {
  const { data: appSettings } = useAppSettings();
  const core = useDashboardCore();

  const data = useMemo((): ClientQuickInfo[] | undefined => {
    if (!core.data) return undefined;

    const lowCreditThreshold = (appSettings?.low_credit_threshold as number) || 800;
    const { clients, unpaidTrainings, weekTrainings } = core.data;

    // Count unpaid per client
    const unpaidByClient = new Map<string, number>();
    unpaidTrainings.forEach(t => {
      unpaidByClient.set(t.client_id, (unpaidByClient.get(t.client_id) || 0) + 1);
    });

    // Get last training date per client (from completed trainings)
    const lastTrainingByClient = new Map<string, Date>();
    const completedTrainings = [...weekTrainings]
      .filter(t => t.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    completedTrainings.forEach(t => {
      if (!lastTrainingByClient.has(t.client_id)) {
        lastTrainingByClient.set(t.client_id, new Date(t.date));
      }
    });

    return clients
      .map(c => {
        const unpaidCount = unpaidByClient.get(c.id) || 0;
        const creditBalance = c.credit_balance || 0;
        let status: 'ok' | 'warning' | 'error' = 'ok';
        if (creditBalance < 0 || unpaidCount >= 3) status = 'error';
        else if (creditBalance <= lowCreditThreshold || unpaidCount > 0) status = 'warning';

        return {
          id: c.id,
          name: c.name,
          creditBalance,
          lastTrainingDate: lastTrainingByClient.get(c.id) || null,
          status,
          isFavorite: c.is_favorite || false,
          unpaidCount,
        };
      })
      .sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        const order = { error: 0, warning: 1, ok: 2 };
        if (a.status !== b.status) return order[a.status] - order[b.status];
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10);
  }, [core.data, appSettings?.low_credit_threshold]);

  return {
    data,
    isLoading: core.isLoading,
    isError: core.isError,
    error: core.error,
    refetch: core.refetch,
  };
}
