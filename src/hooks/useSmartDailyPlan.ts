import { useMemo } from 'react';
import { useDashboardCore } from './dashboard/useDashboardCore';
import { differenceInDays } from 'date-fns';

export type PlanItemType = 'training-prep' | 'unpaid' | 'low-credit' | 'feedback-missing';

export interface DailyPlanItem {
  id: string;
  type: PlanItemType;
  priority: number; // lower = more important
  clientId?: string;
  clientName: string;
  title: string;
  subtitle: string;
  detail?: string;
  severity: 'info' | 'warning' | 'error';
  actionUrl?: string;
  time?: string;
  meta?: Record<string, unknown>;
}

export function useSmartDailyPlan() {
  const core = useDashboardCore();

  const items = useMemo((): DailyPlanItem[] => {
    if (!core.data) return [];

    const { todayTrainings, recentFeedback, unpaidTrainings, clients, feedbackRequests, budgetMemberIds } = core.data;
    const now = new Date();
    const result: DailyPlanItem[] = [];

    // Build a map of recent feedback by client for quick lookup
    const feedbackByClient = new Map<string, typeof recentFeedback>();
    recentFeedback.forEach(f => {
      const arr = feedbackByClient.get(f.client_id) || [];
      arr.push(f);
      feedbackByClient.set(f.client_id, arr);
    });

    // Client credit map
    const clientMap = new Map(clients.map(c => [c.id, c]));

    // 1. Today's trainings with context - sorted by time
    const scheduledToday = todayTrainings
      .filter(t => t.status !== 'canceled')
      .sort((a, b) => a.date.localeCompare(b.date));

    scheduledToday.forEach((training, idx) => {
      const clientFeedback = feedbackByClient.get(training.client_id) || [];
      const client = clientMap.get(training.client_id);
      const time = new Date(training.date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      
      // Check for red flags in recent feedback
      const redFlags = clientFeedback.filter(f => f.is_red_flag || (f.pain ?? 0) >= 6);
      const lowBodyFeel = clientFeedback.filter(f => (f.body_feel ?? 10) <= 4);
      
      let subtitle = training.status === 'completed' ? '✅ Dokončeno' : `Naplánováno na ${time}`;
      let detail: string | undefined;
      let severity: DailyPlanItem['severity'] = 'info';

      if (redFlags.length > 0) {
        const worstPain = Math.max(...redFlags.map(f => f.pain ?? 0));
        detail = `⚠️ Hlášena bolest (${worstPain}/10) — zeptej se na stav`;
        severity = 'warning';
      } else if (lowBodyFeel.length > 0) {
        detail = '💡 Nízká pohoda — zvaž snížit intenzitu';
        severity = 'warning';
      } else if (training.status === 'scheduled') {
        // Check credit for scheduled training
        const creditBalance = client?.credit_balance ?? 0;
        const paymentMode = client?.payment_mode;
        if (paymentMode !== 'cash_only' && !budgetMemberIds.has(training.client_id) && creditBalance <= 0) {
          detail = `💰 Kredit: ${creditBalance} Kč — připomínat dobití`;
          severity = 'warning';
        }
      }

      result.push({
        id: `prep-${training.id}`,
        type: 'training-prep',
        priority: training.status === 'completed' ? 100 + idx : idx,
        clientId: training.client_id,
        clientName: training.clients?.name || 'Neznámý',
        title: training.clients?.name || 'Neznámý',
        subtitle,
        detail,
        severity,
        actionUrl: `/trainings/${training.id}`,
        time,
      });
    });

    // 2. Unpaid trainings > 7 days
    const oldUnpaid = unpaidTrainings.filter(t => differenceInDays(now, new Date(t.date)) > 7);
    if (oldUnpaid.length > 0) {
      const totalAmount = oldUnpaid.reduce((sum, t) => sum + (t.final_price || 0), 0);
      result.push({
        id: 'unpaid-summary',
        type: 'unpaid',
        priority: 50,
        clientName: `${oldUnpaid.length} tréninků`,
        title: `${oldUnpaid.length} neuhrazených tréninků`,
        subtitle: `Celkem ${new Intl.NumberFormat('cs-CZ').format(totalAmount)} Kč`,
        detail: 'Připomeň platbu klientům',
        severity: 'error',
        actionUrl: '/calendar',
      });
    }

    // 3. Low credit clients (who have training today)
    const todayClientIds = new Set(scheduledToday.map(t => t.client_id));
    const lowCreditToday = clients.filter(c => 
      todayClientIds.has(c.id) && 
      c.payment_mode !== 'cash_only' && 
      !budgetMemberIds.has(c.id) && 
      (c.credit_balance ?? 0) > 0 && 
      (c.credit_balance ?? 0) < 800
    );
    // Already handled inline in training prep, skip standalone

    // 4. Pending feedback (completed trainings without feedback from last 3 days)
    const completedFeedbackIds = new Set(
      feedbackRequests.filter(f => f.status === 'completed').map(f => f.training_session_id)
    );
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const { weekTrainings } = core.data;
    const missingFeedback = weekTrainings.filter(t => {
      const date = new Date(t.date);
      return t.status === 'completed' && 
        date >= threeDaysAgo && date <= now &&
        t.clients?.feedback_enabled !== false &&
        !completedFeedbackIds.has(t.id);
    });

    if (missingFeedback.length > 0) {
      result.push({
        id: 'feedback-missing',
        type: 'feedback-missing',
        priority: 60,
        clientName: `${missingFeedback.length} feedbacků`,
        title: `${missingFeedback.length} chybějících feedbacků`,
        subtitle: 'Pošli klientům odkaz na vyplnění',
        severity: 'info',
        actionUrl: '/feedback',
      });
    }

    // Sort by priority
    result.sort((a, b) => a.priority - b.priority);

    return result;
  }, [core.data]);

  return {
    items,
    isLoading: core.isLoading,
    hasTrainingsToday: items.some(i => i.type === 'training-prep'),
  };
}
