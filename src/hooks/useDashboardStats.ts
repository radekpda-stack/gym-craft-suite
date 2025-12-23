import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, subDays } from "date-fns";
import { useDemoMode } from "@/contexts/DemoContext";

export interface DashboardStats {
  totalClients: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  sessionsThisYear: number;
  sessionsAllTime: number;
  averagePerWeek: number;
  averageRating: number;
  canceledSessions: number;
  lateCancellations: number;
}

export function useDashboardStats() {
  const { isDemo, demoDashboardStats } = useDemoMode();
  
  return useQuery({
    queryKey: ["dashboard-stats", isDemo],
    queryFn: async () => {
      // In demo mode, return demo stats
      if (isDemo && demoDashboardStats) {
        return {
          totalClients: demoDashboardStats.totalClients,
          sessionsThisWeek: demoDashboardStats.weeklyTrainings,
          sessionsThisMonth: demoDashboardStats.completedTrainings,
          sessionsThisYear: demoDashboardStats.totalTrainings,
          sessionsAllTime: demoDashboardStats.totalTrainings,
          averagePerWeek: demoDashboardStats.weeklyTrainings,
          averageRating: demoDashboardStats.averageRating,
          canceledSessions: 2,
          lateCancellations: 1,
        } as DashboardStats;
      }
      
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const yearStart = startOfYear(now);
      const thirtyDaysAgo = subDays(now, 30);

      // Fetch all stats in parallel
      const [
        clientsResult,
        weekSessionsResult,
        monthSessionsResult,
        yearSessionsResult,
        allTimeSessionsResult,
        ratingsResult,
        canceledResult,
        lateCanceledResult,
      ] = await Promise.all([
        // Total clients
        supabase.from("clients").select("*", { count: "exact", head: true }),
        
        // Sessions this week
        supabase
          .from("training_sessions")
          .select("*", { count: "exact", head: true })
          .gte("date", weekStart.toISOString())
          .lte("date", weekEnd.toISOString())
          .neq("status", "canceled"),
        
        // Sessions this month
        supabase
          .from("training_sessions")
          .select("*", { count: "exact", head: true })
          .gte("date", monthStart.toISOString())
          .lte("date", monthEnd.toISOString())
          .neq("status", "canceled"),
        
        // Sessions this year
        supabase
          .from("training_sessions")
          .select("*", { count: "exact", head: true })
          .gte("date", yearStart.toISOString())
          .neq("status", "canceled"),
        
        // All time sessions
        supabase
          .from("training_sessions")
          .select("*", { count: "exact", head: true })
          .neq("status", "canceled"),
        
        // Average rating from last 30 days
        supabase
          .from("training_sessions")
          .select("subjective_rating")
          .gte("date", thirtyDaysAgo.toISOString())
          .not("subjective_rating", "is", null),
        
        // Total canceled sessions
        supabase
          .from("training_sessions")
          .select("*", { count: "exact", head: true })
          .eq("status", "canceled"),
        
        // Late cancellations
        supabase
          .from("training_sessions")
          .select("*", { count: "exact", head: true })
          .eq("status", "canceled")
          .eq("is_late_cancellation", true),
      ]);

      // Calculate average rating
      let averageRating = 0;
      if (ratingsResult.data && ratingsResult.data.length > 0) {
        const ratings = ratingsResult.data
          .map((r) => r.subjective_rating)
          .filter((r): r is number => r !== null);
        if (ratings.length > 0) {
          averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        }
      }

      // Calculate average per week (based on year sessions and weeks elapsed)
      const weeksInYear = Math.ceil((now.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) || 1;
      const averagePerWeek = (yearSessionsResult.count || 0) / weeksInYear;

      return {
        totalClients: clientsResult.count || 0,
        sessionsThisWeek: weekSessionsResult.count || 0,
        sessionsThisMonth: monthSessionsResult.count || 0,
        sessionsThisYear: yearSessionsResult.count || 0,
        sessionsAllTime: allTimeSessionsResult.count || 0,
        averagePerWeek,
        averageRating,
        canceledSessions: canceledResult.count || 0,
        lateCancellations: lateCanceledResult.count || 0,
      } as DashboardStats;
    },
  });
}

export function useTodaySessions() {
  return useQuery({
    queryKey: ["today-sessions"],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .gte("date", todayStart.toISOString())
        .lt("date", todayEnd.toISOString())
        .order("date", { ascending: true });

      if (error) throw error;
      
      // Cast the status to proper type
      return (data || []).map(session => ({
        ...session,
        status: session.status as 'scheduled' | 'completed' | 'canceled'
      }));
    },
  });
}
