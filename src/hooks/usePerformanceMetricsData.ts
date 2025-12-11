import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subMonths, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { PerformancePeriod } from '@/components/dashboard/PerformanceMetricsSection';

interface TopExercise {
  id: string;
  name: string;
  frequency: number;
  lastPR?: number;
  lastPRDate?: string;
  volume: number;
  topClients: string[];
}

interface PersonalRecord {
  id: string;
  exerciseName: string;
  weight: number;
  reps: number;
  clientName: string;
  date: string;
}

interface StrengthDataPoint {
  label: string;
  [exerciseName: string]: number | string;
}

export function usePerformanceMetricsData(period: PerformancePeriod) {
  return useQuery({
    queryKey: ['performance-metrics-data', period],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date | null = null;

      switch (period) {
        case '30days':
          startDate = subDays(now, 30);
          break;
        case '6months':
          startDate = subMonths(now, 6);
          break;
        case '12months':
          startDate = subMonths(now, 12);
          break;
        case 'all':
          startDate = null;
          break;
      }

      // Fetch exercise entries
      let query = supabase
        .from('exercise_entries')
        .select('id, exercise_name, exercise_id, weight_kg, reps, sets, is_pr, date, client_id, clients(name)')
        .order('date', { ascending: true });

      if (startDate) {
        query = query.gte('date', startDate.toISOString().split('T')[0]);
      }

      const { data: entries } = await query;

      // Process top exercises
      const exerciseMap = new Map<
        string,
        {
          id: string;
          name: string;
          frequency: number;
          maxWeight: number;
          maxWeightDate?: string;
          totalVolume: number;
          clients: Set<string>;
        }
      >();

      const personalRecords: PersonalRecord[] = [];
      const strengthByMonth = new Map<string, Map<string, number>>();

      entries?.forEach((e: any) => {
        const name = e.exercise_name;
        const id = e.exercise_id || name;

        // Track exercise stats
        if (!exerciseMap.has(name)) {
          exerciseMap.set(name, {
            id,
            name,
            frequency: 0,
            maxWeight: 0,
            totalVolume: 0,
            clients: new Set(),
          });
        }

        const stats = exerciseMap.get(name)!;
        stats.frequency += 1;
        
        const weight = e.weight_kg || 0;
        const volume = weight * (e.reps || 1) * (e.sets || 1);
        stats.totalVolume += volume;

        if (weight > stats.maxWeight) {
          stats.maxWeight = weight;
          stats.maxWeightDate = e.date;
        }

        if (e.clients?.name) {
          stats.clients.add(e.clients.name);
        }

        // Track PRs
        if (e.is_pr && weight > 0) {
          personalRecords.push({
            id: e.id,
            exerciseName: name,
            weight,
            reps: e.reps || 1,
            clientName: e.clients?.name || 'Neznámý',
            date: e.date,
          });
        }

        // Track strength by month (for top exercises)
        const monthKey = format(new Date(e.date), 'MMM', { locale: cs });
        if (!strengthByMonth.has(monthKey)) {
          strengthByMonth.set(monthKey, new Map());
        }
        const monthData = strengthByMonth.get(monthKey)!;
        const currentMax = monthData.get(name) || 0;
        if (weight > currentMax) {
          monthData.set(name, weight);
        }
      });

      // Convert to arrays
      const topExercises: TopExercise[] = [];
      exerciseMap.forEach((stats) => {
        topExercises.push({
          id: stats.id,
          name: stats.name,
          frequency: stats.frequency,
          lastPR: stats.maxWeight > 0 ? stats.maxWeight : undefined,
          lastPRDate: stats.maxWeightDate,
          volume: stats.totalVolume,
          topClients: Array.from(stats.clients).slice(0, 3),
        });
      });
      topExercises.sort((a, b) => b.frequency - a.frequency);

      // Sort PRs by weight
      personalRecords.sort((a, b) => b.weight - a.weight);

      // Get top 3 exercises for strength chart
      const top3Exercises = topExercises.slice(0, 3).map((e) => e.name);

      // Build strength data for chart
      const strengthData: StrengthDataPoint[] = [];
      strengthByMonth.forEach((exerciseData, label) => {
        const point: StrengthDataPoint = { label };
        top3Exercises.forEach((exercise) => {
          point[exercise] = exerciseData.get(exercise) || 0;
        });
        strengthData.push(point);
      });

      return {
        topExercises: topExercises.slice(0, 10),
        personalRecords: personalRecords.slice(0, 10),
        strengthData,
        top3Exercises,
      };
    },
  });
}
