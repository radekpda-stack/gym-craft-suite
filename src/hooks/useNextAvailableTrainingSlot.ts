import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the next available hour slot for today based on existing scheduled trainings.
 * If current time is 9:18, first slot is 10:00. If 10:00 is taken, returns 11:00, etc.
 */
export function useNextAvailableTrainingSlot() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { data: todayTrainings = [] } = useQuery({
    queryKey: ['training-sessions-today-slots', todayStr],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_sessions')
        .select('date')
        .gte('date', `${todayStr}T00:00:00`)
        .lt('date', `${todayStr}T23:59:59`)
        .in('status', ['scheduled', 'completed']);
      return data || [];
    },
    staleTime: 10_000, // refresh every 10s to pick up newly created trainings
  });

  const nextSlot = useMemo(() => {
    // Collect taken hours
    const takenHours = new Set<number>();
    for (const t of todayTrainings) {
      const d = new Date(t.date);
      takenHours.add(d.getHours());
    }

    // Start from next full hour
    const now = new Date();
    let candidateHour = now.getHours() + 1;

    // Find the first free hour (max until 23)
    while (takenHours.has(candidateHour) && candidateHour <= 23) {
      candidateHour++;
    }

    if (candidateHour > 23) {
      candidateHour = now.getHours() + 1; // fallback
    }

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(candidateHour).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:00`;
  }, [todayTrainings]);

  return nextSlot;
}
