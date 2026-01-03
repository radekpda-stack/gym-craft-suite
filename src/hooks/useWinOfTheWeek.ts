import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface WinOfTheWeek {
  type: 'pr' | 'milestone' | 'weight_loss' | 'consistency' | 'new_client';
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  value?: string;
  date: Date;
  icon: 'trophy' | 'medal' | 'scale' | 'flame' | 'user-plus';
}

export interface WinOfTheWeekData {
  wins: WinOfTheWeek[];
  topWin: WinOfTheWeek | null;
}

export function useWinOfTheWeek() {
  return useQuery({
    queryKey: ['win-of-the-week'],
    queryFn: async (): Promise<WinOfTheWeekData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      const wins: WinOfTheWeek[] = [];

      // 1. Check for PRs this week
      const { data: prs } = await supabase
        .from('client_prs')
        .select(`
          id,
          achieved_at,
          best_display,
          client_id,
          clients!client_prs_client_id_fkey (name)
        `)
        .gte('achieved_at', weekStart.toISOString())
        .lte('achieved_at', weekEnd.toISOString())
        .order('achieved_at', { ascending: false })
        .limit(5);

      prs?.forEach((pr: any) => {
        wins.push({
          type: 'pr',
          clientId: pr.client_id,
          clientName: pr.clients?.name || 'Klient',
          title: 'Nové osobní maximum!',
          description: `${pr.clients?.name} dosáhl/a nového PR`,
          value: pr.best_display,
          date: new Date(pr.achieved_at),
          icon: 'trophy',
        });
      });

      // 2. Check for significant weight loss this week
      const { data: measurements } = await supabase
        .from('measurements')
        .select(`
          id,
          client_id,
          weight,
          date,
          clients!measurements_client_id_fkey (name)
        `)
        .eq('user_id', user.id)
        .gte('date', weekStart.toISOString())
        .lte('date', weekEnd.toISOString())
        .order('date', { ascending: false });

      // Group by client and find significant changes
      const clientMeasurements = new Map<string, { first: number; last: number; name: string }>();
      measurements?.forEach((m: any) => {
        if (m.weight === null) return;
        const existing = clientMeasurements.get(m.client_id);
        if (!existing) {
          clientMeasurements.set(m.client_id, {
            first: m.weight,
            last: m.weight,
            name: m.clients?.name || 'Klient',
          });
        } else {
          // First measurement in week (chronologically)
          existing.first = m.weight;
        }
      });

      clientMeasurements.forEach((data, clientId) => {
        const change = data.first - data.last;
        if (change >= 0.5) {
          wins.push({
            type: 'weight_loss',
            clientId,
            clientName: data.name,
            title: 'Úbytek váhy!',
            description: `${data.name} shodil/a ${change.toFixed(1)} kg tento týden`,
            value: `-${change.toFixed(1)} kg`,
            date: now,
            icon: 'scale',
          });
        }
      });

      // 3. Check for new clients this week
      const { data: newClients } = await supabase
        .from('clients')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      newClients?.forEach(client => {
        wins.push({
          type: 'new_client',
          clientId: client.id,
          clientName: client.name,
          title: 'Nový klient!',
          description: `${client.name} se přidal/a do vašeho týmu`,
          date: new Date(client.created_at),
          icon: 'user-plus',
        });
      });

      // 4. Check for training milestones
      const { data: trainings } = await supabase
        .from('training_sessions')
        .select('client_id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', weekStart.toISOString())
        .lte('date', weekEnd.toISOString());

      // Count trainings per client this week
      const clientTrainingCounts = new Map<string, number>();
      trainings?.forEach(t => {
        clientTrainingCounts.set(t.client_id, (clientTrainingCounts.get(t.client_id) || 0) + 1);
      });

      // Find clients with 4+ trainings this week (high consistency)
      for (const [clientId, count] of clientTrainingCounts) {
        if (count >= 4) {
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', clientId)
            .single();

          if (client) {
            wins.push({
              type: 'consistency',
              clientId,
              clientName: client.name,
              title: 'Skvělá konzistence!',
              description: `${client.name} absolvoval/a ${count} tréninků tento týden`,
              value: `${count} tréninků`,
              date: now,
              icon: 'flame',
            });
          }
        }
      }

      // Sort by date descending and importance
      wins.sort((a, b) => {
        // PRs first, then weight loss, then consistency, then new clients
        const priority = { pr: 4, weight_loss: 3, consistency: 2, new_client: 1, milestone: 0 };
        const priorityDiff = (priority[b.type] || 0) - (priority[a.type] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return b.date.getTime() - a.date.getTime();
      });

      return {
        wins: wins.slice(0, 10),
        topWin: wins.length > 0 ? wins[0] : null,
      };
    },
    staleTime: 1000 * 60 * 10,
  });
}
