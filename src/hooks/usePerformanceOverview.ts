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
        // Strength entries
        strengthEntriesThisMonthResult,
        strengthPrsThisMonthResult,
        strengthEntriesLast30Result,
        strengthEntriesPrev30Result,
        // Cardio entries
        cardioEntriesThisMonthResult,
        cardioPrsThisMonthResult,
        cardioEntriesLast30Result,
        cardioEntriesPrev30Result,
        // Skill/Plyometric entries
        skillEntriesThisMonthResult,
        skillBreakthroughsThisMonthResult,
        skillEntriesLast30Result,
        skillEntriesPrev30Result,
        // Recent exercises
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
        
        // Strength entries this month
        supabase
          .from('exercise_entries')
          .select('id, exercise_id')
          .eq('user_id', user.id)
          .gte('date', thisMonthStart),
        
        // Strength PRs this month
        supabase
          .from('exercise_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_pr', true)
          .gte('date', thisMonthStart),
        
        // Strength entries last 30 days (for top clients)
        supabase
          .from('exercise_entries')
          .select('client_id, is_pr')
          .eq('user_id', user.id)
          .gte('date', thirtyDaysAgo),
        
        // Strength entries previous 30 days (for trend calculation)
        supabase
          .from('exercise_entries')
          .select('client_id')
          .eq('user_id', user.id)
          .gte('date', sixtyDaysAgo)
          .lt('date', thirtyDaysAgo),
        
        // Cardio entries this month
        supabase
          .from('cardio_entries')
          .select('id, exercise_id')
          .eq('user_id', user.id)
          .gte('date', thisMonthStart),
        
        // Cardio PRs this month
        supabase
          .from('cardio_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_pr', true)
          .gte('date', thisMonthStart),
        
        // Cardio entries last 30 days
        supabase
          .from('cardio_entries')
          .select('client_id, is_pr')
          .eq('user_id', user.id)
          .gte('date', thirtyDaysAgo),
        
        // Cardio entries previous 30 days
        supabase
          .from('cardio_entries')
          .select('client_id')
          .eq('user_id', user.id)
          .gte('date', sixtyDaysAgo)
          .lt('date', thirtyDaysAgo),
        
        // Skill/Plyometric entries this month
        supabase
          .from('skill_entries')
          .select('id, exercise_id')
          .eq('user_id', user.id)
          .gte('date', thisMonthStart),
        
        // Skill breakthroughs this month (equivalent to PR)
        supabase
          .from('skill_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_breakthrough', true)
          .gte('date', thisMonthStart),
        
        // Skill entries last 30 days
        supabase
          .from('skill_entries')
          .select('client_id, is_breakthrough')
          .eq('user_id', user.id)
          .gte('date', thirtyDaysAgo),
        
        // Skill entries previous 30 days
        supabase
          .from('skill_entries')
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

      // Count strength entries per category
      const strengthEntriesThisMonth = strengthEntriesThisMonthResult.data || [];
      strengthEntriesThisMonth.forEach((entry) => {
        if (entry.exercise_id) {
          const cat = exerciseCategoryMap.get(entry.exercise_id) || 'strength';
          categories[cat].entries++;
        }
      });

      // Count cardio entries - all go to cardio category
      const cardioEntriesThisMonth = cardioEntriesThisMonthResult.data || [];
      categories.cardio.entries += cardioEntriesThisMonth.length;

      // Count skill/plyometric entries - all go to plyometric category
      const skillEntriesThisMonth = skillEntriesThisMonthResult.data || [];
      categories.plyometric.entries += skillEntriesThisMonth.length;

      // Calculate total entries and PRs across all tables
      const totalEntriesThisMonth = 
        strengthEntriesThisMonth.length + 
        cardioEntriesThisMonth.length + 
        skillEntriesThisMonth.length;
      
      const totalPRsThisMonth = 
        (strengthPrsThisMonthResult.data?.length || 0) + 
        (cardioPrsThisMonthResult.data?.length || 0) + 
        (skillBreakthroughsThisMonthResult.data?.length || 0);

      // Process top clients
      const clientNameMap = new Map<string, string>();
      (clientsResult.data || []).forEach((c) => {
        clientNameMap.set(c.id, c.name);
      });

      const clientStats = new Map<string, { entries: number; prs: number }>();
      
      // Add strength entries
      (strengthEntriesLast30Result.data || []).forEach((entry) => {
        if (!clientStats.has(entry.client_id)) {
          clientStats.set(entry.client_id, { entries: 0, prs: 0 });
        }
        const stats = clientStats.get(entry.client_id)!;
        stats.entries++;
        if (entry.is_pr) stats.prs++;
      });
      
      // Add cardio entries
      (cardioEntriesLast30Result.data || []).forEach((entry) => {
        if (!clientStats.has(entry.client_id)) {
          clientStats.set(entry.client_id, { entries: 0, prs: 0 });
        }
        const stats = clientStats.get(entry.client_id)!;
        stats.entries++;
        if (entry.is_pr) stats.prs++;
      });
      
      // Add skill entries
      (skillEntriesLast30Result.data || []).forEach((entry) => {
        if (!clientStats.has(entry.client_id)) {
          clientStats.set(entry.client_id, { entries: 0, prs: 0 });
        }
        const stats = clientStats.get(entry.client_id)!;
        stats.entries++;
        if (entry.is_breakthrough) stats.prs++;
      });

      // Calculate previous period stats for trend
      const prevClientStats = new Map<string, number>();
      
      // Add strength entries from previous period
      (strengthEntriesPrev30Result.data || []).forEach((entry) => {
        prevClientStats.set(entry.client_id, (prevClientStats.get(entry.client_id) || 0) + 1);
      });
      
      // Add cardio entries from previous period
      (cardioEntriesPrev30Result.data || []).forEach((entry) => {
        prevClientStats.set(entry.client_id, (prevClientStats.get(entry.client_id) || 0) + 1);
      });
      
      // Add skill entries from previous period
      (skillEntriesPrev30Result.data || []).forEach((entry) => {
        prevClientStats.set(entry.client_id, (prevClientStats.get(entry.client_id) || 0) + 1);
      });

      // Build top clients array
      // Helper: cap trend to reasonable range (-99% to +99%)
      const safeTrend = (current: number, previous: number): number => {
        if (previous === 0) {
          return current > 0 ? 99 : 0; // New client with activity = +99% max
        }
        const rawTrend = Math.round(((current - previous) / previous) * 100);
        return Math.max(-99, Math.min(99, rawTrend)); // Cap between -99% and +99%
      };

      const topClients = Array.from(clientStats.entries())
        .map(([clientId, stats]) => {
          const prevEntries = prevClientStats.get(clientId) || 0;
          const trend = safeTrend(stats.entries, prevEntries);
          
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
        totalEntriesThisMonth,
        totalPRsThisMonth,
        categories,
        topClients,
        recentExercises,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
