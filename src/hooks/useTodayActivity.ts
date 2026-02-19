import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export interface TodayEntry {
  id: string;
  type: 'strength' | 'cardio' | 'skill';
  client_name: string;
  exercise_name: string;
  summary: string;
  created_at: string;
}

export function useTodayActivity() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['today-activity', user?.id],
    queryFn: async (): Promise<TodayEntry[]> => {
      if (!user?.id) return [];

      const today = format(new Date(), 'yyyy-MM-dd');

      const [strengthRes, cardioRes, skillRes] = await Promise.all([
        supabase
          .from('exercise_entries')
          .select('id, exercise_name, sets, reps, weight_kg, clients(name), created_at')
          .eq('user_id', user.id)
          .eq('date', today)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('cardio_entries')
          .select('id, exercise_name, duration_seconds, distance_meters, clients(name), created_at')
          .eq('user_id', user.id)
          .eq('date', today)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('skill_entries')
          .select('id, exercise_name, attempts, successful, clients(name), created_at')
          .eq('user_id', user.id)
          .eq('date', today)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const entries: TodayEntry[] = [];

      (strengthRes.data || []).forEach(e => {
        const client = e.clients as { name: string } | null;
        const summary = [
          e.sets ? `${e.sets} sérií` : null,
          e.reps ? `${e.reps} opak.` : null,
          e.weight_kg ? `${e.weight_kg} kg` : null,
        ].filter(Boolean).join(' × ');

        entries.push({
          id: e.id,
          type: 'strength',
          client_name: client?.name || '—',
          exercise_name: e.exercise_name,
          summary: summary || 'Silový trénink',
          created_at: e.created_at,
        });
      });

      (cardioRes.data || []).forEach(e => {
        const client = e.clients as { name: string } | null;
        const mins = Math.floor((e.duration_seconds || 0) / 60);
        const km = e.distance_meters ? `${(e.distance_meters / 1000).toFixed(1)} km` : null;
        const summary = [km, mins > 0 ? `${mins} min` : null].filter(Boolean).join(' · ');

        entries.push({
          id: e.id,
          type: 'cardio',
          client_name: client?.name || '—',
          exercise_name: e.exercise_name,
          summary: summary || 'Kardio',
          created_at: e.created_at,
        });
      });

      (skillRes.data || []).forEach(e => {
        const client = e.clients as { name: string } | null;
        const summary = e.attempts
          ? `${e.successful ?? 0}/${e.attempts} úspěšných`
          : 'Skill trénink';

        entries.push({
          id: e.id,
          type: 'skill',
          client_name: client?.name || '—',
          exercise_name: e.exercise_name,
          summary,
          created_at: e.created_at,
        });
      });

      // Sort by created_at desc, take top 5
      entries.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return entries.slice(0, 5);
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // refetch every 2 minutes
  });
}
