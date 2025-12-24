import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NutritionSessionWithClient {
  id: string;
  client_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
  token: string;
  created_at: string;
  updated_at: string;
  client_name: string;
  entries_count: number;
  food_count: number;
  drink_count: number;
  coffee_count: number;
}

export function useAllNutritionSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-nutrition-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('nutrition_log_sessions')
        .select(`
          id,
          client_id,
          start_date,
          end_date,
          status,
          token,
          created_at,
          updated_at,
          clients (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      if (!sessions?.length) return [];

      const sessionIds = sessions.map(s => s.id);

      // Get entry counts in parallel
      const [foodResult, drinkResult, coffeeResult] = await Promise.all([
        supabase
          .from('nutrition_food_entries')
          .select('session_id')
          .in('session_id', sessionIds),
        supabase
          .from('nutrition_drink_entries')
          .select('session_id')
          .in('session_id', sessionIds),
        supabase
          .from('nutrition_coffee_entries')
          .select('session_id')
          .in('session_id', sessionIds),
      ]);

      // Count entries per session
      const foodCounts = new Map<string, number>();
      const drinkCounts = new Map<string, number>();
      const coffeeCounts = new Map<string, number>();

      (foodResult.data || []).forEach(e => {
        foodCounts.set(e.session_id, (foodCounts.get(e.session_id) || 0) + 1);
      });
      (drinkResult.data || []).forEach(e => {
        drinkCounts.set(e.session_id, (drinkCounts.get(e.session_id) || 0) + 1);
      });
      (coffeeResult.data || []).forEach(e => {
        coffeeCounts.set(e.session_id, (coffeeCounts.get(e.session_id) || 0) + 1);
      });

      return sessions.map((session): NutritionSessionWithClient => ({
        id: session.id,
        client_id: session.client_id,
        start_date: session.start_date,
        end_date: session.end_date,
        status: session.status as 'active' | 'completed',
        token: session.token,
        created_at: session.created_at,
        updated_at: session.updated_at,
        client_name: (session.clients as any)?.name || 'Neznámý klient',
        food_count: foodCounts.get(session.id) || 0,
        drink_count: drinkCounts.get(session.id) || 0,
        coffee_count: coffeeCounts.get(session.id) || 0,
        entries_count: (foodCounts.get(session.id) || 0) + (drinkCounts.get(session.id) || 0) + (coffeeCounts.get(session.id) || 0),
      }));
    },
    enabled: !!user?.id,
  });
}

export function useNutritionStats() {
  const { data: sessions, isLoading } = useAllNutritionSessions();

  const stats = {
    totalSessions: sessions?.length || 0,
    activeSessions: sessions?.filter(s => s.status === 'active').length || 0,
    completedSessions: sessions?.filter(s => s.status === 'completed').length || 0,
    totalEntries: sessions?.reduce((sum, s) => sum + s.entries_count, 0) || 0,
    avgEntriesPerSession: sessions?.length 
      ? Math.round((sessions.reduce((sum, s) => sum + s.entries_count, 0) / sessions.length) * 10) / 10
      : 0,
  };

  return { stats, isLoading };
}
