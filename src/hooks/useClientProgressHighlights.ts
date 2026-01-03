import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfMonth, format } from 'date-fns';

export interface ClientProgress {
  clientId: string;
  clientName: string;
  progressType: 'weight_loss' | 'weight_gain' | 'consistency' | 'stagnating';
  value: number;
  detail: string;
}

export interface ClientProgressData {
  topProgressClients: ClientProgress[];
  stagnatingClients: ClientProgress[];
  consistentClients: ClientProgress[];
}

export function useClientProgressHighlights() {
  return useQuery({
    queryKey: ['client-progress-highlights'],
    queryFn: async (): Promise<ClientProgressData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thirtyDaysAgo = subDays(now, 30);

      // Get clients with their measurements
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, is_archived')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (!clients || clients.length === 0) {
        return { topProgressClients: [], stagnatingClients: [], consistentClients: [] };
      }

      // Get recent measurements for all clients
      const { data: measurements } = await supabase
        .from('measurements')
        .select('client_id, weight, date')
        .eq('user_id', user.id)
        .gte('date', subDays(now, 90).toISOString())
        .order('date', { ascending: true });

      // Get training counts for this month
      const { data: trainings } = await supabase
        .from('training_sessions')
        .select('client_id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', thisMonthStart.toISOString());

      // Calculate training frequency per client
      const trainingCounts = new Map<string, number>();
      trainings?.forEach(t => {
        trainingCounts.set(t.client_id, (trainingCounts.get(t.client_id) || 0) + 1);
      });

      // Calculate weight changes per client
      const clientMeasurements = new Map<string, { first: number; last: number; dates: { first: Date; last: Date } }>();
      
      measurements?.forEach(m => {
        if (m.weight === null) return;
        const existing = clientMeasurements.get(m.client_id);
        const mDate = new Date(m.date);
        
        if (!existing) {
          clientMeasurements.set(m.client_id, {
            first: m.weight,
            last: m.weight,
            dates: { first: mDate, last: mDate }
          });
        } else {
          if (mDate < existing.dates.first) {
            existing.first = m.weight;
            existing.dates.first = mDate;
          }
          if (mDate > existing.dates.last) {
            existing.last = m.weight;
            existing.dates.last = mDate;
          }
        }
      });

      const topProgressClients: ClientProgress[] = [];
      const stagnatingClients: ClientProgress[] = [];
      const consistentClients: ClientProgress[] = [];

      clients.forEach(client => {
        const mData = clientMeasurements.get(client.id);
        const trainingCount = trainingCounts.get(client.id) || 0;

        // Check for weight progress
        if (mData && mData.dates.first.getTime() !== mData.dates.last.getTime()) {
          const weightChange = mData.last - mData.first;
          const absChange = Math.abs(weightChange);

          if (absChange >= 1) {
            topProgressClients.push({
              clientId: client.id,
              clientName: client.name,
              progressType: weightChange < 0 ? 'weight_loss' : 'weight_gain',
              value: absChange,
              detail: `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg za poslední 3 měsíce`,
            });
          } else if (absChange < 0.5 && trainingCount >= 4) {
            // Stagnating - training but no weight change
            stagnatingClients.push({
              clientId: client.id,
              clientName: client.name,
              progressType: 'stagnating',
              value: trainingCount,
              detail: `${trainingCount} tréninků, ale váha stagnuje`,
            });
          }
        }

        // Check for consistency (high training frequency)
        if (trainingCount >= 8) {
          consistentClients.push({
            clientId: client.id,
            clientName: client.name,
            progressType: 'consistency',
            value: trainingCount,
            detail: `${trainingCount} tréninků tento měsíc`,
          });
        }
      });

      // Sort by value descending
      topProgressClients.sort((a, b) => b.value - a.value);
      consistentClients.sort((a, b) => b.value - a.value);

      return {
        topProgressClients: topProgressClients.slice(0, 5),
        stagnatingClients: stagnatingClients.slice(0, 5),
        consistentClients: consistentClients.slice(0, 5),
      };
    },
    staleTime: 1000 * 60 * 10,
  });
}
