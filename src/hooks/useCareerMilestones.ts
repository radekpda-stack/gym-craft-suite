import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface CareerMilestone {
  id: string;
  type: 'trainings' | 'clients' | 'income' | 'hours';
  value: number;
  label: string;
  reachedAt: string | null;
  isReached: boolean;
}

export interface CareerMilestonesData {
  milestones: CareerMilestone[];
  nextMilestone: CareerMilestone | null;
  currentStats: {
    trainings: number;
    clients: number;
    income: number;
    hours: number;
  };
  firstTrainingDate: string | null;
}

const TRAINING_MILESTONES = [50, 100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000];
const CLIENT_MILESTONES = [10, 25, 50, 100, 150, 200];
const INCOME_MILESTONES = [100000, 250000, 500000, 1000000, 2000000, 5000000];
const HOUR_MILESTONES = [100, 250, 500, 1000, 2000, 5000];

export function useCareerMilestones() {
  return useQuery({
    queryKey: ['career-milestones'],
    queryFn: async (): Promise<CareerMilestonesData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch aggregated data
      const [trainingsResult, clientsResult, incomeResult] = await Promise.all([
        // All completed trainings with dates and duration
        supabase
          .from('training_sessions')
          .select('id, date, duration')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('date', { ascending: true }),
        
        // All unique clients
        supabase
          .from('clients')
          .select('id, created_at')
          .eq('user_id', user.id)
          .eq('is_system', false)
          .order('created_at', { ascending: true }),
        
        // Total income from transactions
        supabase
          .from('credit_transactions')
          .select('amount, type, created_at')
          .eq('user_id', user.id)
          .in('type', ['training', 'canceled_training', 'product'])
          .order('created_at', { ascending: true }),
      ]);

      const trainings = trainingsResult.data || [];
      const clients = clientsResult.data || [];
      const transactions = incomeResult.data || [];

      // Current totals
      const totalTrainings = trainings.length;
      const totalClients = clients.length;
      const totalIncome = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalMinutes = trainings.reduce((sum, t) => sum + (t.duration || 60), 0);
      const totalHours = Math.round(totalMinutes / 60);

      const firstTrainingDate = trainings[0]?.date || null;

      // Helper to find when milestone was reached
      const findMilestoneDate = (
        data: { date?: string; created_at?: string }[],
        threshold: number,
        getValue: (items: typeof data) => number = (items) => items.length
      ): string | null => {
        for (let i = 0; i < data.length; i++) {
          const subset = data.slice(0, i + 1);
          if (getValue(subset) >= threshold) {
            return data[i].date || data[i].created_at || null;
          }
        }
        return null;
      };

      // Build milestones
      const milestones: CareerMilestone[] = [];

      // Training milestones
      TRAINING_MILESTONES.forEach(value => {
        const reachedAt = findMilestoneDate(trainings, value);
        milestones.push({
          id: `trainings-${value}`,
          type: 'trainings',
          value,
          label: `${value} tréninků`,
          reachedAt: reachedAt ? format(new Date(reachedAt), 'yyyy-MM') : null,
          isReached: totalTrainings >= value,
        });
      });

      // Client milestones
      CLIENT_MILESTONES.forEach(value => {
        const reachedAt = findMilestoneDate(clients, value);
        milestones.push({
          id: `clients-${value}`,
          type: 'clients',
          value,
          label: `${value} klientů`,
          reachedAt: reachedAt ? format(new Date(reachedAt), 'yyyy-MM') : null,
          isReached: totalClients >= value,
        });
      });

      // Income milestones (cumulative)
      let cumulativeIncome = 0;
      const incomeWithCumulative = transactions.map(t => {
        cumulativeIncome += Math.abs(t.amount);
        return { ...t, cumulative: cumulativeIncome };
      });

      INCOME_MILESTONES.forEach(value => {
        const found = incomeWithCumulative.find(t => t.cumulative >= value);
        milestones.push({
          id: `income-${value}`,
          type: 'income',
          value,
          label: `${(value / 1000).toLocaleString('cs-CZ')}k Kč příjem`,
          reachedAt: found ? format(new Date(found.created_at), 'yyyy-MM') : null,
          isReached: totalIncome >= value,
        });
      });

      // Hour milestones
      let cumulativeMinutes = 0;
      const trainingsWithHours = trainings.map(t => {
        cumulativeMinutes += t.duration || 60;
        return { ...t, cumulativeHours: Math.round(cumulativeMinutes / 60) };
      });

      HOUR_MILESTONES.forEach(value => {
        const found = trainingsWithHours.find(t => t.cumulativeHours >= value);
        milestones.push({
          id: `hours-${value}`,
          type: 'hours',
          value,
          label: `${value} hodin`,
          reachedAt: found ? format(new Date(found.date), 'yyyy-MM') : null,
          isReached: totalHours >= value,
        });
      });

      // Sort by reached status and value
      milestones.sort((a, b) => {
        if (a.isReached !== b.isReached) return a.isReached ? -1 : 1;
        return a.value - b.value;
      });

      // Find next milestone
      const nextMilestone = milestones.find(m => !m.isReached) || null;

      return {
        milestones,
        nextMilestone,
        currentStats: {
          trainings: totalTrainings,
          clients: totalClients,
          income: totalIncome,
          hours: totalHours,
        },
        firstTrainingDate,
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - career stats don't change often
  });
}
