import { useMemo } from 'react';
import { useDashboardCore } from './useDashboardCore';
import type { CapacityInfo } from './types';

/**
 * Hook for fetching today's capacity data
 * Now uses shared core data to avoid duplicate queries
 */
export function useDashboardCapacity() {
  const core = useDashboardCore();

  const data = useMemo((): CapacityInfo | undefined => {
    if (!core.data) return undefined;
    
    const trainings = core.data.todayTrainings;
    const completed = trainings.filter(t => t.status === 'completed').length;
    const scheduled = trainings.filter(t => t.status === 'scheduled').length;
    const total = completed + scheduled;

    return {
      completed,
      scheduled,
      total,
      percentUsed: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [core.data]);

  return {
    data,
    isLoading: core.isLoading,
    isError: core.isError,
    error: core.error,
    refetch: core.refetch,
  };
}
