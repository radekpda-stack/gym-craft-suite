import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, format } from 'date-fns';

export interface PerformanceOverview {
  totalExercises: number;
  totalEntries: number;
  totalPRs: number;
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
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['performance-overview', user?.id],
    queryFn: async (): Promise<PerformanceOverview> => {
      if (!user?.id) {
        return {
          totalExercises: 0,
          totalEntries: 0,
          totalPRs: 0,
          categories: {
            strength: { count: 0, entries: 0 },
            cardio: { count: 0, entries: 0 },
            plyometric: { count: 0, entries: 0 },
          },
          topClients: [],
          recentExercises: [],
        };
      }

      // First fetch clients to get their IDs for filtering
      const clientsResult = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id);

      const clients = clientsResult.data || [];
      const clientIds = clients.map(c => c.id);

      // If trainer has no clients, return empty data
      if (clientIds.length === 0) {
        // Still fetch exercises for count
        const exercisesResult = await supabase
          .from('exercises')
          .select('id, name, category, exercise_type_v2')
          .eq('is_archived', false)
          .or(`user_id.eq.${user.id},source.eq.system`);

        const exercises = exercisesResult.data || [];
        const categories = {
          strength: { count: 0, entries: 0 },
          cardio: { count: 0, entries: 0 },
          plyometric: { count: 0, entries: 0 },
        };

        exercises.forEach((ex) => {
          const mainCat = mapToMainCategory(ex.exercise_type_v2);
          categories[mainCat].count++;
        });

        return {
          totalExercises: exercises.length,
          totalEntries: 0,
          totalPRs: 0,
          categories,
          topClients: [],
          recentExercises: [],
        };
      }

      // Fetch all data in parallel
      const [
        exercisesResult,
        // All strength entries (for category mapping)
        allStrengthEntriesResult,
        strengthEntriesLast30Result,
        strengthEntriesPrev30Result,
        // All cardio entries
        allCardioEntriesResult,
        cardioEntriesLast30Result,
        cardioEntriesPrev30Result,
        // All skill/Plyometric entries
        allSkillEntriesResult,
        skillEntriesLast30Result,
        skillEntriesPrev30Result,
        // Recent exercises
        recentExercisesResult,
      ] = await Promise.all([
        // Total exercises (non-archived) with name for mapping
        supabase
          .from('exercises')
          .select('id, name, category, exercise_type_v2')
          .eq('is_archived', false)
          .or(`user_id.eq.${user.id},source.eq.system`),
        
        // All strength entries (filter by trainer's clients)
        supabase
          .from('exercise_entries')
          .select('id, exercise_id, exercise_name, is_pr, client_id')
          .in('client_id', clientIds),
        
        // Strength entries last 30 days (for top clients trend)
        supabase
          .from('exercise_entries')
          .select('client_id, is_pr')
          .in('client_id', clientIds)
          .gte('date', thirtyDaysAgo),
        
        // Strength entries previous 30 days (for trend calculation)
        supabase
          .from('exercise_entries')
          .select('client_id')
          .in('client_id', clientIds)
          .gte('date', sixtyDaysAgo)
          .lt('date', thirtyDaysAgo),
        
        // All cardio entries (filter by trainer's clients)
        supabase
          .from('cardio_entries')
          .select('id, exercise_id, exercise_name, is_pr, client_id')
          .in('client_id', clientIds),
        
        // Cardio entries last 30 days
        supabase
          .from('cardio_entries')
          .select('client_id, is_pr')
          .in('client_id', clientIds)
          .gte('date', thirtyDaysAgo),
        
        // Cardio entries previous 30 days
        supabase
          .from('cardio_entries')
          .select('client_id')
          .in('client_id', clientIds)
          .gte('date', sixtyDaysAgo)
          .lt('date', thirtyDaysAgo),
        
        // All skill/Plyometric entries (filter by trainer's clients)
        supabase
          .from('skill_entries')
          .select('id, exercise_id, exercise_name, is_breakthrough, client_id')
          .in('client_id', clientIds),
        
        // Skill entries last 30 days
        supabase
          .from('skill_entries')
          .select('client_id, is_breakthrough')
          .in('client_id', clientIds)
          .gte('date', thirtyDaysAgo),
        
        // Skill entries previous 30 days
        supabase
          .from('skill_entries')
          .select('client_id')
          .in('client_id', clientIds)
          .gte('date', sixtyDaysAgo)
          .lt('date', thirtyDaysAgo),
        
        // Recent exercises used
        supabase
          .from('exercise_entries')
          .select('exercise_id, exercise_name, date, exercises!inner(id, category, exercise_type_v2)')
          .in('client_id', clientIds)
          .not('exercise_id', 'is', null)
          .order('date', { ascending: false })
          .limit(50),
      ]);

      // Build exercise category maps
      const exercises = exercisesResult.data || [];
      const categories = {
        strength: { count: 0, entries: 0 },
        cardio: { count: 0, entries: 0 },
        plyometric: { count: 0, entries: 0 },
      };

      const exerciseCategoryMap = new Map<string, 'strength' | 'cardio' | 'plyometric'>();
      const exerciseNameCategoryMap = new Map<string, 'strength' | 'cardio' | 'plyometric'>();
      
      exercises.forEach((ex) => {
        const mainCat = mapToMainCategory(ex.exercise_type_v2);
        categories[mainCat].count++;
        exerciseCategoryMap.set(ex.id, mainCat);
        // Also map by normalized name for fallback
        if (ex.name) {
          exerciseNameCategoryMap.set(ex.name.trim().toLowerCase(), mainCat);
        }
      });

      // Helper to get category for an entry
      const getCategoryForEntry = (
        exerciseId: string | null,
        exerciseName: string | null,
        defaultCat: 'strength' | 'cardio' | 'plyometric' = 'strength'
      ): 'strength' | 'cardio' | 'plyometric' => {
        if (exerciseId) {
          const cat = exerciseCategoryMap.get(exerciseId);
          if (cat) return cat;
        }
        if (exerciseName) {
          const normalizedName = exerciseName.trim().toLowerCase();
          const cat = exerciseNameCategoryMap.get(normalizedName);
          if (cat) return cat;
        }
        return defaultCat;
      };

      // Count all strength entries per category (mapped by exercise_type_v2)
      const allStrengthEntries = allStrengthEntriesResult.data || [];
      let totalPRs = 0;
      
      allStrengthEntries.forEach((entry) => {
        const cat = getCategoryForEntry(entry.exercise_id, entry.exercise_name, 'strength');
        categories[cat].entries++;
        if (entry.is_pr) totalPRs++;
      });

      // Count all cardio entries (map to category, default cardio)
      const allCardioEntries = allCardioEntriesResult.data || [];
      allCardioEntries.forEach((entry) => {
        const cat = getCategoryForEntry(entry.exercise_id, entry.exercise_name, 'cardio');
        categories[cat].entries++;
        if (entry.is_pr) totalPRs++;
      });

      // Count all skill/plyometric entries (map to category, default plyometric)
      const allSkillEntries = allSkillEntriesResult.data || [];
      allSkillEntries.forEach((entry) => {
        const cat = getCategoryForEntry(entry.exercise_id, entry.exercise_name, 'plyometric');
        categories[cat].entries++;
        if (entry.is_breakthrough) totalPRs++;
      });

      // Calculate total entries across all tables
      const totalEntries = 
        allStrengthEntries.length + 
        allCardioEntries.length + 
        allSkillEntries.length;
      
      // Process top clients
      const clientNameMap = new Map<string, string>();
      clients.forEach((c) => {
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
        ;

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
        totalEntries,
        totalPRs,
        categories,
        topClients,
        recentExercises,
      };
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });
}
