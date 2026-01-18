/**
 * Core Dashboard Data Hook
 * Single source of truth for shared dashboard data to avoid duplicate queries
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subMonths, startOfYear
} from 'date-fns';

export interface DashboardCoreData {
  // Clients
  clients: {
    id: string;
    name: string;
    credit_balance: number | null;
    payment_mode: string | null;
    is_archived: boolean;
    is_favorite: boolean;
    created_at: string;
    feedback_enabled?: boolean;
  }[];
  budgetMemberIds: Set<string>;
  
  // Training Sessions - different date ranges
  todayTrainings: TrainingSession[];
  weekTrainings: TrainingSession[];
  thisMonthTrainings: TrainingSession[];
  lastMonthTrainings: TrainingSession[];
  
  // Feedback
  feedbackRequests: { training_session_id: string; status: string }[];
  recentFeedback: RecentFeedback[];
  
  // Unpaid
  unpaidTrainings: UnpaidTraining[];
  
  // Date boundaries (for reference)
  dates: {
    todayStart: Date;
    todayEnd: Date;
    weekStart: Date;
    weekEnd: Date;
    lastWeekStart: Date;
    lastWeekEnd: Date;
    monthStart: Date;
    monthEnd: Date;
    lastMonthStart: Date;
    lastMonthEnd: Date;
  };
}

interface TrainingSession {
  id: string;
  date: string;
  status: string;
  client_id: string;
  rpe?: number | null;
  final_price?: number | null;
  payment_status?: string;
  participant_count?: number;
  clients?: { name: string; feedback_enabled?: boolean } | null;
}

interface RecentFeedback {
  id: string;
  client_id: string;
  training_date: string;
  body_feel?: number | null;
  pain?: number | null;
  rpe_rating?: number | null;
  is_red_flag?: boolean;
}

interface UnpaidTraining {
  id: string;
  date: string;
  final_price: number | null;
  client_id: string;
  clients?: { name: string } | null;
}

/**
 * Core dashboard data hook - fetches all shared data in one place
 * Other dashboard hooks can use this as a dependency
 */
export function useDashboardCore() {
  return useQuery({
    queryKey: ['dashboard-core'],
    queryFn: async (): Promise<DashboardCoreData> => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = subDays(weekStart, 7);
      const lastWeekEnd = subDays(weekEnd, 7);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const sevenDaysAgo = subDays(now, 7);

      // Single consolidated query batch - fetches everything needed
      const [
        clientsResult,
        budgetMembersResult,
        weekTrainingsResult,
        monthTrainingsResult,
        feedbackRequestsResult,
        recentFeedbackResult,
        unpaidResult,
      ] = await Promise.all([
        // All active clients with all needed fields
        supabase
          .from('clients')
          .select('id, name, credit_balance, payment_mode, is_archived, is_favorite, created_at, feedback_enabled')
          .eq('is_archived', false),
        
        // Budget members
        supabase
          .from('client_budget_members')
          .select('client_id'),
        
        // Week trainings (includes today + last week for comparison)
        supabase
          .from('training_sessions')
          .select('id, date, status, client_id, rpe, final_price, payment_status, participant_count, clients(name, feedback_enabled)')
          .gte('date', lastWeekStart.toISOString())
          .lte('date', endOfDay(subDays(todayEnd, -6)).toISOString())
          .order('date', { ascending: true }),
        
        // Month trainings (current + last month)
        supabase
          .from('training_sessions')
          .select('id, date, status, client_id, rpe, final_price, payment_status, participant_count, clients(name)')
          .gte('date', lastMonthStart.toISOString())
          .lte('date', monthEnd.toISOString()),
        
        // All feedback requests (completed/pending)
        supabase
          .from('feedback_requests')
          .select('training_session_id, status')
          .in('status', ['completed', 'pending']),
        
        // Recent feedback for health checks
        supabase
          .from('training_feedback')
          .select('id, client_id, training_date, body_feel, pain, rpe_rating, is_red_flag')
          .gte('training_date', sevenDaysAgo.toISOString())
          .order('training_date', { ascending: false }),
        
        // Unpaid trainings
        supabase
          .from('training_sessions')
          .select('id, date, final_price, client_id, clients(name)')
          .eq('status', 'completed')
          .eq('payment_status', 'pending'),
      ]);

      const clients = (clientsResult.data || []) as DashboardCoreData['clients'];
      const budgetMemberIds = new Set(
        ((budgetMembersResult.data || []) as { client_id: string }[]).map(m => m.client_id)
      );

      // All week trainings - filter for different date ranges
      const allWeekTrainings = (weekTrainingsResult.data || []) as TrainingSession[];
      const allMonthTrainings = (monthTrainingsResult.data || []) as TrainingSession[];

      // Filter for today
      const todayTrainings = allWeekTrainings.filter(t => {
        const date = new Date(t.date);
        return date >= todayStart && date <= todayEnd;
      });

      // Filter for current week (from week data)
      const weekTrainings = allWeekTrainings;

      // Filter for this month
      const thisMonthTrainings = allMonthTrainings.filter(t => {
        const date = new Date(t.date);
        return date >= monthStart && date <= monthEnd;
      });

      // Filter for last month
      const lastMonthTrainings = allMonthTrainings.filter(t => {
        const date = new Date(t.date);
        return date >= lastMonthStart && date <= lastMonthEnd;
      });

      return {
        clients,
        budgetMemberIds,
        todayTrainings,
        weekTrainings,
        thisMonthTrainings,
        lastMonthTrainings,
        feedbackRequests: (feedbackRequestsResult.data || []) as DashboardCoreData['feedbackRequests'],
        recentFeedback: (recentFeedbackResult.data || []) as RecentFeedback[],
        unpaidTrainings: (unpaidResult.data || []) as UnpaidTraining[],
        dates: {
          todayStart,
          todayEnd,
          weekStart,
          weekEnd,
          lastWeekStart,
          lastWeekEnd,
          monthStart,
          monthEnd,
          lastMonthStart,
          lastMonthEnd,
        },
      };
    },
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
  });
}
