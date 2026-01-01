import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { format, startOfMonth, endOfMonth, startOfWeek, subWeeks, parseISO, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';

// Types
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string | null;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  icon_key: string;
  style: string;
  rule_type: 'milestone_total' | 'streak_weeks' | 'type_count' | 'special' | 'seasonal' | 'holiday';
  rule_value: Record<string, any>;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  display_order: number;
}

export interface ClientBadge {
  id: string;
  client_id: string;
  badge_id: string;
  earned_at: string | null;
  progress_current: number;
  progress_target: number;
  badge_definitions?: BadgeDefinition;
}

export interface ClientConfirmedWorkout {
  id: string;
  client_id: string;
  performed_at: string;
  performed_date: string;
  workout_type: string | null;
  confirmed_by: 'coach' | 'client';
  xp: number;
  training_session_id: string | null;
  notes: string | null;
}

export interface LeaderboardEntry {
  client_id: string;
  nickname: string;
  xp: number;
  workout_count: number;
  is_verified: boolean;
  rank: number;
}

export interface GamificationStats {
  totalWorkouts: number;
  monthlyWorkouts: number;
  monthlyXP: number;
  currentStreak: number;
  bestStreak: number;
}

// Helper: Get Monday-start week number
function getWeekNumber(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return format(start, 'yyyy-ww');
}

// Calculate streak from workout dates
function calculateStreak(workouts: { performed_at: string }[]): number {
  if (!workouts.length) return 0;
  
  const weeks = new Set<string>();
  workouts.forEach(w => {
    weeks.add(getWeekNumber(parseISO(w.performed_at)));
  });
  
  let streak = 0;
  let currentWeek = new Date();
  
  // Check backwards from current week
  for (let i = 0; i < 52; i++) {
    const weekKey = getWeekNumber(subWeeks(currentWeek, i));
    if (weeks.has(weekKey)) {
      streak++;
    } else if (i > 0) {
      // Allow current week to be empty
      break;
    }
  }
  
  return streak;
}

// Fetch all badge definitions
export function useBadgeDefinitions() {
  return useQuery({
    queryKey: ['badge-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_definitions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as BadgeDefinition[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// Fetch client's badges with progress
export function useClientBadges(clientId?: string) {
  return useQuery({
    queryKey: ['client-badges', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_badges')
        .select(`
          *,
          badge_definitions (*)
        `)
        .eq('client_id', clientId);
      
      if (error) throw error;
      return data as ClientBadge[];
    },
    enabled: !!clientId,
  });
}

// Fetch client's confirmed workouts
export function useClientConfirmedWorkouts(clientId?: string) {
  return useQuery({
    queryKey: ['client-confirmed-workouts', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_confirmed_workouts')
        .select('*')
        .eq('client_id', clientId)
        .order('performed_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientConfirmedWorkout[];
    },
    enabled: !!clientId,
  });
}

// Main hook for gamification stats
export function useClientGamificationStats(clientId?: string) {
  const { data: confirmedWorkouts, isLoading: workoutsLoading } = useClientConfirmedWorkouts(clientId);
  
  // Also fetch training sessions marked as completed by coach
  const { data: coachWorkouts, isLoading: coachLoading } = useQuery({
    queryKey: ['client-coach-workouts', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, date, duration, training_type')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
  
  const isLoading = workoutsLoading || coachLoading;
  
  // Combine all workouts
  const allWorkouts = [
    ...(confirmedWorkouts || []).map(w => ({
      performed_at: w.performed_at,
      xp: w.xp,
      confirmed_by: w.confirmed_by,
    })),
    ...(coachWorkouts || []).map(w => ({
      performed_at: w.date,
      xp: 10, // coach-confirmed = 10 XP
      confirmed_by: 'coach' as const,
    })),
  ].sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
  
  // Calculate stats
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const totalWorkouts = allWorkouts.length;
  const monthlyWorkouts = allWorkouts.filter(w => {
    const date = parseISO(w.performed_at);
    return date >= monthStart && date <= monthEnd;
  }).length;
  
  const monthlyXP = allWorkouts
    .filter(w => {
      const date = parseISO(w.performed_at);
      return date >= monthStart && date <= monthEnd;
    })
    .reduce((sum, w) => sum + w.xp, 0);
  
  const currentStreak = calculateStreak(allWorkouts);
  
  const stats: GamificationStats = {
    totalWorkouts,
    monthlyWorkouts,
    monthlyXP,
    currentStreak,
    bestStreak: currentStreak, // Would need historical tracking for best
  };
  
  return {
    stats,
    allWorkouts,
    isLoading,
  };
}

// Leaderboard settings
export function useLeaderboardSettings(clientId?: string) {
  return useQuery({
    queryKey: ['leaderboard-settings', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('client_leaderboard_settings')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useUpdateLeaderboardSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      clientId, 
      visible, 
      nickname 
    }: { 
      clientId: string; 
      visible: boolean; 
      nickname: string;
    }) => {
      const { data, error } = await supabase
        .from('client_leaderboard_settings')
        .upsert({
          client_id: clientId,
          leaderboard_visible: visible,
          leaderboard_nickname: nickname,
        }, {
          onConflict: 'client_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard-settings', clientId] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

// Confirm workout (client-side)
export function useConfirmWorkout() {
  const queryClient = useQueryClient();
  const { clientId } = useClientPortal();
  
  return useMutation({
    mutationFn: async ({ 
      workoutType, 
      performedAt,
      notes 
    }: { 
      workoutType?: string; 
      performedAt: Date;
      notes?: string;
    }) => {
      if (!clientId) throw new Error('Not authenticated');
      
      const performedDate = format(performedAt, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('client_confirmed_workouts')
        .insert({
          client_id: clientId,
          performed_at: performedAt.toISOString(),
          performed_date: performedDate,
          workout_type: workoutType || null,
          confirmed_by: 'client',
          xp: 6,
          notes: notes || null,
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Dnes už jsi trénink potvrdil/a');
        }
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-confirmed-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['client-badges'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

// Check if workout can be confirmed today
export function useCanConfirmToday(clientId?: string) {
  const { data: workouts } = useClientConfirmedWorkouts(clientId);
  
  if (!workouts) return { canConfirm: true, isLoading: true };
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const confirmedToday = workouts.some(
    w => w.confirmed_by === 'client' && w.performed_date === today
  );
  
  return { 
    canConfirm: !confirmedToday, 
    isLoading: false,
  };
}

// Leaderboard data
export function useLeaderboard(type: 'xp_month' | 'workouts_month' | 'workouts_alltime') {
  return useQuery({
    queryKey: ['leaderboard', type],
    queryFn: async () => {
      // Get all visible clients with their settings
      const { data: settings, error: settingsError } = await supabase
        .from('client_leaderboard_settings')
        .select('client_id, leaderboard_nickname, leaderboard_visible')
        .eq('leaderboard_visible', true);
      
      if (settingsError) throw settingsError;
      
      if (!settings?.length) return [];
      
      const clientIds = settings.map(s => s.client_id);
      
      // Get confirmed workouts for these clients
      const now = new Date();
      const monthStart = startOfMonth(now);
      
      const { data: confirmedWorkouts, error: confirmedError } = await supabase
        .from('client_confirmed_workouts')
        .select('client_id, xp, performed_at')
        .in('client_id', clientIds);
      
      if (confirmedError) throw confirmedError;
      
      // Get training sessions for these clients
      const { data: trainingSessions, error: trainingError } = await supabase
        .from('training_sessions')
        .select('client_id, date')
        .in('client_id', clientIds)
        .eq('status', 'completed');
      
      if (trainingError) throw trainingError;
      
      // Calculate verified status (70%+ coach-confirmed in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Aggregate data per client
      const clientData: Record<string, {
        totalXP: number;
        monthlyXP: number;
        totalWorkouts: number;
        monthlyWorkouts: number;
        coachConfirmedRecent: number;
        totalRecent: number;
      }> = {};
      
      clientIds.forEach(id => {
        clientData[id] = {
          totalXP: 0,
          monthlyXP: 0,
          totalWorkouts: 0,
          monthlyWorkouts: 0,
          coachConfirmedRecent: 0,
          totalRecent: 0,
        };
      });
      
      // Process confirmed workouts
      confirmedWorkouts?.forEach(w => {
        const date = parseISO(w.performed_at);
        clientData[w.client_id].totalXP += w.xp;
        clientData[w.client_id].totalWorkouts++;
        
        if (date >= monthStart) {
          clientData[w.client_id].monthlyXP += w.xp;
          clientData[w.client_id].monthlyWorkouts++;
        }
        
        if (date >= thirtyDaysAgo) {
          clientData[w.client_id].totalRecent++;
        }
      });
      
      // Process training sessions (coach-confirmed)
      trainingSessions?.forEach(t => {
        const date = parseISO(t.date);
        clientData[t.client_id].totalXP += 10;
        clientData[t.client_id].totalWorkouts++;
        
        if (date >= monthStart) {
          clientData[t.client_id].monthlyXP += 10;
          clientData[t.client_id].monthlyWorkouts++;
        }
        
        if (date >= thirtyDaysAgo) {
          clientData[t.client_id].coachConfirmedRecent++;
          clientData[t.client_id].totalRecent++;
        }
      });
      
      // Build leaderboard
      const entries: LeaderboardEntry[] = settings.map(s => {
        const data = clientData[s.client_id];
        const isVerified = data.totalRecent > 0 
          ? (data.coachConfirmedRecent / data.totalRecent) >= 0.7 
          : false;
        
        let sortValue = 0;
        let displayValue = 0;
        
        switch (type) {
          case 'xp_month':
            sortValue = data.monthlyXP;
            displayValue = data.monthlyXP;
            break;
          case 'workouts_month':
            sortValue = data.monthlyWorkouts;
            displayValue = data.monthlyWorkouts;
            break;
          case 'workouts_alltime':
            sortValue = data.totalWorkouts;
            displayValue = data.totalWorkouts;
            break;
        }
        
        return {
          client_id: s.client_id,
          nickname: s.leaderboard_nickname || 'Anonym',
          xp: type === 'xp_month' ? displayValue : data.totalXP,
          workout_count: type.includes('workouts') ? displayValue : data.totalWorkouts,
          is_verified: isVerified,
          rank: 0,
        };
      });
      
      // Sort and assign ranks
      entries.sort((a, b) => {
        const aVal = type === 'xp_month' ? a.xp : a.workout_count;
        const bVal = type === 'xp_month' ? b.xp : b.workout_count;
        return bVal - aVal;
      });
      
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });
      
      return entries.filter(e => 
        type === 'xp_month' ? e.xp > 0 : e.workout_count > 0
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get next badge to earn
export function useNextBadge(clientId?: string) {
  const { data: badges } = useClientBadges(clientId);
  const { data: definitions } = useBadgeDefinitions();
  
  if (!badges || !definitions) return null;
  
  // Find locked badges sorted by progress
  const lockedBadges = badges
    .filter(b => !b.earned_at && b.badge_definitions)
    .map(b => ({
      badge: b,
      definition: b.badge_definitions!,
      progressPercent: (b.progress_current / b.progress_target) * 100,
      remaining: b.progress_target - b.progress_current,
    }))
    .sort((a, b) => b.progressPercent - a.progressPercent);
  
  return lockedBadges[0] || null;
}
