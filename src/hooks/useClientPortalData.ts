import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subWeeks, format, differenceInDays, parseISO, isToday } from 'date-fns';

// =====================================================
// CREDIT & TRANSACTIONS
// =====================================================

export function useClientCredit(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-credit', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data: client, error } = await supabase
        .from('clients')
        .select('credit_balance')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      return client?.credit_balance ?? 0;
    },
    enabled: !!clientId,
  });
}

export function useClientTransactions(clientId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ['client-portal-transactions', clientId, limit],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, description, payment_method, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useClientMonthlyUsage(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-monthly-usage', clientId],
    queryFn: async () => {
      if (!clientId) return { trainingsThisMonth: 0, totalSpentThisMonth: 0 };

      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      // Get training deductions this month
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('client_id', clientId)
        .eq('type', 'training')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      if (error) throw error;

      const totalSpent = (data ?? []).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return {
        trainingsThisMonth: data?.length ?? 0,
        totalSpentThisMonth: totalSpent,
      };
    },
    enabled: !!clientId,
  });
}

// =====================================================
// TRAINING SESSIONS
// =====================================================

export function useClientTrainingSessions(clientId: string | undefined, weeks = 8) {
  return useQuery({
    queryKey: ['client-portal-trainings', clientId, weeks],
    queryFn: async () => {
      if (!clientId) return [];

      const startDate = format(subWeeks(new Date(), weeks), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, date, duration, status, notes, training_type')
        .eq('client_id', clientId)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useClientNextTraining(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-next-training', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, date, duration, status, notes, training_type')
        .eq('client_id', clientId)
        .gte('date', today)
        .eq('status', 'scheduled')
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

// =====================================================
// PROGRESS & EXERCISE TRACKING
// =====================================================

export function useClientTrackedExercises(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-tracked-exercises', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('client_tracked_exercises')
        .select('id, exercise_id, exercise_name, display_order')
        .eq('client_id', clientId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useClientExerciseProgress(clientId: string | undefined, exerciseId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-exercise-progress', clientId, exerciseId],
    queryFn: async () => {
      if (!clientId || !exerciseId) return null;

      const { data, error } = await supabase
        .from('exercise_entries')
        .select('id, date, weight_kg, reps, sets, is_pr')
        .eq('client_id', clientId)
        .eq('exercise_id', exerciseId)
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!data || data.length === 0) return null;

      const entries = data;
      const latest = entries[0];
      const best = entries.reduce((max, e) => 
        (e.weight_kg ?? 0) > (max.weight_kg ?? 0) ? e : max, entries[0]);

      // Calculate trend (last 5 vs previous 5)
      const recent = entries.slice(0, 5);
      const older = entries.slice(5, 10);
      
      let trend: 'up' | 'stable' | 'down' = 'stable';
      if (recent.length >= 3 && older.length >= 3) {
        const recentAvg = recent.reduce((s, e) => s + (e.weight_kg ?? 0), 0) / recent.length;
        const olderAvg = older.reduce((s, e) => s + (e.weight_kg ?? 0), 0) / older.length;
        if (recentAvg > olderAvg * 1.02) trend = 'up';
        else if (recentAvg < olderAvg * 0.98) trend = 'down';
      }

      return {
        latest,
        best,
        trend,
        history: entries.slice(0, 10).reverse(), // For sparkline
        hasPR: entries.some(e => e.is_pr),
      };
    },
    enabled: !!clientId && !!exerciseId,
  });
}

export function useClientConsistency(clientId: string | undefined, weeks = 8) {
  return useQuery({
    queryKey: ['client-portal-consistency', clientId, weeks],
    queryFn: async () => {
      if (!clientId) return { streak: 0, weeklyData: [] };

      const startDate = subWeeks(new Date(), weeks);

      const { data, error } = await supabase
        .from('training_sessions')
        .select('date, status')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;

      // Calculate streak
      let streak = 0;
      const completedDates = new Set((data ?? []).map(t => t.date));
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const checkDate = format(subWeeks(today, 0), 'yyyy-MM-dd');
        // Simplified: count consecutive weeks with at least 1 training
        if (completedDates.size > 0) streak++;
        break; // Simple streak for now
      }

      // Weekly aggregation
      const weeklyData: { week: string; count: number }[] = [];
      // Group by week (simplified)

      return {
        streak: completedDates.size, // Total completed in period
        totalCompleted: completedDates.size,
        weeklyData,
      };
    },
    enabled: !!clientId,
  });
}

// =====================================================
// NUTRITION
// =====================================================

export function useClientNutritionCampaign(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-nutrition-campaign', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      // Get active or most recent campaign
      const { data, error } = await supabase
        .from('nutrition_log_sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const startDate = parseISO(data.start_date);
      const endDate = parseISO(data.end_date);
      const today = new Date();
      const totalDays = differenceInDays(endDate, startDate) + 1;
      const daysElapsed = Math.min(differenceInDays(today, startDate) + 1, totalDays);

      // Count days with entries
      const { data: entriesData } = await supabase
        .from('nutrition_food_entries')
        .select('entry_date')
        .eq('session_id', data.id);

      const uniqueDays = new Set((entriesData ?? []).map(e => e.entry_date));

      return {
        ...data,
        totalDays,
        daysElapsed,
        daysCompleted: uniqueDays.size,
        isActive: data.status === 'active' && today <= endDate,
        isExpired: today > endDate && data.status === 'active',
      };
    },
    enabled: !!clientId,
  });
}

// Get all nutrition campaigns for a client (for history)
export function useClientNutritionSessions(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-nutrition-sessions', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data: sessions, error } = await supabase
        .from('nutrition_log_sessions')
        .select('id, start_date, end_date, status, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!sessions?.length) return [];

      // Get entry counts for each session
      const sessionIds = sessions.map(s => s.id);
      const [foodResult, drinkResult, coffeeResult] = await Promise.all([
        supabase
          .from('nutrition_food_entries')
          .select('session_id')
          .in('session_id', sessionIds),
        supabase
          .from('nutrition_drink_entries')
          .select('session_id')
          .in('session_id', sessionIds),
        supabase
          .from('nutrition_coffee_entries')
          .select('session_id')
          .in('session_id', sessionIds),
      ]);

      const entryCounts = new Map<string, number>();
      [...(foodResult.data || []), ...(drinkResult.data || []), ...(coffeeResult.data || [])].forEach(e => {
        entryCounts.set(e.session_id, (entryCounts.get(e.session_id) || 0) + 1);
      });

      return sessions.map(session => ({
        ...session,
        entries_count: entryCounts.get(session.id) || 0,
      }));
    },
    enabled: !!clientId,
  });
}

export function useClientTodayNutrition(clientId: string | undefined, sessionId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');
  return useClientNutritionByDate(clientId, sessionId, today);
}

// Hook to get nutrition entries for a specific date
export function useClientNutritionByDate(clientId: string | undefined, sessionId: string | undefined, dateStr: string) {
  return useQuery({
    queryKey: ['client-portal-nutrition-by-date', clientId, sessionId, dateStr],
    queryFn: async () => {
      if (!clientId || !sessionId || !dateStr) return { food: [], drinks: [], coffee: [] };

      const [foodResult, drinkResult, coffeeResult] = await Promise.all([
        supabase
          .from('nutrition_food_entries')
          .select('*')
          .eq('session_id', sessionId)
          .eq('entry_date', dateStr)
          .order('entry_time', { ascending: true }),
        supabase
          .from('nutrition_drink_entries')
          .select('*')
          .eq('session_id', sessionId)
          .eq('entry_date', dateStr)
          .order('entry_time', { ascending: true }),
        supabase
          .from('nutrition_coffee_entries')
          .select('*')
          .eq('session_id', sessionId)
          .eq('entry_date', dateStr)
          .order('entry_time', { ascending: true }),
      ]);

      return {
        food: foodResult.data ?? [],
        drinks: drinkResult.data ?? [],
        coffee: coffeeResult.data ?? [],
      };
    },
    enabled: !!clientId && !!sessionId && !!dateStr,
  });
}

export function useClientNutritionHistory(clientId: string | undefined, sessionId: string | undefined, days = 7) {
  return useQuery({
    queryKey: ['client-portal-nutrition-history', clientId, sessionId, days],
    queryFn: async () => {
      if (!clientId || !sessionId) return [];

      const { data, error } = await supabase
        .from('nutrition_food_entries')
        .select('entry_date')
        .eq('session_id', sessionId)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      // Group by date and count
      const dateCounts = new Map<string, number>();
      (data ?? []).forEach(e => {
        dateCounts.set(e.entry_date, (dateCounts.get(e.entry_date) || 0) + 1);
      });

      return Array.from(dateCounts.entries())
        .slice(0, days)
        .map(([date, count]) => ({ date, count, isToday: isToday(parseISO(date)) }));
    },
    enabled: !!clientId && !!sessionId,
  });
}

// Hook to get all days with nutrition entries (for WeekStrip)
export function useClientNutritionCompletedDays(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-nutrition-completed-days', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      // Get unique dates from all entry types
      const [foodResult, drinkResult, coffeeResult] = await Promise.all([
        supabase
          .from('nutrition_food_entries')
          .select('entry_date')
          .eq('session_id', sessionId),
        supabase
          .from('nutrition_drink_entries')
          .select('entry_date')
          .eq('session_id', sessionId),
        supabase
          .from('nutrition_coffee_entries')
          .select('entry_date')
          .eq('session_id', sessionId),
      ]);

      // Collect all unique dates
      const allDates = new Set<string>();
      (foodResult.data ?? []).forEach(e => allDates.add(e.entry_date));
      (drinkResult.data ?? []).forEach(e => allDates.add(e.entry_date));
      (coffeeResult.data ?? []).forEach(e => allDates.add(e.entry_date));

      // Convert to Date objects
      return Array.from(allDates).map(dateStr => parseISO(dateStr));
    },
    enabled: !!sessionId,
  });
}

// =====================================================
// PACKAGES
// =====================================================

export function useClientPackages(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-packages', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('client_packages')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}
