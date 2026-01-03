import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, format, isWeekend, subDays } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface CapacitySlot {
  date: Date;
  dayName: string;
  availableSlots: number;
  bookedSlots: number;
  maxSlots: number;
}

export interface InactiveClient {
  id: string;
  name: string;
  daysSinceLastTraining: number;
  totalTrainings: number;
}

export interface CapacityAlertsData {
  thisWeek: {
    totalAvailable: number;
    totalBooked: number;
    utilizationPercent: number;
    slots: CapacitySlot[];
  };
  nextWeek: {
    totalAvailable: number;
    totalBooked: number;
    utilizationPercent: number;
    slots: CapacitySlot[];
  };
  inactiveClients: InactiveClient[];
  suggestions: string[];
}

const MAX_SLOTS_PER_DAY = 8; // Configurable

export function useCapacityAlerts() {
  return useQuery({
    queryKey: ['capacity-alerts'],
    queryFn: async (): Promise<CapacityAlertsData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const nextWeekStart = addWeeks(thisWeekStart, 1);
      const nextWeekEnd = addWeeks(thisWeekEnd, 1);
      const thirtyDaysAgo = subDays(now, 30);
      const sixtyDaysAgo = subDays(now, 60);

      // Get trainings for both weeks
      const [thisWeekResult, nextWeekResult, inactiveResult, recentTrainingsResult] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('id, date, status')
          .eq('user_id', user.id)
          .gte('date', thisWeekStart.toISOString())
          .lte('date', thisWeekEnd.toISOString())
          .in('status', ['scheduled', 'completed']),
        supabase
          .from('training_sessions')
          .select('id, date, status')
          .eq('user_id', user.id)
          .gte('date', nextWeekStart.toISOString())
          .lte('date', nextWeekEnd.toISOString())
          .in('status', ['scheduled', 'completed']),
        // Clients with no trainings in last 30 days but had trainings before
        supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('is_archived', false),
        // Recent trainings to find inactive clients
        supabase
          .from('training_sessions')
          .select('client_id, date')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', sixtyDaysAgo.toISOString()),
      ]);

      const thisWeekTrainings = thisWeekResult.data || [];
      const nextWeekTrainings = nextWeekResult.data || [];
      const allClients = inactiveResult.data || [];
      const recentTrainings = recentTrainingsResult.data || [];

      // Helper to calculate slots for a week
      const calculateWeekSlots = (weekStart: Date, weekEnd: Date, trainings: any[]): CapacitySlot[] => {
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        return days
          .filter(day => !isWeekend(day))
          .map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayTrainings = trainings.filter(t => 
              format(new Date(t.date), 'yyyy-MM-dd') === dayStr
            );
            
            return {
              date: day,
              dayName: format(day, 'EEEE', { locale: cs }),
              availableSlots: Math.max(0, MAX_SLOTS_PER_DAY - dayTrainings.length),
              bookedSlots: dayTrainings.length,
              maxSlots: MAX_SLOTS_PER_DAY,
            };
          });
      };

      const thisWeekSlots = calculateWeekSlots(thisWeekStart, thisWeekEnd, thisWeekTrainings);
      const nextWeekSlots = calculateWeekSlots(nextWeekStart, nextWeekEnd, nextWeekTrainings);

      const calcTotals = (slots: CapacitySlot[]) => {
        const totalAvailable = slots.reduce((sum, s) => sum + s.availableSlots, 0);
        const totalBooked = slots.reduce((sum, s) => sum + s.bookedSlots, 0);
        const maxTotal = slots.reduce((sum, s) => sum + s.maxSlots, 0);
        return {
          totalAvailable,
          totalBooked,
          utilizationPercent: maxTotal > 0 ? Math.round((totalBooked / maxTotal) * 100) : 0,
        };
      };

      // Find inactive clients
      const lastTrainingByClient = new Map<string, Date>();
      const trainingCountByClient = new Map<string, number>();
      
      recentTrainings.forEach(t => {
        const current = lastTrainingByClient.get(t.client_id);
        const tDate = new Date(t.date);
        if (!current || tDate > current) {
          lastTrainingByClient.set(t.client_id, tDate);
        }
        trainingCountByClient.set(t.client_id, (trainingCountByClient.get(t.client_id) || 0) + 1);
      });

      const inactiveClients: InactiveClient[] = [];
      allClients.forEach(client => {
        const lastTraining = lastTrainingByClient.get(client.id);
        if (lastTraining && lastTraining < thirtyDaysAgo) {
          const daysSince = Math.floor((now.getTime() - lastTraining.getTime()) / (1000 * 60 * 60 * 24));
          inactiveClients.push({
            id: client.id,
            name: client.name,
            daysSinceLastTraining: daysSince,
            totalTrainings: trainingCountByClient.get(client.id) || 0,
          });
        }
      });

      inactiveClients.sort((a, b) => a.daysSinceLastTraining - b.daysSinceLastTraining);

      // Generate suggestions
      const suggestions: string[] = [];
      const thisWeekTotals = calcTotals(thisWeekSlots);
      const nextWeekTotals = calcTotals(nextWeekSlots);

      if (thisWeekTotals.totalAvailable > 5) {
        suggestions.push(`Máš ${thisWeekTotals.totalAvailable} volných slotů tento týden.`);
      }
      if (nextWeekTotals.totalAvailable > 10) {
        suggestions.push(`Příští týden máš ${nextWeekTotals.totalAvailable} volných slotů.`);
      }
      if (inactiveClients.length > 0) {
        suggestions.push(`${inactiveClients.length} klientů nebylo na tréninku více než 30 dní.`);
      }
      if (thisWeekTotals.utilizationPercent > 90) {
        suggestions.push('Tento týden jsi téměř plně obsazený!');
      }

      return {
        thisWeek: {
          ...thisWeekTotals,
          slots: thisWeekSlots,
        },
        nextWeek: {
          ...nextWeekTotals,
          slots: nextWeekSlots,
        },
        inactiveClients: inactiveClients.slice(0, 10),
        suggestions,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
