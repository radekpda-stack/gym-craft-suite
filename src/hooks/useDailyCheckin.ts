import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { format, subDays, isYesterday, isToday, parseISO } from 'date-fns';

export interface LoginStreak {
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  total_checkins: number;
}

export interface CheckinResult {
  success: boolean;
  message?: string;
  current_streak?: number;
  xp_awarded?: number;
  bonus_xp?: number;
  is_milestone?: boolean;
  already_checked_in?: boolean;
}

export function useLoginStreak(clientId?: string) {
  return useQuery({
    queryKey: ['login-streak', clientId],
    queryFn: async (): Promise<LoginStreak | null> => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('client_login_streaks')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useTodayCheckin(clientId?: string) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['today-checkin', clientId, today],
    queryFn: async (): Promise<boolean> => {
      if (!clientId) return false;
      
      const { data, error } = await supabase
        .from('client_daily_checkins')
        .select('id')
        .eq('client_id', clientId)
        .eq('checkin_date', today)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRecentCheckins(clientId?: string, days: number = 7) {
  return useQuery({
    queryKey: ['recent-checkins', clientId, days],
    queryFn: async () => {
      if (!clientId) return [];
      
      const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('client_daily_checkins')
        .select('checkin_date')
        .eq('client_id', clientId)
        .gte('checkin_date', startDate)
        .order('checkin_date', { ascending: false });
      
      if (error) throw error;
      return data?.map(d => d.checkin_date) ?? [];
    },
    enabled: !!clientId,
  });
}

export function useDailyCheckin() {
  const queryClient = useQueryClient();
  const { clientId } = useClientPortal();
  
  return useMutation({
    mutationFn: async (): Promise<CheckinResult> => {
      if (!clientId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .rpc('handle_daily_checkin', { p_client_id: clientId });
      
      if (error) throw error;
      return data as unknown as CheckinResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['login-streak'] });
      queryClient.invalidateQueries({ queryKey: ['today-checkin'] });
      queryClient.invalidateQueries({ queryKey: ['recent-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['client-xp-level'] });
    },
  });
}

export function useMyLoginStreak() {
  const { clientId } = useClientPortal();
  const { data: streak, isLoading: streakLoading } = useLoginStreak(clientId ?? undefined);
  const { data: checkedInToday, isLoading: todayLoading } = useTodayCheckin(clientId ?? undefined);
  const { data: recentCheckins, isLoading: recentsLoading } = useRecentCheckins(clientId ?? undefined, 7);
  
  return {
    streak,
    checkedInToday: checkedInToday ?? false,
    recentCheckins: recentCheckins ?? [],
    isLoading: streakLoading || todayLoading || recentsLoading,
  };
}

// Get streak status for display
export function getStreakStatus(streak: LoginStreak | null, checkedInToday: boolean): {
  canCheckin: boolean;
  streakAtRisk: boolean;
  streakBroken: boolean;
} {
  if (!streak) {
    return { canCheckin: true, streakAtRisk: false, streakBroken: false };
  }
  
  const lastCheckin = streak.last_checkin_date ? parseISO(streak.last_checkin_date) : null;
  
  if (checkedInToday) {
    return { canCheckin: false, streakAtRisk: false, streakBroken: false };
  }
  
  if (!lastCheckin) {
    return { canCheckin: true, streakAtRisk: false, streakBroken: false };
  }
  
  if (isToday(lastCheckin)) {
    return { canCheckin: false, streakAtRisk: false, streakBroken: false };
  }
  
  if (isYesterday(lastCheckin)) {
    return { canCheckin: true, streakAtRisk: true, streakBroken: false };
  }
  
  // More than 1 day ago - streak is broken
  return { canCheckin: true, streakAtRisk: false, streakBroken: true };
}
