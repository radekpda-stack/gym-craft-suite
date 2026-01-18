import { useMemo } from 'react';
import { differenceInDays, subDays } from 'date-fns';
import { useDashboardCore } from './useDashboardCore';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { PriorityTask } from './types';

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
 * Now uses shared core data to avoid duplicate queries
 */
export function useDashboardTasks() {
  const { data: appSettings } = useAppSettings();
  const core = useDashboardCore();

  const data = useMemo((): TasksData | undefined => {
    if (!core.data) return undefined;

    const now = new Date();
    const threeDaysAgo = subDays(now, 3);
    const lowCreditThreshold = (appSettings?.low_credit_threshold as number) || 800;
    const criticalThreshold = (appSettings?.critical_credit_threshold as number) || 0;

    const { clients, budgetMemberIds, weekTrainings, feedbackRequests, recentFeedback, unpaidTrainings } = core.data;

    const dismissedIds = getDismissedIds();
    const eligibleClients = clients.filter(c => c.payment_mode !== 'cash_only' && !budgetMemberIds.has(c.id));

    const tasks: PriorityTask[] = [];

    // 1. Overload warnings (based on recent feedback + high RPE)
    const feedbackByClient = new Map<string, typeof recentFeedback>();
    recentFeedback.forEach(f => {
      const existing = feedbackByClient.get(f.client_id) || [];
      existing.push(f);
      feedbackByClient.set(f.client_id, existing);
    });

    const highRpeTrainings = weekTrainings.filter(t => 
      t.status === 'completed' && (t.rpe ?? 0) >= 8
    );
    const highRpeByClient = new Map<string, typeof highRpeTrainings>();
    highRpeTrainings.forEach(t => {
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

    // 3. Missing feedback (last 3 days)
    const completedFeedbackIds = new Set(
      feedbackRequests.filter(f => f.status === 'completed').map(f => f.training_session_id)
    );

    const recentCompletedTrainings = weekTrainings.filter(t => {
      const date = new Date(t.date);
      return t.status === 'completed' && date >= threeDaysAgo && date <= now;
    });

    const eligibleTrainings = recentCompletedTrainings.filter(
      t => t.clients?.feedback_enabled !== false
    );

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

    // 4. Unpaid trainings (older than 7 days)
    unpaidTrainings.forEach(t => {
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
  }, [core.data, appSettings?.low_credit_threshold, appSettings?.critical_credit_threshold]);

  return {
    data,
    isLoading: core.isLoading,
    isError: core.isError,
    error: core.error,
    refetch: core.refetch,
  };
}
