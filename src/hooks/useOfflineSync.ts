import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useOnlineStatus } from './useOnlineStatus';
import {
  processSyncQueue,
  hasPendingSync,
  scheduleSyncOnReconnect,
  getOfflineStats,
  cacheClients,
  cacheExercises,
  cachePRs,
  getCachedClients,
  getCachedExercises,
  getCachedPRs,
  getCachedPRsByClient,
  type CachedClient,
  type CachedExercise,
  type CachedPR,
} from '@/lib/offline';
import { supabase } from '@/integrations/supabase/client';

interface OfflineSyncState {
  isSyncing: boolean;
  hasPendingData: boolean;
  lastSyncAt: Date | null;
  pendingCount: number;
  cachedClientsCount: number;
  cachedExercisesCount: number;
  cachedPRsCount: number;
}

/**
 * Hook for managing offline data synchronization
 */
export function useOfflineSync() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [state, setState] = useState<OfflineSyncState>({
    isSyncing: false,
    hasPendingData: false,
    lastSyncAt: null,
    pendingCount: 0,
    cachedClientsCount: 0,
    cachedExercisesCount: 0,
    cachedPRsCount: 0,
  });
  
  const syncSchedulerCleanup = useRef<(() => void) | null>(null);

  // Check pending data on mount
  useEffect(() => {
    const checkPending = async () => {
      try {
        const stats = await getOfflineStats();
        const pending = await hasPendingSync();
        setState(prev => ({
          ...prev,
          hasPendingData: pending,
          pendingCount: stats.pendingTrainings + stats.syncQueueItems,
          cachedClientsCount: stats.cachedClients,
          cachedExercisesCount: stats.cachedExercises,
          cachedPRsCount: stats.cachedPRs,
        }));
      } catch (error) {
        console.error('Failed to check pending sync:', error);
      }
    };
    checkPending();
  }, []);

  // Schedule sync on reconnect
  useEffect(() => {
    syncSchedulerCleanup.current = scheduleSyncOnReconnect(async (result) => {
      if (result.synced > 0) {
        toast.success(`Synchronizováno ${result.synced} položek`, {
          description: result.failed > 0 
            ? `${result.failed} položek se nepodařilo synchronizovat`
            : 'Všechna offline data byla synchronizována',
        });
      }
      
      // Refresh state
      const stats = await getOfflineStats();
      const pending = await hasPendingSync();
      setState(prev => ({
        ...prev,
        hasPendingData: pending,
        pendingCount: stats.pendingTrainings + stats.syncQueueItems,
        cachedPRsCount: stats.cachedPRs,
        lastSyncAt: new Date(),
        isSyncing: false,
      }));
    });

    return () => {
      syncSchedulerCleanup.current?.();
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && state.hasPendingData) {
      syncNow();
    }
  }, [isOnline, wasOffline, state.hasPendingData]);

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async () => {
    if (!isOnline || state.isSyncing) return;

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      const result = await processSyncQueue();
      
      if (result.synced > 0) {
        toast.success(`Synchronizováno ${result.synced} položek`);
      }

      if (result.failed > 0) {
        toast.warning(`${result.failed} položek se nepodařilo synchronizovat`);
      }

      const stats = await getOfflineStats();
      const pending = await hasPendingSync();
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        hasPendingData: pending,
        pendingCount: stats.pendingTrainings + stats.syncQueueItems,
        lastSyncAt: new Date(),
      }));

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
      toast.error('Synchronizace selhala');
      return null;
    }
  }, [isOnline, state.isSyncing]);

  /**
   * Cache clients for offline use
   */
  const cacheClientsForOffline = useCallback(async () => {
    try {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, email')
        .order('name');

      if (clients) {
        const cached: CachedClient[] = clients.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email ?? undefined,
          updatedAt: new Date().toISOString(),
        }));
        await cacheClients(cached);
        
        setState(prev => ({
          ...prev,
          cachedClientsCount: cached.length,
        }));
        
        return cached.length;
      }
      return 0;
    } catch (error) {
      console.error('Failed to cache clients:', error);
      return 0;
    }
  }, []);

  /**
   * Cache exercises for offline use
   */
  const cacheExercisesForOffline = useCallback(async () => {
    try {
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, name, category')
        .order('name');

      if (exercises) {
        const cached: CachedExercise[] = exercises.map(e => ({
          id: e.id,
          name: e.name,
          category: e.category ?? undefined,
          updatedAt: new Date().toISOString(),
        }));
        await cacheExercises(cached);
        
        setState(prev => ({
          ...prev,
          cachedExercisesCount: cached.length,
        }));
        
        return cached.length;
      }
      return 0;
    } catch (error) {
      console.error('Failed to cache exercises:', error);
      return 0;
    }
  }, []);

  /**
   * Cache PRs for offline use - placeholder for future implementation
   */
  const cachePRsForOffline = useCallback(async () => {
    // PRs are calculated dynamically from exercise_entries
    // For now, we cache a minimal set
    setState(prev => ({
      ...prev,
      cachedPRsCount: 0,
    }));
    return 0;
  }, []);

  /**
   * Get cached clients (for offline use)
   */
  const getOfflineClients = useCallback(async () => {
    return getCachedClients();
  }, []);

  /**
   * Get cached exercises (for offline use)
   */
  const getOfflineExercises = useCallback(async () => {
    return getCachedExercises();
  }, []);

  /**
   * Get cached PRs (for offline use)
   */
  const getOfflinePRs = useCallback(async () => {
    return getCachedPRs();
  }, []);

  /**
   * Get cached PRs for a specific client
   */
  const getOfflinePRsByClient = useCallback(async (clientId: string) => {
    return getCachedPRsByClient(clientId);
  }, []);

  /**
   * Prepare for offline mode (cache essential data)
   */
  const prepareForOffline = useCallback(async () => {
    if (!isOnline) return { clients: 0, exercises: 0, prs: 0 };

    const [clientsCount, exercisesCount, prsCount] = await Promise.all([
      cacheClientsForOffline(),
      cacheExercisesForOffline(),
      cachePRsForOffline(),
    ]);

    toast.success('Připraveno pro offline režim', {
      description: `${clientsCount} klientů, ${exercisesCount} cviků, ${prsCount} PR`,
    });

    return { clients: clientsCount, exercises: exercisesCount, prs: prsCount };
  }, [isOnline, cacheClientsForOffline, cacheExercisesForOffline, cachePRsForOffline]);

  return {
    ...state,
    isOnline,
    syncNow,
    prepareForOffline,
    getOfflineClients,
    getOfflineExercises,
    getOfflinePRs,
    getOfflinePRsByClient,
    cacheClientsForOffline,
    cacheExercisesForOffline,
    cachePRsForOffline,
  };
}
