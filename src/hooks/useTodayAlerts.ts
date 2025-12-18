import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export interface TodayAlert {
  id: string;
  type: 'training' | 'feedback' | 'nutrition' | 'credit' | 'unpaid';
  severity: 'success' | 'warning' | 'error' | 'info';
  title: string;
  subtitle?: string;
  clientId?: string;
  clientName?: string;
  actionUrl?: string;
  meta?: Record<string, any>;
}

export interface TodayAlertsData {
  // Today's trainings
  todayTrainings: {
    scheduled: number;
    completed: number;
    items: Array<{
      id: string;
      clientId: string;
      clientName: string;
      time: string;
      status: string;
    }>;
  };
  
  // Missing feedback (trainings without feedback in last 3 days)
  missingFeedback: {
    count: number;
    items: Array<{
      id: string;
      clientId: string;
      clientName: string;
      trainingDate: string;
    }>;
  };
  
  // Active nutrition sessions needing attention
  activeNutrition: {
    count: number;
    items: Array<{
      id: string;
      clientId: string;
      clientName: string;
      daysRemaining: number;
      entriesCount: number;
    }>;
  };
  
  // Low credit clients
  lowCreditClients: {
    count: number;
    items: Array<{
      id: string;
      name: string;
      balance: number;
    }>;
  };
  
  // Unpaid trainings
  unpaidTrainings: {
    count: number;
    totalAmount: number;
    items: Array<{
      id: string;
      clientId: string;
      clientName: string;
      amount: number;
      daysOld: number;
    }>;
  };
  
  // All alerts combined and sorted by severity
  alerts: TodayAlert[];
}

export function useTodayAlerts() {
  return useQuery({
    queryKey: ['today-alerts'],
    queryFn: async (): Promise<TodayAlertsData> => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const threeDaysAgo = subDays(now, 3);
      
      // Parallel fetch all data
      const [
        todayTrainingsResult,
        recentCompletedResult,
        feedbackRequestsResult,
        nutritionSessionsResult,
        clientsResult,
        unpaidResult,
      ] = await Promise.all([
        // Today's trainings with client names
        supabase
          .from('training_sessions')
          .select('id, date, status, client_id, clients(name)')
          .gte('date', todayStart.toISOString())
          .lte('date', todayEnd.toISOString())
          .order('date', { ascending: true }),
        
        // Recent completed trainings (for feedback check)
        supabase
          .from('training_sessions')
          .select('id, date, client_id, clients(name, feedback_enabled)')
          .eq('status', 'completed')
          .gte('date', threeDaysAgo.toISOString())
          .lte('date', now.toISOString()),
        
        // Feedback requests
        supabase
          .from('feedback_requests')
          .select('training_session_id, status')
          .in('status', ['completed', 'pending']),
        
        // Active nutrition sessions
        supabase
          .from('nutrition_log_sessions')
          .select(`
            id, 
            client_id, 
            start_date, 
            end_date, 
            status,
            clients(name)
          `)
          .eq('status', 'active'),
        
        // All clients with credit balance
        supabase
          .from('clients')
          .select('id, name, credit_balance, is_archived')
          .eq('is_archived', false),
        
        // Unpaid trainings
        supabase
          .from('training_sessions')
          .select('id, date, final_price, client_id, clients(name)')
          .eq('status', 'completed')
          .eq('payment_status', 'pending'),
      ]);
      
      // Process today's trainings
      const todayTrainingsData = todayTrainingsResult.data || [];
      const todayTrainings = {
        scheduled: todayTrainingsData.filter((t: any) => t.status === 'scheduled').length,
        completed: todayTrainingsData.filter((t: any) => t.status === 'completed').length,
        items: todayTrainingsData.map((t: any) => ({
          id: t.id,
          clientId: t.client_id,
          clientName: (t.clients as any)?.name || 'Neznámý',
          time: new Date(t.date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
          status: t.status,
        })),
      };
      
      // Process missing feedback
      const completedFeedbackIds = new Set(
        (feedbackRequestsResult.data || [])
          .filter((f: any) => f.status === 'completed')
          .map((f: any) => f.training_session_id)
      );
      
      const eligibleTrainings = (recentCompletedResult.data || [])
        .filter((t: any) => (t.clients as any)?.feedback_enabled !== false);
      
      const missingFeedbackItems = eligibleTrainings
        .filter((t: any) => !completedFeedbackIds.has(t.id))
        .map((t: any) => ({
          id: t.id,
          clientId: t.client_id,
          clientName: (t.clients as any)?.name || 'Neznámý',
          trainingDate: t.date,
        }));
      
      const missingFeedback = {
        count: missingFeedbackItems.length,
        items: missingFeedbackItems,
      };
      
      // Process active nutrition sessions
      const nutritionItems = (nutritionSessionsResult.data || []).map((s: any) => {
        const endDate = new Date(s.end_date);
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          id: s.id,
          clientId: s.client_id,
          clientName: (s.clients as any)?.name || 'Neznámý',
          daysRemaining,
          entriesCount: 0, // Would need separate query
        };
      });
      
      const activeNutrition = {
        count: nutritionItems.length,
        items: nutritionItems,
      };
      
      // Process low credit clients (under 800 CZK)
      const lowCreditItems = (clientsResult.data || [])
        .filter((c: any) => (c.credit_balance || 0) < 800 && (c.credit_balance || 0) >= 0)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          balance: c.credit_balance || 0,
        }))
        .sort((a, b) => a.balance - b.balance);
      
      const lowCreditClients = {
        count: lowCreditItems.length,
        items: lowCreditItems,
      };
      
      // Process unpaid trainings
      const unpaidItems = (unpaidResult.data || []).map((t: any) => {
        const daysOld = Math.ceil((now.getTime() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: t.id,
          clientId: t.client_id,
          clientName: (t.clients as any)?.name || 'Neznámý',
          amount: t.final_price || 0,
          daysOld,
        };
      }).sort((a, b) => b.daysOld - a.daysOld);
      
      const unpaidTrainings = {
        count: unpaidItems.length,
        totalAmount: unpaidItems.reduce((sum, t) => sum + t.amount, 0),
        items: unpaidItems,
      };
      
      // Build alerts array with priority
      const alerts: TodayAlert[] = [];
      
      // High priority: unpaid trainings over 7 days
      unpaidItems
        .filter(t => t.daysOld > 7)
        .slice(0, 3)
        .forEach(t => {
          alerts.push({
            id: `unpaid-${t.id}`,
            type: 'unpaid',
            severity: t.daysOld > 30 ? 'error' : 'warning',
            title: `Nezaplaceno: ${t.clientName}`,
            subtitle: `${t.amount} Kč • ${t.daysOld} dní`,
            clientId: t.clientId,
            clientName: t.clientName,
            actionUrl: `/clients/${t.clientId}`,
          });
        });
      
      // High priority: missing feedback
      missingFeedbackItems.slice(0, 3).forEach(f => {
        alerts.push({
          id: `feedback-${f.id}`,
          type: 'feedback',
          severity: 'warning',
          title: `Chybí feedback: ${f.clientName}`,
          subtitle: new Date(f.trainingDate).toLocaleDateString('cs-CZ'),
          clientId: f.clientId,
          clientName: f.clientName,
          actionUrl: `/trainings/${f.id}`,
        });
      });
      
      // Medium priority: low credit
      lowCreditItems.slice(0, 3).forEach(c => {
        alerts.push({
          id: `credit-${c.id}`,
          type: 'credit',
          severity: c.balance <= 0 ? 'error' : 'warning',
          title: `Nízký kredit: ${c.name}`,
          subtitle: `${c.balance} Kč`,
          clientId: c.id,
          clientName: c.name,
          actionUrl: `/clients/${c.id}`,
        });
      });
      
      // Info: today's upcoming trainings
      todayTrainings.items
        .filter(t => t.status === 'scheduled')
        .slice(0, 3)
        .forEach(t => {
          alerts.push({
            id: `training-${t.id}`,
            type: 'training',
            severity: 'info',
            title: t.clientName,
            subtitle: t.time,
            clientId: t.clientId,
            clientName: t.clientName,
            actionUrl: `/trainings/${t.id}`,
          });
        });
      
      // Sort by severity
      const severityOrder = { error: 0, warning: 1, info: 2, success: 3 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      
      return {
        todayTrainings,
        missingFeedback,
        activeNutrition,
        lowCreditClients,
        unpaidTrainings,
        alerts,
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });
}
