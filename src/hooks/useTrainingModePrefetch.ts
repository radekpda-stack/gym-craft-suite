import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  cacheClients,
  cacheExercises,
  cachePRs,
  cacheProducts,
  cacheSchedule,
  setMetadata,
  type CachedClient,
  type CachedExercise,
  type CachedPR,
  type CachedProduct,
  type CachedScheduleSession,
} from '@/lib/offline';
import { scheduleSyncOnReconnect } from '@/lib/offline/syncService';

interface PrefetchState {
  isPrefetching: boolean;
  isComplete: boolean;
  error: string | null;
  stats: {
    clients: number;
    exercises: number;
    prs: number;
    products: number;
    schedule: number;
  };
}

/**
 * Hook for prefetching all training mode data into IndexedDB
 * Called when entering training mode to enable full offline support
 */
export function useTrainingModePrefetch() {
  const [state, setState] = useState<PrefetchState>({
    isPrefetching: false,
    isComplete: false,
    error: null,
    stats: { clients: 0, exercises: 0, prs: 0, products: 0, schedule: 0 },
  });

  /**
   * Prefetch today's schedule
   */
  const prefetchSchedule = useCallback(async (): Promise<number> => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startOfDay = `${today}T00:00:00`;
    const endOfDay = `${today}T23:59:59`;

    const { data: sessions, error } = await supabase
      .from('training_sessions')
      .select(`
        id,
        date,
        duration,
        status,
        final_price,
        training_participants(client_id, clients(id, name))
      `)
      .gte('date', startOfDay)
      .lte('date', endOfDay)
      .order('date');

    if (error) throw error;

    const cachedSessions: CachedScheduleSession[] = (sessions || []).map(s => {
      const participants = s.training_participants as any[] || [];
      const firstParticipant = participants[0];
      return {
        id: s.id,
        date: s.date,
        clientId: firstParticipant?.client_id || '',
        clientName: firstParticipant?.clients?.name || 'Neznámý klient',
        status: s.status as any,
        duration: s.duration,
        price: s.final_price ?? undefined,
        updatedAt: new Date().toISOString(),
      };
    });

    await cacheSchedule(cachedSessions);
    return cachedSessions.length;
  }, []);

  /**
   * Prefetch all clients
   */
  const prefetchClients = useCallback(async (): Promise<number> => {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, email, credit_balance')
      .eq('is_archived', false)
      .order('name');

    if (error) throw error;

    const cachedClients: CachedClient[] = (clients || []).map(c => ({
      id: c.id,
      name: c.name,
      email: c.email ?? undefined,
      creditBalance: c.credit_balance ?? undefined,
      updatedAt: new Date().toISOString(),
    }));

    await cacheClients(cachedClients);
    return cachedClients.length;
  }, []);

  /**
   * Prefetch exercises
   */
  const prefetchExercises = useCallback(async (): Promise<number> => {
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('id, name, name_cs, category, exercise_type')
      .eq('is_archived', false)
      .order('name');

    if (error) throw error;

    const cachedExercises: CachedExercise[] = (exercises || []).map(e => ({
      id: e.id,
      name: e.name_cs || e.name,
      category: e.category ?? undefined,
      metricType: e.exercise_type ?? undefined,
      updatedAt: new Date().toISOString(),
    }));

    await cacheExercises(cachedExercises);
    return cachedExercises.length;
  }, []);

  /**
   * Prefetch PRs for today's clients from exercise_entries with is_pr=true
   */
  const prefetchPRs = useCallback(async (clientIds: string[]): Promise<number> => {
    if (clientIds.length === 0) return 0;

    const { data: prs, error } = await supabase
      .from('exercise_entries')
      .select(`
        id,
        client_id,
        exercise_id,
        exercise_name,
        weight_kg,
        reps,
        time_seconds,
        distance_meters,
        date
      `)
      .in('client_id', clientIds)
      .eq('is_pr', true)
      .order('date', { ascending: false })
      .limit(100);

    if (error) throw error;

    const cachedPRs: CachedPR[] = (prs || []).map(pr => {
      // Determine metric type based on available data
      let metric: 'weight' | 'reps' | 'duration' | 'distance' = 'weight';
      let value = 0;
      let unit = 'kg';

      if (pr.weight_kg) {
        metric = 'weight';
        value = pr.weight_kg;
        unit = 'kg';
      } else if (pr.distance_meters) {
        metric = 'distance';
        value = pr.distance_meters;
        unit = 'm';
      } else if (pr.time_seconds) {
        metric = 'duration';
        value = pr.time_seconds;
        unit = 's';
      } else if (pr.reps) {
        metric = 'reps';
        value = pr.reps;
        unit = 'reps';
      }

      return {
        id: pr.id,
        clientId: pr.client_id,
        exerciseId: pr.exercise_id || '',
        exerciseName: pr.exercise_name || '',
        metric,
        value,
        unit,
        achievedAt: pr.date,
        updatedAt: new Date().toISOString(),
      };
    });

    await cachePRs(cachedPRs);
    return cachedPRs.length;
  }, []);

  /**
   * Prefetch products for quick sale
   */
  const prefetchProducts = useCallback(async (): Promise<number> => {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, price, kind, category, stock_quantity, is_active')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    const cachedProducts: CachedProduct[] = (products || []).map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      kind: p.kind as any,
      category: p.category,
      stock_quantity: p.stock_quantity ?? 0,
      is_active: p.is_active,
      updatedAt: new Date().toISOString(),
    }));

    await cacheProducts(cachedProducts);
    return cachedProducts.length;
  }, []);

  /**
   * Run full prefetch
   */
  const prefetch = useCallback(async () => {
    if (state.isPrefetching) return;

    setState(prev => ({ ...prev, isPrefetching: true, error: null }));

    try {
      // Prefetch schedule first to get client IDs
      const scheduleCount = await prefetchSchedule();

      // Get client IDs from cached schedule
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('training_participants(client_id)')
        .gte('date', `${format(new Date(), 'yyyy-MM-dd')}T00:00:00`)
        .lte('date', `${format(new Date(), 'yyyy-MM-dd')}T23:59:59`);

      const clientIds = new Set<string>();
      (sessions || []).forEach(s => {
        (s.training_participants as any[] || []).forEach(p => {
          if (p.client_id) clientIds.add(p.client_id);
        });
      });

      // Parallel prefetch of all other data
      const [clientsCount, exercisesCount, prsCount, productsCount] = await Promise.all([
        prefetchClients(),
        prefetchExercises(),
        prefetchPRs(Array.from(clientIds)),
        prefetchProducts(),
      ]);

      // Save prefetch timestamp
      await setMetadata('lastPrefetch', new Date().toISOString());

      setState({
        isPrefetching: false,
        isComplete: true,
        error: null,
        stats: {
          clients: clientsCount,
          exercises: exercisesCount,
          prs: prsCount,
          products: productsCount,
          schedule: scheduleCount,
        },
      });

      // Register sync on reconnect
      scheduleSyncOnReconnect((result) => {
        if (result.synced > 0) {
          toast.success(`Synchronizováno ${result.synced} položek`);
        }
      });

    } catch (error: any) {
      console.error('Prefetch failed:', error);
      setState(prev => ({
        ...prev,
        isPrefetching: false,
        error: error.message || 'Chyba při načítání dat',
      }));
      
      // Continue anyway - app should work with partial data
      setState(prev => ({ ...prev, isComplete: true }));
    }
  }, [state.isPrefetching, prefetchSchedule, prefetchClients, prefetchExercises, prefetchPRs, prefetchProducts]);

  return {
    ...state,
    prefetch,
  };
}
