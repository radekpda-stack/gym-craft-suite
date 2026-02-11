import { useMemo } from 'react';
import { useDashboardCore } from './dashboard/useDashboardCore';

export interface ClientScheduleContext {
  creditBalance: number | null;
  paymentMode: string | null;
  lastRpe: number | null;
  hasRecentPain: boolean;
  painLevel: number;
  recentFeedbackNote: string | null;
}

/**
 * Provides per-client context for schedule items using already-cached dashboard core data.
 * No extra queries - piggybacks on useDashboardCore.
 */
export function useScheduleClientContext() {
  const core = useDashboardCore();

  const contextMap = useMemo(() => {
    const map = new Map<string, ClientScheduleContext>();
    if (!core.data) return map;

    const { clients, recentFeedback, weekTrainings } = core.data;

    // Build client credit map
    const clientMap = new Map(clients.map(c => [c.id, c]));

    // Build last RPE per client from week trainings
    const lastRpeByClient = new Map<string, number>();
    // weekTrainings are sorted by date asc, so last entry wins
    weekTrainings.forEach(t => {
      if (t.status === 'completed' && t.rpe != null) {
        lastRpeByClient.set(t.client_id, t.rpe);
      }
    });

    // Build pain/feedback context per client
    const painByClient = new Map<string, { hasPain: boolean; painLevel: number; note: string | null }>();
    recentFeedback.forEach(f => {
      if (!painByClient.has(f.client_id)) {
        const hasPain = (f.pain ?? 0) >= 5 || f.is_red_flag === true;
        const painLevel = f.pain ?? 0;
        let note: string | null = null;
        if (f.is_red_flag) note = 'Red flag ve feedbacku';
        else if (painLevel >= 7) note = `Bolest ${painLevel}/10`;
        else if (painLevel >= 5) note = `Mírná bolest ${painLevel}/10`;
        else if ((f.body_feel ?? 10) <= 4) note = 'Nízká pohoda';
        
        painByClient.set(f.client_id, { hasPain, painLevel, note });
      }
    });

    // Combine for all clients that appear in today/week trainings
    const allClientIds = new Set([
      ...weekTrainings.map(t => t.client_id),
      ...clients.map(c => c.id),
    ]);

    allClientIds.forEach(clientId => {
      const client = clientMap.get(clientId);
      const pain = painByClient.get(clientId);
      
      map.set(clientId, {
        creditBalance: client?.credit_balance ?? null,
        paymentMode: client?.payment_mode ?? null,
        lastRpe: lastRpeByClient.get(clientId) ?? null,
        hasRecentPain: pain?.hasPain ?? false,
        painLevel: pain?.painLevel ?? 0,
        recentFeedbackNote: pain?.note ?? null,
      });
    });

    return map;
  }, [core.data]);

  return { contextMap, isLoading: core.isLoading };
}
