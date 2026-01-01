import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, differenceInDays } from 'date-fns';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { 
  PriorityTask, 
  ClientRow, 
  BudgetMemberRow, 
  FeedbackRequestRow, 
  TrainingFeedbackRow, 
  TrainingSessionRow, 
  UnpaidTrainingRow 
} from './types';

const DISMISSED_KEY = 'dashboard_dismissed_v2';

function getDismissedIds(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored) {
      const { ids, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return new Set(ids);
      }
    }
  } catch {}
  return new Set();
}

export function dismissTask(id: string) {
  const dismissed = getDismissedIds();
  dismissed.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify({
    ids: Array.from(dismissed),
    timestamp: Date.now(),
  }));
}

interface TasksData {
  priorityTasks: PriorityTask[];
  totalTasksCount: number;
}

/**
 * Hook for fetching priority tasks (alerts and warnings)
 */
export function useDashboardTasks() {
  const { data: appSettings } = useAppSettings();

  return useQuery({
    queryKey: ['dashboard-tasks', appSettings?.low_credit_threshold],
    queryFn: async (): Promise<TasksData> => {
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      const threeDaysAgo = subDays(now, 3);
      const lowCreditThreshold = (appSettings?.low_credit_threshold as number) || 800;
      const criticalThreshold = (appSettings?.critical_credit_threshold as number) || 0;

      const [
        clientsResult,
        budgetMembersResult,
        recentCompletedResult,
        feedbackRequestsResult,
        recentFeedbackResult,
        recentHighRpeResult,
        unpaidResult,
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, credit_balance, payment_mode, is_archived, is_favorite, created_at')
          .eq('is_archived', false),
        supabase
          .from('client_budget_members')
          .select('client_id'),
        supabase
          .from('training_sessions')
          .select('id, date, client_id, clients(name, feedback_enabled)')
          .eq('status', 'completed')
          .gte('date', threeDaysAgo.toISOString())
          .lte('date', now.toISOString()),
        supabase
          .from('feedback_requests')
          .select('training_session_id, status')
          .in('status', ['completed', 'pending']),
        supabase
          .from('training_feedback')
          .select('id, client_id, training_date, body_feel, pain, rpe_rating, is_red_flag')
          .gte('training_date', sevenDaysAgo.toISOString())
          .order('training_date', { ascending: false }),
        supabase
          .from('training_sessions')
          .select('id, date, client_id, rpe, clients(name)')
          .eq('status', 'completed')
          .gte('date', sevenDaysAgo.toISOString())
          .gte('rpe', 8),
        supabase
          .from('training_sessions')
          .select('id, date, final_price, client_id, clients(name)')
          .eq('status', 'completed')
          .eq('payment_status', 'pending'),
      ]);

      const dismissedIds = getDismissedIds();
      const budgetMemberIds = new Set((budgetMembersResult.data as BudgetMemberRow[] || []).map(m => m.client_id));
      const eligibleClients = ((clientsResult.data || []) as ClientRow[])
        .filter(c => c.payment_mode !== 'cash_only' && !budgetMemberIds.has(c.id));

      const tasks: PriorityTask[] = [];

      // 1. Overload warnings
      const feedbackByClient = new Map<string, TrainingFeedbackRow[]>();
      ((recentFeedbackResult.data || []) as TrainingFeedbackRow[]).forEach(f => {
        const existing = feedbackByClient.get(f.client_id) || [];
        existing.push(f);
        feedbackByClient.set(f.client_id, existing);
      });

      const highRpeByClient = new Map<string, TrainingSessionRow[]>();
      ((recentHighRpeResult.data || []) as TrainingSessionRow[]).forEach(t => {
        const existing = highRpeByClient.get(t.client_id) || [];
        existing.push(t);
        highRpeByClient.set(t.client_id, existing);
      });

      highRpeByClient.forEach((trainings, clientId) => {
        const clientFeedback = feedbackByClient.get(clientId) || [];
        const badFeedback = clientFeedback.filter(f =>
          ((f.pain ?? 0) >= 6) || ((f.body_feel ?? 10) <= 4) || f.is_red_flag
        );

        if (badFeedback.length >= 2 || (trainings.length >= 2 && badFeedback.length >= 1)) {
          const id = `overload-${clientId}`;
          if (!dismissedIds.has(id)) {
            const clientName = trainings[0]?.clients?.name || 'Neznámý';
            tasks.push({
              id,
              type: 'overload',
              severity: 'error',
              clientId,
              clientName,
              title: clientName,
              subtitle: 'Přetížení',
              detail: 'Vysoké RPE + špatný feedback',
              actionUrl: `/clients/${clientId}`,
              actionLabel: 'Otevřít klienta',
            });
          }
        }
      });

      // 2. Credit warnings
      eligibleClients.forEach(client => {
        const balance = client.credit_balance || 0;
        if (balance <= criticalThreshold) {
          const id = `credit-${client.id}`;
          if (!dismissedIds.has(id)) {
            tasks.push({
              id,
              type: 'credit',
              severity: 'error',
              clientId: client.id,
              clientName: client.name,
              title: client.name,
              subtitle: 'Bez kreditu',
              detail: `${balance} Kč`,
              actionUrl: `/clients/${client.id}`,
              actionLabel: 'Přidat kredit',
              meta: { balance },
            });
          }
        } else if (balance < lowCreditThreshold) {
          const id = `credit-${client.id}`;
          if (!dismissedIds.has(id)) {
            tasks.push({
              id,
              type: 'credit',
              severity: 'warning',
              clientId: client.id,
              clientName: client.name,
              title: client.name,
              subtitle: 'Nízký kredit',
              detail: `${balance} Kč`,
              actionUrl: `/clients/${client.id}`,
              actionLabel: 'Přidat kredit',
              meta: { balance },
            });
          }
        }
      });

      // 3. Missing feedback
      const completedFeedbackIds = new Set(
        ((feedbackRequestsResult.data || []) as FeedbackRequestRow[])
          .filter(f => f.status === 'completed')
          .map(f => f.training_session_id)
      );

      const eligibleTrainings = ((recentCompletedResult.data || []) as TrainingSessionRow[])
        .filter(t => t.clients?.feedback_enabled !== false);

      eligibleTrainings
        .filter(t => !completedFeedbackIds.has(t.id))
        .forEach(t => {
          const id = `feedback-${t.id}`;
          if (!dismissedIds.has(id)) {
            tasks.push({
              id,
              type: 'feedback',
              severity: 'warning',
              clientId: t.client_id,
              clientName: t.clients?.name || 'Neznámý',
              title: t.clients?.name || 'Neznámý',
              subtitle: 'Chybí feedback',
              detail: new Date(t.date).toLocaleDateString('cs-CZ'),
              actionUrl: `/trainings/${t.id}`,
              actionLabel: 'Poslat odkaz',
            });
          }
        });

      // 4. Unpaid trainings
      ((unpaidResult.data || []) as UnpaidTrainingRow[]).forEach(t => {
        const daysOld = differenceInDays(now, new Date(t.date));
        if (daysOld > 7) {
          const id = `unpaid-${t.id}`;
          if (!dismissedIds.has(id)) {
            tasks.push({
              id,
              type: 'unpaid',
              severity: daysOld > 30 ? 'error' : 'warning',
              clientId: t.client_id,
              clientName: t.clients?.name || 'Neznámý',
              title: t.clients?.name || 'Neznámý',
              subtitle: 'Nezaplaceno',
              detail: `${t.final_price || 0} Kč • ${daysOld} dní`,
              actionUrl: `/clients/${t.client_id}`,
              actionLabel: 'Vyúčtování',
              meta: { amount: t.final_price, daysOld },
            });
          }
        }
      });

      // Sort by severity and type priority
      const typePriority: Record<string, number> = { overload: 0, credit: 1, unpaid: 2, feedback: 3 };
      tasks.sort((a, b) => {
        if (a.severity !== b.severity) {
          return a.severity === 'error' ? -1 : 1;
        }
        return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
      });

      return {
        priorityTasks: tasks.slice(0, 5),
        totalTasksCount: tasks.length,
      };
    },
    staleTime: 30000,
  });
}
