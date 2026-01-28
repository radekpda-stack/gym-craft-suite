import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, subDays, format } from 'date-fns';

export interface PerformanceOverview {
  totalExercises: number;
  totalEntriesThisMonth: number;
  totalPRsThisMonth: number;
  categories: {
    strength: { count: number; entries: number };
    cardio: { count: number; entries: number };
    plyometric: { count: number; entries: number };
  };
  topClients: {
    id: string;
    name: string;
    entriesCount: number;
    prCount: number;
    trend: number;
  }[];
  recentExercises: {
    id: string;
    name: string;
    category: 'strength' | 'cardio' | 'plyometric';
    lastUsed: string;
  }[];
}

// Mapping exercise types to our three main categories
// Primary source: exercise_type_v2 field (strength, cardio, plyometric)
function mapToMainCategory(exerciseType: string | null): 'strength' | 'cardio' | 'plyometric' {
  const type = (exerciseType || '').toLowerCase();
  
  if (type === 'plyometric') {
    return 'plyometric';
  }
  if (type === 'cardio') {
    return 'cardio';
  }
  return 'strength';
}

export function usePerformanceOverview() {
  const { user } = useAuth();
  const thisMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['performance-overview', user?.id, thisMonthStart],
    queryFn: async (): Promise<PerformanceOverview> => {
      if (!user?.id) {
        return {
          totalExercises: 0,
          totalEntriesThisMonth: 0,
          totalPRsThisMonth: 0,
          categories: {
            strength: { count: 0, entries: 0 },
            cardio: { count: 0, entries: 0 },
            plyometric: { count: 0, entries: 0 },
          },
          topClients: [],
          recentExercises: [],
        };
      }

      // Fetch all data in parallel
      const [
        exercisesResult,
        entriesThisMonthResult,
        prsThisMonthResult,
        allEntriesLast30Result,
        allEntriesPrev30Result,
        recentExercisesResult,
        clientsResult,
      ] = await Promise.all([
        // Total exercises (non-archived)
        supabase
          .from('exercises')
          .select('id, category, exercise_type_v2')
          .eq('is_archived', false)
          // Include both trainer-owned and system/shared exercises
          .or(`user_id.eq.${user.id},source.eq.system`),
        
        // Entries this month
        supabase
          .from('exercise_entries')
          .select('id, exercise_id')
          .eq('user_id', user.id)
          .gte('date', thisMonthStart),
        
        // PRs this month
        supabase
          .from('exercise_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_pr', true)
          .gte('date', thisMonthStart),
        
        // All entries last 30 days (for top clients)
        supabase
          .from('exercise_entries')
          .select('client_id, is_pr')
          .eq('user_id', user.id)
          .gte('date', thirtyDaysAgo),
        
        // All entries previous 30 days (for trend calculation)
        supabase
          .from('exercise_entries')
          .select('client_id')
          .eq('user_id', user.id)
          .gte('date', sixtyDaysAgo)
          .lt('date', thirtyDaysAgo),
        
        // Recent exercises used
        supabase
          .from('exercise_entries')
          .select('exercise_id, exercise_name, date, exercises!inner(id, category, exercise_type_v2)')
          .eq('user_id', user.id)
          .not('exercise_id', 'is', null)
          .order('date', { ascending: false })
          .limit(50),
        
        // Clients for name lookup
        supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', user.id),
      ]);

      // Process exercises by category
      const exercises = exercisesResult.data || [];
      const categories = {
        strength: { count: 0, entries: 0 },
        cardio: { count: 0, entries: 0 },
        plyometric: { count: 0, entries: 0 },
      };

      const exerciseCategoryMap = new Map<string, 'strength' | 'cardio' | 'plyometric'>();
      
      exercises.forEach((ex) => {
        const mainCat = mapToMainCategory(ex.exercise_type_v2);
        categories[mainCat].count++;
        exerciseCategoryMap.set(ex.id, mainCat);
      });

      // Count entries per category
      const entriesThisMonth = entriesThisMonthResult.data || [];
      entriesThisMonth.forEach((entry) => {
        if (entry.exercise_id) {
          const cat = exerciseCategoryMap.get(entry.exercise_id) || 'strength';
          categories[cat].entries++;
        }
      });

      // Process top clients
      const clientNameMap = new Map<string, string>();
      (clientsResult.data || []).forEach((c) => {
        clientNameMap.set(c.id, c.name);
      });

      const clientStats = new Map<string, { entries: number; prs: number }>();
      (allEntriesLast30Result.data || []).forEach((entry) => {
        if (!clientStats.has(entry.client_id)) {
          clientStats.set(entry.client_id, { entries: 0, prs: 0 });
        }
        const stats = clientStats.get(entry.client_id)!;
        stats.entries++;
        if (entry.is_pr) stats.prs++;
      });

      // Calculate previous period stats for trend
      const prevClientStats = new Map<string, number>();
      (allEntriesPrev30Result.data || []).forEach((entry) => {
        prevClientStats.set(entry.client_id, (prevClientStats.get(entry.client_id) || 0) + 1);
      });

      // Build top clients array
      const topClients = Array.from(clientStats.entries())
        .map(([clientId, stats]) => {
          const prevEntries = prevClientStats.get(clientId) || 0;
          const trend = prevEntries > 0
            ? Math.round(((stats.entries - prevEntries) / prevEntries) * 100)
            : (stats.entries > 0 ? 100 : 0);
          
          return {
            id: clientId,
            name: clientNameMap.get(clientId) || 'Neznámý klient',
            entriesCount: stats.entries,
            prCount: stats.prs,
            trend,
          };
        })
        .sort((a, b) => b.entriesCount - a.entriesCount)
        .slice(0, 5);

      // Process recent exercises (deduplicated)
      const seenExercises = new Set<string>();
      const recentExercises: PerformanceOverview['recentExercises'] = [];
      
      (recentExercisesResult.data || []).forEach((entry) => {
        if (entry.exercise_id && !seenExercises.has(entry.exercise_id) && recentExercises.length < 8) {
          seenExercises.add(entry.exercise_id);
          const exerciseData = entry.exercises as any;
          recentExercises.push({
            id: entry.exercise_id,
            name: entry.exercise_name,
            category: mapToMainCategory(exerciseData?.exercise_type_v2),
            lastUsed: entry.date,
          });
        }
      });

      return {
        totalExercises: exercises.length,
        totalEntriesThisMonth: entriesThisMonth.length,
        totalPRsThisMonth: prsThisMonthResult.data?.length || 0,
        categories,
        topClients,
        recentExercises,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
